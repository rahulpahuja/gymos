/**
 * Firestore Real-time Database Synchronization Service
 * Provides real-time bidirectional syncing between Firestore and local storage.
 * Automatically seeds Firestore if remote collections are empty.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { storageService } from './storageService';

const COLLECTIONS = [
  { firestore: 'branches', localKey: 'gymos_branches_v1', getLocal: () => storageService.getBranches() },
  { firestore: 'trainees', localKey: 'gymos_trainees_v1', getLocal: () => storageService.getTrainees() },
  { firestore: 'trainers', localKey: 'gymos_trainers_v1', getLocal: () => storageService.getTrainers() },
  { firestore: 'pt_packages', localKey: 'gymos_pt_packages_v1', getLocal: () => storageService.getPTPackages() },
  { firestore: 'pt_subscriptions', localKey: 'gymos_pt_subscriptions_v1', getLocal: () => storageService.getPTSubscriptions() },
  { firestore: 'pt_sessions', localKey: 'gymos_pt_sessions_v1', getLocal: () => storageService.getPTSessions() },
  { firestore: 'payments', localKey: 'gymos_payments_v1', getLocal: () => storageService.getPaymentTransactions() },
  { firestore: 'pt_settlements', localKey: 'gymos_pt_settlements_v1', getLocal: () => storageService.getPTCommissionSettlements() },
  { firestore: 'attendance', localKey: 'gymos_attendance_v1', getLocal: () => storageService.getAttendanceRecords() },
  { firestore: 'enquiries', localKey: 'gymos_enquiries_v1', getLocal: () => storageService.getEnquiries() },
  { firestore: 'expenses', localKey: 'gymos_expenses_v1', getLocal: () => storageService.getExpenses() },
  { firestore: 'equipment', localKey: 'gymos_equipment_v1', getLocal: () => storageService.getEquipment() },
  { firestore: 'audit_logs', localKey: 'gymos_audit_logs_v1', getLocal: () => storageService.getAuditLogs() },
];

type SyncCollection = { firestore: string; localKey: string; getLocal: () => any[] };

class FirestoreSyncService {
  private unsubscribes: Unsubscribe[] = [];
  private storageUnsubs: Array<() => void> = [];
  private pushTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private remoteIds: Map<string, Set<string>> = new Map();
  private isInitialized = false;
  private isSyncingFromRemote = false;

  // Initialize real-time listeners for all operational collections
  public async initRealtimeSync(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // First check if any collection is empty, and seed Firestore if needed
      await this.seedEmptyCollections();

      // Start real-time onSnapshot listeners for each collection (remote -> local)
      for (const col of COLLECTIONS) {
        const colRef = collection(db, col.firestore);
        const unsub = onSnapshot(
          colRef,
          (snapshot) => {
            const items: any[] = [];
            snapshot.forEach((docSnap) => {
              items.push({ ...docSnap.data(), id: docSnap.id });
            });
            this.remoteIds.set(col.firestore, new Set(items.map((i) => String(i.id))));

            if (snapshot.empty) {
              // Don't wipe the local seed just because the remote collection is empty
              return;
            }

            this.isSyncingFromRemote = true;
            localStorage.setItem(col.localKey, JSON.stringify(items));
            storageService.notify(col.localKey);
            storageService.notify('*');
            this.isSyncingFromRemote = false;
          },
          (error) => {
            console.warn(`[FirestoreSync] Subscription warning on ${col.firestore}:`, error);
          }
        );
        this.unsubscribes.push(unsub);
      }

      // Push local writes back to Firestore (local -> remote)
      for (const col of COLLECTIONS) {
        const unsub = storageService.subscribe(col.localKey, () => {
          if (this.isSyncingFromRemote) return;
          this.schedulePush(col);
        });
        this.storageUnsubs.push(unsub);
      }

      console.log('[FirestoreSync] Realtime bidirectional sync active across all gym collections');
    } catch (error) {
      console.warn('[FirestoreSync] Failed to initialize Firestore real-time sync, local mode fallback active:', error);
    }
  }

  // Debounce rapid successive writes to the same collection into one push
  private schedulePush(col: SyncCollection): void {
    const existing = this.pushTimers.get(col.firestore);
    if (existing) clearTimeout(existing);
    this.pushTimers.set(
      col.firestore,
      setTimeout(() => {
        this.pushTimers.delete(col.firestore);
        void this.pushCollection(col);
      }, 400)
    );
  }

  // Upsert every local record and delete remote records that were removed locally
  private async pushCollection(col: SyncCollection): Promise<void> {
    try {
      const local = (col.getLocal() || []).filter((it) => it && it.id);
      const localIds = new Set<string>(local.map((it) => String(it.id)));

      const batch = writeBatch(db);
      let ops = 0;
      for (const item of local.slice(0, 450)) {
        batch.set(doc(db, col.firestore, String(item.id)), item, { merge: true });
        ops += 1;
      }
      const known = this.remoteIds.get(col.firestore);
      if (known) {
        for (const id of known) {
          if (!localIds.has(id)) {
            batch.delete(doc(db, col.firestore, id));
            ops += 1;
          }
        }
      }
      if (ops > 0) await batch.commit();
      this.remoteIds.set(col.firestore, localIds);
    } catch (error) {
      console.warn(`[FirestoreSync] Push to ${col.firestore} failed:`, error);
    }
  }

  // Seed remote Firestore from local data if Firestore is fresh
  private async seedEmptyCollections(): Promise<void> {
    try {
      for (const col of COLLECTIONS) {
        const colRef = collection(db, col.firestore);
        const snapshot = await getDocs(colRef);

        if (snapshot.empty) {
          const localData = col.getLocal();
          if (localData && localData.length > 0) {
            console.log(`[FirestoreSync] Seeding ${col.firestore} with ${localData.length} records...`);
            const batch = writeBatch(db);
            // Stay under the 500-op batch limit
            const toSeed = localData.slice(0, 450);
            for (const item of toSeed) {
              if (item.id) {
                const docRef = doc(db, col.firestore, item.id);
                batch.set(docRef, item);
              }
            }
            await batch.commit();
          }
        }
      }
    } catch (error) {
      console.warn('[FirestoreSync] Firestore seeding check skipped or permission pending:', error);
    }
  }

  // Save single entity to Firestore in background
  public async syncRecord(collectionName: string, id: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      console.warn(`[FirestoreSync] Background sync to ${collectionName}/${id} error:`, error);
    }
  }

  // Delete entity from Firestore
  public async deleteRecord(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn(`[FirestoreSync] Background delete from ${collectionName}/${id} error:`, error);
    }
  }

  // Stop listeners on logout
  public stop(): void {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
    this.storageUnsubs.forEach((unsub) => unsub());
    this.storageUnsubs = [];
    this.pushTimers.forEach((t) => clearTimeout(t));
    this.pushTimers.clear();
    this.remoteIds.clear();
    this.isInitialized = false;
  }
}

export const firestoreSync = new FirestoreSyncService();
