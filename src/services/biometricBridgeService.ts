/**
 * Biometric & Fingerprint Integration Adapter (Sections 21, 22)
 * Talks over HTTP/SSE to the local `biometric-bridge` service (see
 * /biometric-bridge in the repo root), which itself speaks the native ZK
 * protocol to the ESSL fingerprint terminal. No hardware access happens in
 * the browser directly — this is a thin client for that bridge's REST API.
 */

import { BiometricBridgeConfig, BiometricDeviceUser, BiometricEnrollment, BiometricPersonType, BiometricPunchEvent, BiometricValidity, Trainee } from '../types';
import { storageService, DEFAULT_BIOMETRIC_CONFIG } from './storageService';

/** Real membership validity from a trainee's actual plan/status fields — not a placeholder. */
export function computeTraineeValidity(trainee: Trainee): BiometricValidity {
  if (trainee.status === 'suspended') return { status: 'suspended', label: 'Suspended' };
  if (trainee.status === 'cancelled') return { status: 'cancelled', label: 'Cancelled' };

  const expiry = trainee.generalMembershipExpiryDate || trainee.membershipExpiry;
  if (expiry) {
    const expiryDate = new Date(expiry);
    if (!isNaN(expiryDate.getTime())) {
      const dateLabel = expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return expiryDate.getTime() < Date.now()
        ? { status: 'expired', label: `Expired ${dateLabel}` }
        : { status: 'active', label: `Active until ${dateLabel}` };
    }
  }

  if (trainee.status === 'active') return { status: 'active', label: 'Active' };
  return { status: 'inactive', label: 'No active membership plan' };
}

export interface BiometricScanResult {
  success: boolean;
  personId?: string;
  personType?: BiometricPersonType;
  personName?: string;
  confidenceScore?: number;
  deviceId: string;
  timestamp: string;
  error?: string;
}

export interface BiometricEnrollResult {
  success: boolean;
  templateId?: string;
  deviceUserId?: string;
  confidenceScore?: number;
  deviceId: string;
  timestamp: string;
  error?: string;
}

export interface BiometricSyncResult {
  success: boolean;
  records: BiometricPunchEvent[];
  count: number;
  error?: string;
}

export interface BiometricActionResult {
  success: boolean;
  error?: string;
}

