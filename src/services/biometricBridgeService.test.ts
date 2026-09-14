import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeTraineeValidity, FingerprintDeviceAdapter } from './biometricBridgeService';
import { storageService } from './storageService';
import { Trainee } from '../types';

const trainee = (overrides: Partial<Trainee> = {}): Trainee => ({
  id: 'tr1', fullName: 'Rahul Malhotra', phone: '', email: '', address: '', dob: '', gender: 'Male',
  emergencyContact: '', joiningDate: '', branchId: 'branch-1', totalPaid: 0, totalDue: 0,
  status: 'active', createdAt: '', ...overrides,
});

describe('computeTraineeValidity', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports suspended/cancelled status regardless of an otherwise-valid expiry date', () => {
    vi.setSystemTime(new Date('2026-01-01'));
    expect(computeTraineeValidity(trainee({ status: 'suspended', generalMembershipExpiryDate: '2030-01-01' })).status).toBe('suspended');
    expect(computeTraineeValidity(trainee({ status: 'cancelled', generalMembershipExpiryDate: '2030-01-01' })).status).toBe('cancelled');
  });

  it('reports expired for a past expiry date', () => {
    vi.setSystemTime(new Date('2026-06-01'));
    const v = computeTraineeValidity(trainee({ generalMembershipExpiryDate: '2026-01-01' }));
    expect(v.status).toBe('expired');
    expect(v.label).toContain('Expired');
  });

  it('reports active for a future expiry date', () => {
    vi.setSystemTime(new Date('2026-01-01'));
    const v = computeTraineeValidity(trainee({ generalMembershipExpiryDate: '2026-12-31' }));
    expect(v.status).toBe('active');
    expect(v.label).toContain('Active until');
  });

  it('boundary: an expiry exactly equal to the current instant is not yet expired (strict less-than)', () => {
    const now = new Date('2026-06-15T10:00:00.000Z');
    vi.setSystemTime(now);
    const v = computeTraineeValidity(trainee({ generalMembershipExpiryDate: now.toISOString() }));
    expect(v.status).toBe('active');
  });

  it('falls back to the legacy membershipExpiry field when the primary field is absent', () => {
    vi.setSystemTime(new Date('2026-01-01'));
    const v = computeTraineeValidity(trainee({ generalMembershipExpiryDate: undefined, membershipExpiry: '2026-12-31' }));
    expect(v.status).toBe('active');
  });

  it('does not crash on a malformed expiry string, falling back to plain status', () => {
    const v = computeTraineeValidity(trainee({ generalMembershipExpiryDate: 'not-a-real-date', status: 'active' }));
    expect(v.status).toBe('active');
    expect(v.label).toBe('Active');
  });

  it('reports "no active plan" for an active-status trainee with no expiry at all if status is not active', () => {
    const v = computeTraineeValidity(trainee({ status: 'inactive', generalMembershipExpiryDate: undefined }));
    expect(v.status).toBe('inactive');
    expect(v.label).toBe('No active membership plan');
  });
});

