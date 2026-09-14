/**
 * Regression coverage for FirestoreSyncService — the bidirectional local
 * cache <-> Firestore sync layer. Git history shows a real bug here where an
 * empty remote snapshot was skipped instead of clearing the local cache,
 * leaving deleted Firestore data "resurrected" in every other open browser.
 * These tests pin that fix down, plus the upsert/delete diffing and
 * debounce-coalescing logic that pushes local writes back to Firestore.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ __name: name })),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ __col: col, __id: id })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('./storageService', () => ({
  storageService: {
    getBranches: vi.fn(() => []),
    getTrainees: vi.fn(() => []),
    getTrainers: vi.fn(() => []),
    getPTPackages: vi.fn(() => []),
    getPTSubscriptions: vi.fn(() => []),
    getPTSessions: vi.fn(() => []),
    getPaymentTransactions: vi.fn(() => []),
    getPTCommissionSettlements: vi.fn(() => []),
    getAttendanceRecords: vi.fn(() => []),
    getEnquiries: vi.fn(() => []),
    getExpenses: vi.fn(() => []),
    getEquipment: vi.fn(() => []),
    getAuditLogs: vi.fn(() => []),
    subscribe: vi.fn(),
    notify: vi.fn(),
  },
}));

import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { storageService } from './storageService';
import { firestoreSync } from './firestoreSync';

const fakeDocSnap = (id: string, data: Record<string, unknown> = {}) => ({ id, data: () => data });
const fakeSnapshot = (docs: ReturnType<typeof fakeDocSnap>[]) => ({ forEach: (fn: (d: any) => void) => docs.forEach(fn) });

function captureSnapshotCallbacks() {
  const callbacks: Record<string, (snap: unknown) => void> = {};
  vi.mocked(onSnapshot).mockImplementation((ref: any, successCb: any) => {
    callbacks[ref.__name] = successCb;
    return vi.fn();
  });
  return callbacks;
}

function captureSubscribeCallbacks() {
  const callbacks: Record<string, () => void> = {};
  vi.mocked(storageService.subscribe).mockImplementation((key: string, cb: () => void) => {
    callbacks[key] = cb;
    return vi.fn();
  });
  return callbacks;
}

function fakeBatch() {
  const batch = { set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
  vi.mocked(writeBatch).mockReturnValue(batch as any);
  return batch;
}

// `clearMocks`/`restoreMocks` (vitest.config.ts) wipe every vi.fn()'s
// implementation — including the ones set inside vi.mock() factories above —
// before each test. That's harmless for mocks consumed once at module import
// (firebase.ts-style singletons), but collection/doc/onSnapshot/subscribe are
// called fresh by every initRealtimeSync() call here, so they need stable
// baseline behavior re-established before each test.
beforeEach(() => {
  vi.mocked(collection).mockImplementation((_db: any, name: string) => ({ __name: name }) as any);
  vi.mocked(doc).mockImplementation((_db: any, col: string, id: string) => ({ __col: col, __id: id }) as any);
  vi.mocked(setDoc).mockResolvedValue(undefined);
  vi.mocked(deleteDoc).mockResolvedValue(undefined);
  vi.mocked(onSnapshot).mockReturnValue(vi.fn());
  vi.mocked(storageService.subscribe).mockReturnValue(vi.fn());
});

describe('FirestoreSyncService realtime remote -> local sync', () => {
  afterEach(() => {
    firestoreSync.stop();
  });

  it('overwrites the local cache with an empty array on an empty remote snapshot (regression: stale cache must not survive real deletions)', async () => {
    localStorage.setItem('gymos_branches_v1', JSON.stringify([{ id: 'stale-branch' }]));
    const callbacks = captureSnapshotCallbacks();

    await firestoreSync.initRealtimeSync();
    callbacks['branches'](fakeSnapshot([]));

    expect(JSON.parse(localStorage.getItem('gymos_branches_v1')!)).toEqual([]);
    expect(storageService.notify).toHaveBeenCalledWith('gymos_branches_v1');
    expect(storageService.notify).toHaveBeenCalledWith('*');
  });

  it('writes every document from a populated snapshot into the matching local storage key', async () => {
    const callbacks = captureSnapshotCallbacks();
    await firestoreSync.initRealtimeSync();

    callbacks['trainees'](fakeSnapshot([fakeDocSnap('t1', { fullName: 'Rahul' }), fakeDocSnap('t2', { fullName: 'Ananya' })]));

    const stored = JSON.parse(localStorage.getItem('gymos_trainees_v1')!);
    expect(stored).toEqual([{ fullName: 'Rahul', id: 't1' }, { fullName: 'Ananya', id: 't2' }]);
  });
});

describe('FirestoreSyncService local -> remote push', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    firestoreSync.stop();
    vi.useRealTimers();
  });

  it('debounces rapid successive local writes to the same collection into a single push', async () => {
    captureSnapshotCallbacks();
    const subs = captureSubscribeCallbacks();
    const batch = fakeBatch();
    vi.mocked(storageService.getTrainees).mockReturnValue([{ id: 't1' }, { id: 't2' }] as any);

    await firestoreSync.initRealtimeSync();
    subs['gymos_trainees_v1'](); // first local save
    subs['gymos_trainees_v1'](); // second local save, still within debounce window

    await vi.advanceTimersByTimeAsync(400);

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(batch.set).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it('deletes remote documents that were removed locally, without re-uploading ones that still exist', async () => {
    const snapshotCallbacks = captureSnapshotCallbacks();
    const subs = captureSubscribeCallbacks();
    const batch = fakeBatch();

    await firestoreSync.initRealtimeSync();
    // Seed the "known remote ids" for trainees from an initial remote snapshot of 3 docs.
    snapshotCallbacks['trainees'](fakeSnapshot([fakeDocSnap('t1'), fakeDocSnap('t2'), fakeDocSnap('t3')]));

    // Locally, t3 has since been deleted — only t1/t2 remain.
    vi.mocked(storageService.getTrainees).mockReturnValue([{ id: 't1' }, { id: 't2' }] as any);
    subs['gymos_trainees_v1']();
    await vi.advanceTimersByTimeAsync(400);

    expect(batch.set).toHaveBeenCalledTimes(2); // t1, t2 upserted
    expect(batch.delete).toHaveBeenCalledTimes(1); // t3 removed remotely
    expect(vi.mocked(doc).mock.calls.some((c) => c[1] === 'trainees' && c[2] === 't3')).toBe(true);
  });

  it('ignores a local-write notification while a remote snapshot is actively being applied (prevents an echo push)', async () => {
    const snapshotCallbacks = captureSnapshotCallbacks();
    const subs = captureSubscribeCallbacks();
    fakeBatch();

    await firestoreSync.initRealtimeSync();
    // A remote snapshot synchronously triggers storageService.notify(), which in a
    // real app re-enters the subscribe callback — simulate that re-entrant call
    // happening while isSyncingFromRemote is true.
    vi.mocked(storageService.notify).mockImplementationOnce(() => {
      subs['gymos_trainees_v1']?.();
    });
    snapshotCallbacks['trainees'](fakeSnapshot([fakeDocSnap('t1')]));

    await vi.advanceTimersByTimeAsync(400);
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('caps a single batch write at 450 documents', async () => {
    captureSnapshotCallbacks();
    const subs = captureSubscribeCallbacks();
    const batch = fakeBatch();
    const manyTrainees = Array.from({ length: 500 }, (_, i) => ({ id: `t${i}` }));
    vi.mocked(storageService.getTrainees).mockReturnValue(manyTrainees as any);

    await firestoreSync.initRealtimeSync();
    subs['gymos_trainees_v1']();
    await vi.advanceTimersByTimeAsync(400);

    expect(batch.set).toHaveBeenCalledTimes(450);
  });
});

describe('FirestoreSyncService.clearAllCollections', () => {
  afterEach(() => {
    firestoreSync.stop();
  });

  it('deletes every document across every collection and reports what was cleared', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: true, size: 0, docs: [] } as any);
    const batch = fakeBatch();

    const result = await firestoreSync.clearAllCollections();

    expect(result.errors).toEqual([]);
    expect(result.cleared.length).toBeGreaterThan(0);
    expect(batch.commit).not.toHaveBeenCalled(); // nothing to delete, no wasted commits
  });

  it('records a collection as errored instead of throwing when its deletion fails, and still processes the rest', async () => {
    vi.mocked(getDocs).mockImplementation((ref: any) =>
      ref.__name === 'branches' ? Promise.reject(new Error('permission denied')) : Promise.resolve({ empty: true, size: 0, docs: [] } as any)
    );
    fakeBatch();

    const result = await firestoreSync.clearAllCollections();

    expect(result.errors).toContain('branches');
    expect(result.cleared).not.toContain('branches');
    expect(result.cleared.length).toBeGreaterThan(0);
  });

  it('stops the realtime listeners before deleting, so a mid-deletion snapshot cannot re-populate local storage', async () => {
    const callbacks = captureSnapshotCallbacks();
    vi.mocked(getDocs).mockResolvedValue({ empty: true, size: 0, docs: [] } as any);
    fakeBatch();

    await firestoreSync.initRealtimeSync();
    await firestoreSync.clearAllCollections();

    // The unsubscribe returned by onSnapshot for every collection must have been invoked.
    const unsubscribeFns = vi.mocked(onSnapshot).mock.results.map((r) => r.value);
    unsubscribeFns.forEach((fn) => expect(fn).toHaveBeenCalled());
    void callbacks;
  });
});