export interface DeviceStatus {
  model: string;
  firmware: string;
  serialNumber: string;
  port: string;
  userCount?: number;
  /** Enrolled/capacity counts from the terminal's own "Device Capacity"
   * screen. Attendance punches aren't tagged by verification method (the ZK
   * protocol logs a punch as just user + time + direction either way), so
   * every check-in is already captured regardless of finger vs. face — these
   * counts are purely about enrollment capacity, not attendance coverage. */
  fingerprintsEnrolled?: number;
  fingerprintsCapacity?: number;
  facesEnrolled?: number;
  facesCapacity?: number;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export class FingerprintDeviceAdapter {
  private config: BiometricBridgeConfig = DEFAULT_BIOMETRIC_CONFIG;
  private connected = false;
  private currentStatus: DeviceStatus['status'] = 'disconnected';
  private firmware = '';
  private serialNumber = '';
  private userCount: number | undefined;
  private fingerprintsEnrolled: number | undefined;
  private fingerprintsCapacity: number | undefined;
  private facesEnrolled: number | undefined;
  private facesCapacity: number | undefined;
  private liveSource: EventSource | null = null;
  private lastError = '';

  constructor() {
    try {
      this.config = storageService.getBiometricConfig();
    } catch {
      this.config = DEFAULT_BIOMETRIC_CONFIG;
    }
    this.hydrateFromLastKnownStatus();
  }

  /**
   * Every page load creates a brand-new adapter instance with no memory of
   * the last connection, so the UI always started at "disconnected" until
   * someone re-verified manually — looking exactly like the bridge itself
   * had dropped on refresh. Warm-start from the last observed status (for
   * the currently configured bridge URL only) so the UI can show "connected"
   * immediately while a real background check confirms or corrects it.
   */
  private hydrateFromLastKnownStatus() {
    try {
      const last = storageService.getBiometricLastStatus();
      if (!last || last.bridgeUrl !== this.config.bridgeUrl) return;
      this.connected = last.connected;
      this.currentStatus = last.connected ? 'connected' : 'disconnected';
      this.firmware = last.firmware || '';
      this.serialNumber = last.serialNumber || '';
      this.userCount = last.userCount;
      this.fingerprintsEnrolled = last.fingerprintsEnrolled;
      this.fingerprintsCapacity = last.fingerprintsCapacity;
      this.facesEnrolled = last.facesEnrolled;
      this.facesCapacity = last.facesCapacity;
    } catch {
      // Corrupted/unavailable cache — fall back to the normal cold-start state.
    }
  }

  private persistLastKnownStatus() {
    storageService.saveBiometricLastStatus({
      bridgeUrl: this.config.bridgeUrl,
      connected: this.connected,
      firmware: this.firmware || undefined,
      serialNumber: this.serialNumber || undefined,
      userCount: this.userCount,
      fingerprintsEnrolled: this.fingerprintsEnrolled,
      fingerprintsCapacity: this.fingerprintsCapacity,
      facesEnrolled: this.facesEnrolled,
      facesCapacity: this.facesCapacity,
      checkedAt: new Date().toISOString(),
    });
  }

  getConfig(): BiometricBridgeConfig {
    return { ...this.config };
  }

  /** Persist and apply a new bridge configuration. A changed URL requires a fresh connect(). */
  configure(patch: Partial<BiometricBridgeConfig>): BiometricBridgeConfig {
    const next: BiometricBridgeConfig = { ...this.config, ...patch };
    const urlChanged = next.bridgeUrl !== this.config.bridgeUrl;
    this.config = next;
    storageService.saveBiometricConfig(next);
    if (urlChanged) {
      this.connected = false;
      this.currentStatus = 'disconnected';
      this.stopLiveFeed();
    }
    return { ...this.config };
  }

  private baseUrl(): string {
    return this.config.bridgeUrl.trim().replace(/\/+$/, '');
  }

  private validUrl(): boolean {
    try {
      const url = new URL(this.config.bridgeUrl);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /** True when the page is https and the bridge URL is plain http — the browser will silently block the call. */
  private isMixedContentBlocked(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      this.config.bridgeUrl.trim().toLowerCase().startsWith('http://')
    );
  }

  private async request<T>(path: string, init?: RequestInit, timeoutMs = 10000): Promise<T> {
    if (!this.validUrl()) {
      throw new Error('Bridge URL must be a valid http:// or https:// address.');
    }
    if (this.isMixedContentBlocked()) {
      throw new Error(
        `This page is loaded over HTTPS, so the browser blocks calls to a plain http:// bridge address (mixed content). ` +
          `Load gymos over plain http (e.g. run "npm run dev" and open it via http://, not the https:// deployed URL) to reach the bridge.`
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await fetch(`${this.baseUrl()}${path}`, {
          ...init,
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        });
      } catch (networkErr) {
        if (controller.signal.aborted) {
          throw new Error(`Bridge did not respond within ${Math.round(timeoutMs / 1000)}s — check it's running and the IP/port are correct.`);
        }
        const hints: string[] = [];
        if (this.baseUrl().toLowerCase().startsWith('https://')) {
          hints.push(
            'if this is the first time connecting from this browser, open the bridge URL directly in a new tab first ' +
              '(e.g. paste it in the address bar) and click through the "not secure" warning to trust its self-signed ' +
              "certificate once — until that's done, the browser silently blocks fetch() calls to it, which looks exactly like this."
          );
        }
        if (/:8000\b/.test(this.baseUrl())) {
          hints.push(
            'port 8000 is the old EasyBio dashboard, not this bridge — biometric-bridge/server.py listens on port 8090 by default.'
          );
        }
        throw new Error(
          `Could not reach ${this.baseUrl()} — is biometric-bridge/server.py running there, and is this machine on the same network?` +
            (hints.length ? ` Also: ${hints.join(' ')}` : '') +
            ` (${networkErr instanceof Error ? networkErr.message : 'network error'})`
        );
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok && !('error' in body)) {
        throw new Error(`Bridge responded with HTTP ${res.status}`);
      }
      return body as T;
    } finally {
      clearTimeout(timer);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getDeviceStatus(): DeviceStatus {
    return {
      model: this.config.deviceModel,
      firmware: this.firmware || 'unknown',
      serialNumber: this.serialNumber || 'unknown',
      port: this.config.bridgeUrl,
      userCount: this.userCount,
      fingerprintsEnrolled: this.fingerprintsEnrolled,
      fingerprintsCapacity: this.fingerprintsCapacity,
      facesEnrolled: this.facesEnrolled,
      facesCapacity: this.facesCapacity,
      status: this.currentStatus,
    };
  }

  getLastError(): string {
    return this.lastError;
  }

  async connect(): Promise<boolean> {
    this.currentStatus = 'connecting';
    this.lastError = '';
    try {
      const data = await this.request<{
        success: boolean;
        firmware?: string;
        serialNumber?: string;
        userCount?: number;
        fingerprintsEnrolled?: number;
        fingerprintsCapacity?: number;
        facesEnrolled?: number;
        facesCapacity?: number;
        error?: string;
      }>('/api/status');
      if (!data.success) {
        this.connected = false;
        this.currentStatus = 'error';
        this.lastError = data.error || 'Bridge reported it could not reach the device.';
        this.persistLastKnownStatus();
        return false;
      }
      this.connected = true;
      this.currentStatus = 'connected';
      this.firmware = data.firmware || '';
      this.serialNumber = data.serialNumber || '';
      this.userCount = data.userCount;
      this.fingerprintsEnrolled = data.fingerprintsEnrolled;
      this.fingerprintsCapacity = data.fingerprintsCapacity;
      this.facesEnrolled = data.facesEnrolled;
      this.facesCapacity = data.facesCapacity;
      this.persistLastKnownStatus();
      return true;
    } catch (e) {
      this.connected = false;
      this.currentStatus = 'error';
      this.lastError = e instanceof Error ? e.message : 'Could not reach the bridge.';
      this.persistLastKnownStatus();
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    this.connected = false;
    this.currentStatus = 'disconnected';
    this.stopLiveFeed();
    this.persistLastKnownStatus();
    return true;
  }

  /** Re-reads device info without dropping the "configured" state. */
  async refreshDevice(): Promise<BiometricActionResult> {
    try {
      const data = await this.request<{
        success: boolean;
        firmware?: string;
        serialNumber?: string;
        userCount?: number;
        fingerprintsEnrolled?: number;
        fingerprintsCapacity?: number;
        facesEnrolled?: number;
        facesCapacity?: number;
        error?: string;
      }>('/api/refresh', { method: 'POST' });
      if (data.success) {
        this.connected = true;
        this.currentStatus = 'connected';
        this.firmware = data.firmware || this.firmware;
        this.serialNumber = data.serialNumber || this.serialNumber;
        this.userCount = data.userCount;
        this.fingerprintsEnrolled = data.fingerprintsEnrolled;
        this.fingerprintsCapacity = data.fingerprintsCapacity;
        this.facesEnrolled = data.facesEnrolled;
        this.facesCapacity = data.facesCapacity;
        this.persistLastKnownStatus();
      }
      return { success: data.success, error: data.error };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Refresh failed.' };
    }
  }

  /** Pulls any attendance punches from the device not yet delivered to gymos. */
  async synchronize(): Promise<BiometricSyncResult> {
    try {
      const data = await this.request<{ success: boolean; records?: BiometricPunchEvent[]; count?: number; error?: string }>(
        '/api/sync',
        { method: 'POST' },
        30000
      );
      return { success: data.success, records: data.records || [], count: data.count || 0, error: data.error };
    } catch (e) {
      return { success: false, records: [], count: 0, error: e instanceof Error ? e.message : 'Synchronize failed.' };
    }
  }

  /** Read-only dump of every punch the device is holding — unlike synchronize(),
   * this never advances the bridge's "last seen" cursor, so it's safe to call
   * anytime just to inspect/audit the device's full history. */
  async getDeviceAttendanceLog(): Promise<BiometricSyncResult> {
    try {
      const data = await this.request<{ success: boolean; records?: BiometricPunchEvent[]; count?: number; error?: string }>(
        '/api/attendance-log',
        undefined,
        30000
      );
      return { success: data.success, records: data.records || [], count: data.count || 0, error: data.error };
    } catch (e) {
      return { success: false, records: [], count: 0, error: e instanceof Error ? e.message : 'Could not read the device attendance log.' };
    }
  }

  /** Pulses the door relay for `seconds`. Only works if this device model has one wired. */
  async forceOpen(seconds = 3): Promise<BiometricActionResult> {
    try {
      const data = await this.request<{ success: boolean; error?: string }>(
        '/api/force-open',
        { method: 'POST', body: JSON.stringify({ seconds }) },
        10000
      );
      return data;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Force-open failed.' };
    }
  }

  /** Capture a fresh fingerprint template for a person on the device. Blocks while they scan. */
  async enrollFingerprint(person: {
    id: string;
    name: string;
    type: BiometricPersonType;
  }): Promise<BiometricEnrollResult> {
    if (!this.connected) {
      return {
        success: false,
        deviceId: this.serialNumber || 'unknown',
        timestamp: new Date().toISOString(),
        error: 'Device Bridge not connected. Open the connection before enrolling.',
      };
    }
    try {
      const data = await this.request<{ success: boolean; templateId?: string; deviceUserId?: string; error?: string }>(
        '/api/enroll',
        {
          method: 'POST',
          body: JSON.stringify({ personId: person.id, personName: person.name, personType: person.type }),
        },
        35000
      );
      return {
        success: data.success,
        templateId: data.templateId,
        deviceUserId: data.deviceUserId,
        deviceId: this.serialNumber || 'unknown',
        timestamp: new Date().toISOString(),
        error: data.error,
      };
    } catch (e) {
      return {
        success: false,
        deviceId: this.serialNumber || 'unknown',
        timestamp: new Date().toISOString(),
        error: e instanceof Error ? e.message : 'Enrollment failed.',
      };
    }
  }

  async removeEnrollment(personId: string): Promise<BiometricActionResult> {
    try {
      const data = await this.request<{ success: boolean; error?: string }>(`/api/enroll/${encodeURIComponent(personId)}`, {
        method: 'DELETE',
      });
      return data;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Removal failed.' };
    }
  }

  /** Lists every user already registered on the device, including ones enrolled
   * before gymos existed (e.g. via EasyBio), with their gymos link status if any. */
  async listDeviceUsers(): Promise<{ success: boolean; users: BiometricDeviceUser[]; error?: string }> {
    try {
      const data = await this.request<{ success: boolean; users?: BiometricDeviceUser[]; error?: string }>(
        '/api/users',
        undefined,
        20000
      );
      return { success: data.success, users: data.users || [], error: data.error };
    } catch (e) {
      return { success: false, users: [], error: e instanceof Error ? e.message : 'Could not list device users.' };
    }
  }

  /** Links an already-enrolled device user to a gymos person — no new fingerprint capture. */
  async linkDeviceUser(person: { uid: string; id: string; name: string; type: BiometricPersonType }): Promise<BiometricActionResult> {
    try {
      const data = await this.request<{ success: boolean; error?: string }>(
        '/api/link',
        {
          method: 'POST',
          body: JSON.stringify({ uid: person.uid, personId: person.id, personName: person.name, personType: person.type }),
        }
      );
      return data;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Linking failed.' };
    }
  }

  /** Pushes a membership-validity snapshot to the bridge so its live-punch
   * toast (including the native Windows notification) can show it. Cached on
   * the bridge, not a live lookup — re-push whenever it might have changed. */
  async pushValidity(personId: string, validity: BiometricValidity): Promise<BiometricActionResult> {
    try {
      const data = await this.request<{ success: boolean; error?: string }>('/api/validity', {
        method: 'POST',
        body: JSON.stringify({ personId, validity }),
      });
      return data;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Could not push validity.' };
    }
  }

  /** Subscribes to real-time punch events from the bridge (SSE). Returns an unsubscribe function. */
  subscribeLive(onEvent: (event: BiometricPunchEvent) => void, onError?: (err: string) => void): () => void {
    if (!this.validUrl()) {
      onError?.('Bridge URL must be a valid http:// or https:// address.');
      return () => {};
    }
    this.stopLiveFeed();
    try {
      const source = new EventSource(`${this.baseUrl()}/api/stream`);
      source.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as BiometricPunchEvent;
          onEvent(event);
        } catch {
          // ignore malformed frame
        }
      };
      source.onerror = () => {
        onError?.('Live punch feed disconnected. It will keep retrying.');
      };
      this.liveSource = source;
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not open live feed.');
    }
    return () => this.stopLiveFeed();
  }

  private stopLiveFeed() {
    if (this.liveSource) {
      this.liveSource.close();
      this.liveSource = null;
    }
  }

  /**
   * Manual/demo punch simulator — does NOT touch real hardware. Used by the
   * "Simulate Biometric Scan" testing UI for demo mode or when no physical
   * device is on hand. Real punches arrive via subscribeLive() instead.
   */
  async simulateScan(mockPerson?: { id: string; name: string; type: BiometricPersonType }): Promise<BiometricScanResult> {
    await new Promise((res) => setTimeout(res, 600));
    if (!mockPerson) {
      return {
        success: false,
        deviceId: 'SIMULATED',
        timestamp: new Date().toLocaleTimeString(),
        error: 'Select a person to simulate.',
      };
    }
    return {
      success: true,
      personId: mockPerson.id,
      personName: mockPerson.name,
      personType: mockPerson.type,
      confidenceScore: 98.4,
      deviceId: 'SIMULATED',
      timestamp: new Date().toLocaleTimeString(),
    };
  }
}

export const biometricBridge = new FingerprintDeviceAdapter();

export function buildEnrollment(
  person: { id: string; name: string; type: BiometricPersonType },
  result: BiometricEnrollResult
): BiometricEnrollment {
  return {
    personId: person.id,
    personName: person.name,
    personType: person.type,
    templateId: result.templateId || '',
    confidenceScore: result.confidenceScore || 100,
    enrolledAt: result.timestamp,
    deviceUserId: result.deviceUserId,
    status: 'active',
  };
}
