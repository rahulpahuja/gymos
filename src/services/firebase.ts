import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { UserAccount, UserRole, UserApprovalStatus } from '../types';
import { storageService } from './storageService';

// Firebase client web config — sourced from Vite env vars (see .env.example).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Optional named Firestore database; empty falls back to the default database.
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '';

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    '[Firebase] Missing VITE_FIREBASE_* environment variables. ' +
      'Copy .env.example to .env.local and fill in your Firebase web config.'
  );
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth & Providers
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firestore (named database when provided, otherwise the default database)
export const db = getFirestore(app, firestoreDatabaseId !== '' ? firestoreDatabaseId : '(default)');

// Connection test on boot
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Firestore connected successfully');
  } catch (error: any) {
    if (error?.message && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is currently offline, cached operations available');
    }
  }
}
testFirestoreConnection();

// Initial Super Admin emails (auto-approved as admin on first sign-in)
const SUPER_ADMIN_EMAILS = ['rahulpahuja2015@gmail.com', 'therahulpahuja@gmail.com'];

// Pre-authorizations are keyed by lowercased email (the real UID doesn't exist
// yet), and consumed — deleted — the moment that email actually signs in.
const PREAUTH_COLLECTION = 'preauthorized_staff';

export const firebaseAuthService = {
  // Sign In With Google
  async signInWithGoogle(requestedRole: UserRole = 'manager', requestedBranchId: string = 'branch-1'): Promise<UserAccount> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      return await this.syncOrCreateUserProfile(user, requestedRole, requestedBranchId);
    } catch (error: any) {
      console.error('[Firebase Auth] Sign In Error:', error);
      throw error;
    }
  },

  // Sign Out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('[Firebase Auth] Sign Out Error:', error);
      throw error;
    }
  },

  // Fetch current user account from Firestore
  async getCurrentUserAccount(): Promise<UserAccount | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserAccount;
      }
    } catch (e) {
      console.warn('[Firebase] Error fetching current user account:', e);
    }
    return null;
  },

  // Sync or Create User Profile
  async syncOrCreateUserProfile(
    user: FirebaseUser,
    requestedRole: UserRole = 'manager',
    requestedBranchId: string = 'branch-1'
  ): Promise<UserAccount> {
    const userRef = doc(db, 'users', user.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (e) {
      console.warn('[Firebase] Could not fetch remote user, checking auth info', e);
    }

    const email = (user.email || '').toLowerCase();
    const isOwner = SUPER_ADMIN_EMAILS.includes(email);

    // Was this email pre-authorized by an admin/manager before they ever signed in?
    let preAuth: { role: UserRole; branchId: string; approvedBy?: string } | null = null;
    if (!userSnap?.exists() && !isOwner) {
      try {
        const preAuthRef = doc(db, PREAUTH_COLLECTION, email);
        const preAuthSnap = await getDoc(preAuthRef);
        if (preAuthSnap.exists()) {
          preAuth = preAuthSnap.data() as { role: UserRole; branchId: string; approvedBy?: string };
          await deleteDoc(preAuthRef); // consume it — one-time use
        }
      } catch (e) {
        console.warn('[Firebase] Pre-authorization lookup failed, continuing as normal sign-up:', e);
      }
    }

    if (userSnap && userSnap.exists()) {
      const existing = userSnap.data() as UserAccount;
      // If super admin email, enforce approved admin
      if (isOwner && (existing.role !== 'admin' || existing.status !== 'approved')) {
        const updated: UserAccount = {
          ...existing,
          role: 'admin',
          status: 'approved',
          branchId: 'all',
          lastLoginAt: new Date().toISOString(),
        };
        await updateDoc(userRef, {
          role: 'admin',
          status: 'approved',
          branchId: 'all',
          lastLoginAt: updated.lastLoginAt,
        });
        return updated;
      }

      await updateDoc(userRef, {
        lastLoginAt: new Date().toISOString(),
        photoURL: user.photoURL || existing.photoURL || '',
      });
      return {
        ...existing,
        lastLoginAt: new Date().toISOString(),
      };
    }

    // New User Profile
    const status: UserApprovalStatus = isOwner || preAuth ? 'approved' : 'pending';
    const role: UserRole = isOwner ? 'admin' : preAuth?.role || requestedRole;
    const branchId = isOwner ? 'all' : preAuth?.branchId || requestedBranchId;

    const newAccount: UserAccount = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Gym Staff',
      photoURL: user.photoURL || '',
      role,
      branchId,
      status,
      requestedRole,
      requestedBranchId,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    if (isOwner) {
      newAccount.approvedBy = 'System (Owner)';
      newAccount.approvedAt = new Date().toISOString();
    } else if (preAuth) {
      newAccount.approvedBy = preAuth.approvedBy || 'Pre-authorized';
      newAccount.approvedAt = new Date().toISOString();
    }

    await setDoc(userRef, newAccount);
    return newAccount;
  },

  // Listen to Auth state and profile in real-time
  onAuthState(callback: (user: UserAccount | null, loading: boolean) => void): Unsubscribe {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null, false);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribeUserDoc = onSnapshot(
        userRef,
        async (snap) => {
          if (snap.exists()) {
            callback(snap.data() as UserAccount, false);
            return;
          }
          // No profile doc: either it hasn't been written yet (brand-new
          // sign-in), an admin removed it (access revoked), or this email was
          // pre-authorized before ever signing in — check that regardless of
          // which sign-in path got us here (fresh button click vs. an
          // already-persisted session just reconnecting).
          const email = (firebaseUser.email || '').toLowerCase();
          const isOwner = SUPER_ADMIN_EMAILS.includes(email);

          if (!isOwner) {
            try {
              const preAuthRef = doc(db, PREAUTH_COLLECTION, email);
              const preAuthSnap = await getDoc(preAuthRef);
              if (preAuthSnap.exists()) {
                const preAuth = preAuthSnap.data() as { role: UserRole; branchId: string; approvedBy?: string };
                const approvedAccount: UserAccount = {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || 'Staff Member',
                  photoURL: firebaseUser.photoURL || '',
                  role: preAuth.role,
                  branchId: preAuth.branchId,
                  status: 'approved',
                  approvedBy: preAuth.approvedBy || 'Pre-authorized',
                  approvedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                };
                await setDoc(userRef, approvedAccount);
                await deleteDoc(preAuthRef); // consume it — one-time use
                callback(approvedAccount, false);
                return;
              }
            } catch (e) {
              console.warn('[Firebase Auth] Pre-authorization check failed, falling back to normal flow:', e);
            }
          }

          const meta = firebaseUser.metadata;
          const brandNew =
            !meta?.creationTime ||
            !meta?.lastSignInTime ||
            Math.abs(
              new Date(meta.lastSignInTime).getTime() - new Date(meta.creationTime).getTime()
            ) < 15000;
          const revoked = !isOwner && !brandNew;
          callback(
            {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Staff Member',
              photoURL: firebaseUser.photoURL || '',
              role: isOwner ? 'admin' : 'manager',
              branchId: isOwner ? 'all' : 'branch-1',
              status: isOwner ? 'approved' : revoked ? 'rejected' : 'pending',
              rejectionReason: revoked
                ? 'Your access has been removed by an administrator.'
                : undefined,
              createdAt: new Date().toISOString(),
            },
            false
          );
        },
        (error) => {
          console.warn('[Firebase Auth] User doc subscription error, using token profile:', error);
          const email = (firebaseUser.email || '').toLowerCase();
          const isOwner = SUPER_ADMIN_EMAILS.includes(email);
          callback(
            {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Staff Member',
              photoURL: firebaseUser.photoURL || '',
              role: isOwner ? 'admin' : 'manager',
              branchId: isOwner ? 'all' : 'branch-1',
              status: isOwner ? 'approved' : 'pending',
              createdAt: new Date().toISOString(),
            },
            false
          );
        }
      );

      return () => unsubscribeUserDoc();
    });
  },

  // Get all users with real-time subscription
  subscribeAllUsers(callback: (users: UserAccount[]) => void): Unsubscribe {
    // If not authenticated with Firebase, provide local mock accounts without failing
    if (!auth.currentUser) {
      const fallbackAccounts: UserAccount[] = [
        {
          id: 'demo-admin-1',
          email: 'rahulpahuja2015@gmail.com',
          displayName: 'Rahul Pahuja (Super Admin)',
          role: 'admin',
          branchId: 'all',
          status: 'approved',
          approvedBy: 'System',
          approvedAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'demo-manager-1',
          email: 'vikram.singh@gymos.in',
          displayName: 'Vikram Singh',
          role: 'manager',
          branchId: 'branch-1',
          status: 'approved',
          approvedBy: 'Rahul Pahuja',
          approvedAt: '2025-01-05T00:00:00.000Z',
          createdAt: '2025-01-02T00:00:00.000Z',
        },
      ];
      callback(fallbackAccounts);
      return () => {};
    }

    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        const users: UserAccount[] = [];
        snapshot.forEach((doc) => {
          users.push(doc.data() as UserAccount);
        });
        callback(users);
      },
      (error) => {
        console.warn('[Firebase] Notice fetching users (permissions may be pending approval):', error.message);
      }
    );
  },

  // Approve a pending user (optionally linking a trainer/trainee operational record)
  // Pre-authorizes an email that hasn't signed in yet: the moment that Google
  // account first signs in, syncOrCreateUserProfile finds and consumes this,
  // creating their real profile as already-approved instead of pending.
  async preAuthorizeStaff(email: string, role: UserRole, branchId: string, approverName: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    await setDoc(doc(db, PREAUTH_COLLECTION, normalizedEmail), {
      role,
      branchId,
      approvedBy: approverName,
      createdAt: new Date().toISOString(),
    });
    storageService.logAudit(
      'Staff Pre-Authorized',
      'UserAccount',
      normalizedEmail,
      branchId,
      `Pre-authorized ${normalizedEmail} as ${role} — will be auto-approved on next sign-in`
    );
  },

  async approveUser(
    userId: string,
    role: UserRole,
    branchId: string,
    approverName: string,
    links?: { linkedTrainerId?: string; linkedTraineeId?: string },
    targetLabel?: string
  ): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'approved',
      role,
      branchId,
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
      linkedTrainerId: role === 'trainer' ? links?.linkedTrainerId || '' : '',
      linkedTraineeId: role === 'trainee' ? links?.linkedTraineeId || '' : '',
    });
    storageService.logAudit(
      'User Approved',
      'UserAccount',
      userId,
      branchId,
      `Approved ${targetLabel || userId} as ${role}`
    );
  },

  // Reject a user
  async rejectUser(userId: string, reason: string, approverName: string, targetLabel?: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'rejected',
      rejectionReason: reason || 'Access denied by branch administrator.',
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
    });
    storageService.logAudit(
      'User Rejected',
      'UserAccount',
      userId,
      'all',
      `Rejected ${targetLabel || userId}${reason ? ` — ${reason}` : ''}`
    );
  },

  // Update role, branch, and portal record linkage of an approved user
  async updateUserAccess(
    userId: string,
    role: UserRole,
    branchId: string,
    links?: { linkedTrainerId?: string; linkedTraineeId?: string },
    targetLabel?: string
  ): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role,
      branchId,
      linkedTrainerId: role === 'trainer' ? links?.linkedTrainerId || '' : '',
      linkedTraineeId: role === 'trainee' ? links?.linkedTraineeId || '' : '',
    });
    storageService.logAudit(
      'User Access Updated',
      'UserAccount',
      userId,
      branchId,
      `Updated ${targetLabel || userId} to role ${role}, branch ${branchId}`
    );
  },

  // Revoke access (soft): keeps the profile so a re-login stays locked out
  async revokeUser(userId: string, approverName: string, targetLabel?: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'rejected',
      rejectionReason: 'Your access has been revoked by an administrator.',
      linkedTrainerId: '',
      linkedTraineeId: '',
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
    });
    storageService.logAudit('User Access Revoked', 'UserAccount', userId, 'all', `Revoked access for ${targetLabel || userId}`);
  },

  // Permanently delete the user profile document
  async deleteUser(userId: string, targetLabel?: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    storageService.logAudit('User Deleted', 'UserAccount', userId, 'all', `Permanently deleted profile for ${targetLabel || userId}`);
  },

  // Update theme preference in Firestore
  async updateUserTheme(userId: string, theme: 'light' | 'dark'): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        themePreference: theme,
      });
    } catch (e: any) {
      console.warn('[Firebase] Could not persist theme preference to Firestore:', e?.message || e);
    }
  },
};