describe('FingerprintDeviceAdapter', () => {
  let adapter: FingerprintDeviceAdapter;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new FingerprintDeviceAdapter();
    adapter.configure({ bridgeUrl: 'http://127.0.0.1:8090' });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

  describe('connect', () => {
    it('marks the adapter connected and captures device info on success', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true, firmware: '1.2', serialNumber: 'SN1', userCount: 42 }));
      const ok = await adapter.connect();
      expect(ok).toBe(true);
      expect(adapter.isConnected()).toBe(true);
      expect(adapter.getDeviceStatus().firmware).toBe('1.2');
      expect(adapter.getDeviceStatus().userCount).toBe(42);
    });

    it('reports failure and captures the bridge-provided error when the bridge itself says success:false', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: false, error: 'Device offline' }));
      const ok = await adapter.connect();
      expect(ok).toBe(false);
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getLastError()).toBe('Device offline');
    });

    it('reports failure with a helpful message when the network request itself fails', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const ok = await adapter.connect();
      expect(ok).toBe(false);
      expect(adapter.getLastError()).toContain('Could not reach');
    });

    it('treats a non-JSON response body as an empty object rather than throwing', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('not json'); } });
      const ok = await adapter.connect();
      expect(ok).toBe(false);
      expect(adapter.getLastError()).toContain('500');
    });
  });

  describe('security / input validation', () => {
    it('rejects a non-http(s) bridge URL scheme instead of calling fetch (e.g. javascript:)', async () => {
      adapter.configure({ bridgeUrl: 'javascript:alert(1)' });
      const ok = await adapter.connect();
      expect(ok).toBe(false);
      expect(adapter.getLastError()).toContain('http:// or https://');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a file:// bridge URL', async () => {
      adapter.configure({ bridgeUrl: 'file:///etc/passwd' });
      const ok = await adapter.connect();
      expect(ok).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('blocks the call with a clear message when the page is https but the bridge is plain http (mixed content)', async () => {
      // jsdom's window.location.protocol is non-configurable, so it can't be
      // spied on directly — stub the whole `window` global instead, which is
      // all isMixedContentBlocked() actually reads.
      vi.stubGlobal('window', { location: { protocol: 'https:' } });
      adapter.configure({ bridgeUrl: 'http://127.0.0.1:8090' });
      const ok = await adapter.connect();
      expect(ok).toBe(false);
      expect(adapter.getLastError()).toContain('mixed content');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('URL-encodes a personId containing path-breaking characters before building the request path', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true }));
      await adapter.removeEnrollment('../../etc/passwd');
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('../../etc/passwd');
      expect(calledUrl).toContain(encodeURIComponent('../../etc/passwd'));
    });
  });

  describe('enrollFingerprint', () => {
    it('refuses to enroll without calling the network when not connected', async () => {
      const result = await adapter.enrollFingerprint({ id: 'p1', name: 'X', type: 'trainee' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('enrolls successfully once connected', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true, firmware: '1', serialNumber: 'SN', userCount: 1 }));
      await adapter.connect();
      fetchMock.mockResolvedValue(okResponse({ success: true, templateId: 'tpl1', deviceUserId: 'du1' }));
      const result = await adapter.enrollFingerprint({ id: 'p1', name: 'X', type: 'trainee' });
      expect(result.success).toBe(true);
      expect(result.templateId).toBe('tpl1');
    });
  });

  describe('request timeout', () => {
    it('aborts and reports a clear timeout error when the bridge never responds', async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
      );
      const connectPromise = adapter.connect();
      await vi.advanceTimersByTimeAsync(10000);
      const ok = await connectPromise;
      expect(ok).toBe(false);
      expect(adapter.getLastError()).toContain('did not respond within');
      vi.useRealTimers();
    });
  });

  describe('synchronize', () => {
    it('returns the punch records from a successful sync', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true, records: [{ deviceUserId: 'du1', timestamp: 't', punch: 0, status: 1 }], count: 1 }));
      const result = await adapter.synchronize();
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.records).toHaveLength(1);
    });

    it('returns a failure shape instead of throwing on a network error', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));
      const result = await adapter.synchronize();
      expect(result.success).toBe(false);
      expect(result.records).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('getDeviceAttendanceLog', () => {
    it('GETs the read-only log endpoint and returns every record, distinct from synchronize()', async () => {
      fetchMock.mockResolvedValue(
        okResponse({ success: true, records: [{ deviceUserId: 'du1', timestamp: 't1', punch: 0, status: 1 }], count: 1 })
      );
      const result = await adapter.getDeviceAttendanceLog();
      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('/api/attendance-log');
      expect(init?.method ?? undefined).not.toBe('POST'); // read-only: must not mutate the bridge's sync cursor
    });

    it('returns a failure shape instead of throwing on a network error', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));
      const result = await adapter.getDeviceAttendanceLog();
      expect(result.success).toBe(false);
      expect(result.records).toEqual([]);
    });
  });

  describe('last-known status persistence (regression: bridge looks disconnected after a browser refresh)', () => {
    it('persists the connection snapshot after a successful connect()', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true, firmware: '1.2', serialNumber: 'SN1', userCount: 7 }));
      await adapter.connect();
      const saved = storageService.getBiometricLastStatus();
      expect(saved).toMatchObject({ connected: true, firmware: '1.2', serialNumber: 'SN1', userCount: 7, bridgeUrl: 'http://127.0.0.1:8090' });
    });

    it('persists a disconnected snapshot after a failed connect(), overwriting a stale "connected" one', async () => {
      fetchMock.mockResolvedValue(okResponse({ success: true, firmware: '1', serialNumber: 'SN', userCount: 1 }));
      await adapter.connect();
      fetchMock.mockResolvedValue(okResponse({ success: false, error: 'Device offline' }));
      await adapter.connect();
      expect(storageService.getBiometricLastStatus()).toMatchObject({ connected: false });
    });

    it('a freshly constructed adapter warm-starts as connected from a persisted snapshot for the same bridge URL', () => {
      storageService.saveBiometricLastStatus({
        bridgeUrl: 'http://127.0.0.1:8090',
        connected: true,
        firmware: '2.0',
        serialNumber: 'SN9',
        userCount: 12,
        checkedAt: new Date().toISOString(),
      });
      const fresh = new FingerprintDeviceAdapter();
      expect(fresh.isConnected()).toBe(true);
      expect(fresh.getDeviceStatus().firmware).toBe('2.0');
    });

    it('ignores a persisted snapshot for a different bridge URL (stale config must never be shown as current)', () => {
      storageService.saveBiometricLastStatus({
        bridgeUrl: 'https://old-machine:8090',
        connected: true,
        checkedAt: new Date().toISOString(),
      });
      storageService.saveBiometricConfig({ bridgeUrl: 'http://127.0.0.1:8090', deviceModel: 'ESSL', autoTurnstile: true });
      const fresh = new FingerprintDeviceAdapter();
      expect(fresh.isConnected()).toBe(false);
    });

    it('does not throw when the persisted snapshot is corrupted', () => {
      localStorage.setItem('gymos_biometric_last_status_v1', '{not-json');
      expect(() => new FingerprintDeviceAdapter()).not.toThrow();
    });
  });
});
