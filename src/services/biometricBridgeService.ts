/**
 * Biometric & Fingerprint Integration Adapter (Sections 21, 22)
 * Hardware abstraction layer:
 * AttendanceDeviceAdapter -> FingerprintDeviceAdapter
 * Supports local desktop/service bridge or USB vendor SDK/API.
 */

import { BiometricBridgeConfig, BiometricEnrollment } from '../types';
import { storageService, DEFAULT_BIOMETRIC_CONFIG } from './storageService';

export interface BiometricScanResult {
  success: boolean;
  personId?: string;
  personType?: 'trainee' | 'trainer';
  personName?: string;
  confidenceScore?: number;
  deviceId: string;
  timestamp: string;
  error?: string;
}

export interface BiometricEnrollResult {
  success: boolean;
  templateId?: string;
  confidenceScore?: number;
  deviceId: string;
  timestamp: string;
  error?: string;
}

export interface AttendanceDeviceAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): boolean;
  scanFingerprint(): Promise<BiometricScanResult>;
  getDeviceStatus(): {
    model: string;
    serialNumber: string;
    firmware: string;
    port: string;
    status: 'connected' | 'disconnected' | 'scanning' | 'error';
  };
}

export class FingerprintDeviceAdapter implements AttendanceDeviceAdapter {
  private connected: boolean = true;
  private currentStatus: 'connected' | 'disconnected' | 'scanning' | 'error' = 'connected';
  private serialNumber: string = 'SG-2026-IND-9021';
  private firmware: string = 'v4.8.2-bridge';
  private config: BiometricBridgeConfig = DEFAULT_BIOMETRIC_CONFIG;

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
    }
    return { ...this.config };
  }

  private validateUrl(): boolean {
    try {
      const url = new URL(this.config.bridgeUrl);
      return url.protocol === 'ws:' || url.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  async connect(): Promise<boolean> {
    if (!this.validateUrl()) {
      this.connected = false;
      this.currentStatus = 'error';
      return false;
    }
    // Simulate the bridge handshake latency.
    await new Promise((res) => setTimeout(res, 350));
    this.connected = true;
    this.currentStatus = 'connected';
    return true;
  }

  async disconnect(): Promise<boolean> {
    this.connected = false;
    this.currentStatus = 'disconnected';
    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getDeviceStatus() {
    return {
      model: this.config.deviceModel,
      serialNumber: this.serialNumber,
      firmware: this.firmware,
      port: this.config.bridgeUrl,
      status: this.currentStatus,
    };
  }

  async scanFingerprint(mockPerson?: { id: string; name: string; type: 'trainee' | 'trainer' }): Promise<BiometricScanResult> {
    if (!this.connected) {
      return {
        success: false,
        deviceId: this.serialNumber,
        timestamp: new Date().toLocaleTimeString(),
        error: 'Device Bridge not connected. Please check USB connection.',
      };
    }

    this.currentStatus = 'scanning';
    // Simulate biometric capture delay
    await new Promise((res) => setTimeout(res, 600));
    this.currentStatus = 'connected';

    if (mockPerson) {
      return {
        success: true,
        personId: mockPerson.id,
        personName: mockPerson.name,
        personType: mockPerson.type,
        confidenceScore: 98.4,
        deviceId: this.serialNumber,
        timestamp: new Date().toLocaleTimeString(),
      };
    }

    return {
      success: true,
      personId: 'trainee-1',
      personName: 'Rahul Malhotra',
      personType: 'trainee',
      confidenceScore: 99.1,
      deviceId: this.serialNumber,
      timestamp: new Date().toLocaleTimeString(),
    };
  }

  /** Capture a fresh fingerprint template for a person and hand it back for persistence. */
  async enrollFingerprint(person: {
    id: string;
    name: string;
    type: 'trainee' | 'trainer';
  }): Promise<BiometricEnrollResult> {
    if (!this.connected) {
      return {
        success: false,
        deviceId: this.serialNumber,
        timestamp: new Date().toISOString(),
        error: 'Device Bridge not connected. Open the connection before enrolling.',
      };
    }

    this.currentStatus = 'scanning';
    await new Promise((res) => setTimeout(res, 900));
    this.currentStatus = 'connected';

    return {
      success: true,
      templateId: `tpl-${person.type}-${person.id}-${Date.now().toString(36)}`,
      confidenceScore: 97 + Math.round(Math.random() * 25) / 10,
      deviceId: this.serialNumber,
      timestamp: new Date().toISOString(),
    };
  }
}

export const biometricBridge = new FingerprintDeviceAdapter();

export function buildEnrollment(
  person: { id: string; name: string; type: 'trainee' | 'trainer' },
  result: BiometricEnrollResult
): BiometricEnrollment {
  return {
    personId: person.id,
    personName: person.name,
    personType: person.type,
    templateId: result.templateId || '',
    confidenceScore: result.confidenceScore || 0,
    enrolledAt: result.timestamp,
  };
}
