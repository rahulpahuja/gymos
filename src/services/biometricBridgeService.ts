/**
 * Biometric & Fingerprint Integration Adapter (Sections 21, 22)
 * Talks over HTTP/SSE to the local `biometric-bridge` service (see
 * /biometric-bridge in the repo root), which itself speaks the native ZK
 * protocol to the ESSL fingerprint terminal. No hardware access happens in
 * the browser directly — this is a thin client for that bridge's REST API.
 */

import { BiometricBridgeConfig, BiometricEnrollment, BiometricPersonType, BiometricPunchEvent } from '../types';
import { storageService, DEFAULT_BIOMETRIC_CONFIG } from './storageService';

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
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export class FingerprintDeviceAdapter {
  private config: BiometricBridgeConfig = DEFAULT_BIOMETRIC_CONFIG;
  private connected = false;
  private currentStatus: DeviceStatus['status'] = 'disconnected';
  private firmware = '';
  private serialNumber = '';
  private userCount: number | undefined;
  private liveSource: EventSource | null = null;

  constructor() {
    try {
      this.config = storageService.getBiometricConfig();
    } catch {
      this.config = DEFAULT_BIOMETRIC_CONFIG;
    }
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

  private async request<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
    if (!this.validUrl()) {
      throw new Error('Bridge URL must be a valid http:// or https:// address.');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      });
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
      status: this.currentStatus,
    };
  }

  async connect(): Promise<boolean> {
    this.currentStatus = 'connecting';
    try {
      const data = await this.request<{
        success: boolean;
        firmware?: string;
        serialNumber?: string;
        userCount?: number;
        error?: string;
      }>('/api/status');
      if (!data.success) {
        this.connected = false;
        this.currentStatus = 'error';
        return false;
      }
      this.connected = true;
      this.currentStatus = 'connected';
      this.firmware = data.firmware || '';
      this.serialNumber = data.serialNumber || '';
      this.userCount = data.userCount;
      return true;
    } catch {
      this.connected = false;
      this.currentStatus = 'error';
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    this.connected = false;
    this.currentStatus = 'disconnected';
    this.stopLiveFeed();
    return true;
  }

  /** Re-reads device info without dropping the "configured" state. */
  async refreshDevice(): Promise<BiometricActionResult> {
    try {
      const data = await this.request<{ success: boolean; firmware?: string; serialNumber?: string; userCount?: number; error?: string }>(
        '/api/refresh',
        { method: 'POST' }
      );
      if (data.success) {
        this.connected = true;
        this.currentStatus = 'connected';
        this.firmware = data.firmware || this.firmware;
        this.serialNumber = data.serialNumber || this.serialNumber;
        this.userCount = data.userCount;
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
  };
}
