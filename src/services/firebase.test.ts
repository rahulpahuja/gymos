/**
 * Regression coverage for the authentication/authorization logic in
 * firebaseAuthService — the highest-risk module in the app: it decides who
 * gets access, at what role, and at which branch. Recent history shows this
 * exact area has shipped real bugs (pre-authorization silently not working,
 * and not being consumed on session reconnect), so these tests pin down the
 * behavior those fixes rely on.
 *
 * The whole Firebase SDK is mocked — these are pure logic/contract tests,
 * never touching a real project.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({ setCustomParameters: vi.fn() })),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ __col: col, __id: id })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn().mockResolvedValue({ exists: () => false }),
  collection: vi.fn((_db: unknown, col: string) => ({ __col: col })),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  orderBy: vi.fn(),
}));

import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuthService } from './firebase';
import { storageService } from './storageService';

const notExists = { exists: () => false } as any;
const existsWith = (data: unknown) => ({ exists: () => true, data: () => data }) as any;

const fakeUser = (overrides: Partial<{ uid: string; email: string; displayName: string; photoURL: string }> = {}) => ({
  uid: 'uid-1',
  email: 'staff@gymos.in',
  displayName: 'Staff Member',
  photoURL: '',
  ...overrides,
}) as any;

describe('firebaseAuthService.syncOrCreateUserProfile', () => {
  beforeEach(() => {
    vi.mocked(getDoc).mockReset();
    vi.mocked(setDoc).mockClear();
    vi.mocked(updateDoc).mockClear();
    vi.mocked(deleteDoc).mockClear();
  });

  it('creates a pending profile with the requested role/branch for a brand-new, non-owner, non-preauthorized user', async () => {
    vi.mocked(getDoc)
      .mockResolvedValueOnce(notExists) // users/{uid}
      .mockResolvedValueOnce(notExists); // preauthorized_staff/{email}

    const account = await firebaseAuthService.syncOrCreateUserProfile(fakeUser(), 'manager', 'branch-2');

    expect(account.status).toBe('pending');
    expect(account.role).toBe('manager');
    expect(account.branchId).toBe('branch-2');
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('grants a brand-new super-admin-email sign-in full admin access, ignoring the requested role entirely (privilege bypass, by design)', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(notExists); // users/{uid} only — preauth lookup must be skipped for owners

    const account = await firebaseAuthService.syncOrCreateUserProfile(
      fakeUser({ email: 'THERAHULPAHUJA@GMAIL.COM' }),
      'trainee', // requested role must NOT leak through for the owner account
      'branch-9'
    );

    expect(account.role).toBe('admin');
    expect(account.status).toBe('approved');
    expect(account.branchId).toBe('all');
    expect(account.approvedBy).toBe('System (Owner)');
    // Only one getDoc call: the pre-authorization collection must never be
    // consulted for an owner sign-in.
    expect(getDoc).toHaveBeenCalledTimes(1);
  });

  it('consumes a matching pre-authorization for a brand-new user, applying its role/branch and deleting it', async () => {
    vi.mocked(getDoc)
      .mockResolvedValueOnce(notExists) // users/{uid}
      .mockResolvedValueOnce(existsWith({ role: 'trainer', branchId: 'branch-2', approvedBy: 'Meera Nair' }));

    const account = await firebaseAuthService.syncOrCreateUserProfile(fakeUser(), 'manager', 'branch-1');

    expect(account.role).toBe('trainer');
    expect(account.branchId).toBe('branch-2');
    expect(account.status).toBe('approved');
    expect(account.approvedBy).toBe('Meera Nair');
    expect(deleteDoc).toHaveBeenCalledTimes(1); // one-time use
  });

  it('does not consult pre-authorization at all when a user profile already exists', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(
      existsWith({ id: 'uid-1', role: 'manager', status: 'approved', branchId: 'branch-1', createdAt: '' })
    );

    await firebaseAuthService.syncOrCreateUserProfile(fakeUser(), 'manager', 'branch-1');

    expect(getDoc).toHaveBeenCalledTimes(1);
  });

  it('never silently overwrites an existing non-owner user\'s role/branch on a routine re-login', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(
      existsWith({ id: 'uid-1', role: 'manager', status: 'approved', branchId: 'branch-1', createdAt: '' })
    );

    // A different requestedRole/branch must not clobber the stored identity.
    const account = await firebaseAuthService.syncOrCreateUserProfile(fakeUser(), 'trainee', 'branch-9');

    expect(account.role).toBe('manager');
    expect(account.branchId).toBe('branch-1');
    const updatePayload = vi.mocked(updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(updatePayload).not.toHaveProperty('role');
    expect(updatePayload).not.toHaveProperty('branchId');
  });

  it('self-heals a drifted super-admin record back to admin/approved on next login', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(
      existsWith({ id: 'uid-1', role: 'manager', status: 'pending', branchId: 'branch-1', createdAt: '' })
    );

    const account = await firebaseAuthService.syncOrCreateUserProfile(
      fakeUser({ email: 'therahulpahuja@gmail.com' })
    );

    expect(account.role).toBe('admin');
    expect(account.status).toBe('approved');
    expect(account.branchId).toBe('all');
  });
});

describe('firebaseAuthService.preAuthorizeStaff (regression: "it never actually worked")', () => {
  it('writes the pre-authorization keyed by the lowercased, trimmed email', async () => {
    await firebaseAuthService.preAuthorizeStaff('  Manager@GymOS.in  ', 'manager', 'branch-1', 'Admin User');

    const [ref, data] = vi.mocked(setDoc).mock.calls[0];
    expect((ref as any).__id).toBe('manager@gymos.in');
    expect((ref as any).__col).toBe('preauthorized_staff');
    expect(data).toMatchObject({ role: 'manager', branchId: 'branch-1', approvedBy: 'Admin User' });
  });
});

describe('firebaseAuthService.onAuthState (regression: consume pre-auth on reconnect, not just fresh sign-in)', () => {
  it('consumes a matching pre-authorization even when the profile doc is missing on a session reconnect (not a fresh popup sign-in)', async () => {
    let snapshotCallbackDone: Promise<unknown> = Promise.resolve();
    vi.mocked(onSnapshot).mockImplementation((_ref: unknown, successCb: any) => {
      snapshotCallbackDone = successCb(notExists);
      return vi.fn();
    });
    vi.mocked(getDoc).mockResolvedValueOnce(
      existsWith({ role: 'trainer', branchId: 'branch-3', approvedBy: 'Sunil Deshmukh' })
    );

    let authStateCallbackDone: Promise<unknown> = Promise.resolve();
    vi.mocked(onAuthStateChanged).mockImplementation((_auth: unknown, cb: any) => {
      authStateCallbackDone = cb(fakeUser({ email: 'reconnecting.trainer@gymos.in' }));
      return vi.fn();
    });

    const received: unknown[] = [];
    firebaseAuthService.onAuthState((account) => received.push(account));

    await authStateCallbackDone;
    await snapshotCallbackDone;

    expect(deleteDoc).toHaveBeenCalledTimes(1); // pre-auth consumed exactly once
    expect(setDoc).toHaveBeenCalledTimes(1); // profile created from it
    const created = received[0] as { role: string; branchId: string; status: string };
    expect(created.role).toBe('trainer');
    expect(created.branchId).toBe('branch-3');
    expect(created.status).toBe('approved');
  });

  it('reports null for a signed-out user without touching Firestore', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth: unknown, cb: any) => {
      void cb(null);
      return vi.fn();
    });

    const received: unknown[] = [];
    firebaseAuthService.onAuthState((account) => received.push(account));
    await Promise.resolve();

    expect(received).toEqual([null]);
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('marks a non-owner, non-preauthorized, non-brand-new user as revoked when their profile doc has disappeared', async () => {
    let snapshotCallbackDone: Promise<unknown> = Promise.resolve();
    vi.mocked(onSnapshot).mockImplementation((_ref: unknown, successCb: any) => {
      snapshotCallbackDone = successCb(notExists);
      return vi.fn();
    });
    vi.mocked(getDoc).mockResolvedValueOnce(notExists); // no pre-authorization either

    let authStateCallbackDone: Promise<unknown> = Promise.resolve();
    const oldUser = fakeUser({ email: 'longtime.staff@gymos.in' });
    (oldUser as any).metadata = { creationTime: '2020-01-01T00:00:00.000Z', lastSignInTime: '2026-01-01T00:00:00.000Z' };
    vi.mocked(onAuthStateChanged).mockImplementation((_auth: unknown, cb: any) => {
      authStateCallbackDone = cb(oldUser);
      return vi.fn();
    });

    const received: any[] = [];
    firebaseAuthService.onAuthState((account) => received.push(account));
    await authStateCallbackDone;
    await snapshotCallbackDone;

    expect(received[0].status).toBe('rejected');
    expect(received[0].rejectionReason).toContain('removed by an administrator');
  });
});

describe('firebaseAuthService user-management actions are all audited (regression: admin had zero visibility into these)', () => {
  const lastAction = () => storageService.getAuditLogs()[0];

  it('logs approveUser with the target person and their new role', async () => {
    await firebaseAuthService.approveUser('u1', 'manager', 'branch-2', 'Admin', undefined, 'manager@gymos.in');
    expect(lastAction().action).toBe('User Approved');
    expect(lastAction().details).toContain('manager@gymos.in');
    expect(lastAction().details).toContain('manager');
    expect(lastAction().branchId).toBe('branch-2');
  });

  it('logs rejectUser with the reason', async () => {
    await firebaseAuthService.rejectUser('u2', 'Not a real staff member', 'Admin', 'spam@gymos.in');
    expect(lastAction().action).toBe('User Rejected');
    expect(lastAction().details).toContain('Not a real staff member');
  });

  it('logs updateUserAccess with the new role/branch', async () => {
    await firebaseAuthService.updateUserAccess('u3', 'trainer', 'branch-1', undefined, 'coach@gymos.in');
    expect(lastAction().action).toBe('User Access Updated');
    expect(lastAction().branchId).toBe('branch-1');
  });

  it('logs revokeUser', async () => {
    await firebaseAuthService.revokeUser('u4', 'Admin', 'exstaff@gymos.in');
    expect(lastAction().action).toBe('User Access Revoked');
    expect(lastAction().details).toContain('exstaff@gymos.in');
  });

  it('logs deleteUser', async () => {
    await firebaseAuthService.deleteUser('u5', 'purged@gymos.in');
    expect(lastAction().action).toBe('User Deleted');
  });

  it('logs preAuthorizeStaff with the normalized email and assigned branch', async () => {
    await firebaseAuthService.preAuthorizeStaff('  Manager2@GymOS.in ', 'manager', 'branch-3', 'Admin');
    expect(lastAction().action).toBe('Staff Pre-Authorized');
    expect(lastAction().entityId).toBe('manager2@gymos.in');
    expect(lastAction().branchId).toBe('branch-3');
  });
});
