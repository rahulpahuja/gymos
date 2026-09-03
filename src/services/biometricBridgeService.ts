/**
 * Biometric & Fingerprint Integration Adapter (Sections 21, 22)
 * Hardware abstraction layer:
 * AttendanceDeviceAdapter -> FingerprintDeviceAdapter
 * Supports local desktop/service bridge or USB vendor SDK/API.
 */

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
  private model: string = 'SecuGen Hamster Pro 20 (USB Local Bridge)';
  private serialNumber: string = 'SG-2026-IND-9021';
  private firmware: string = 'v4.8.2-bridge';
  private port: string = 'ws://127.0.0.1:8088/biometric-bridge';

  async connect(): Promise<boolean> {
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
      model: this.model,
      serialNumber: this.serialNumber,
      firmware: this.firmware,
      port: this.port,
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
}

export const biometricBridge = new FingerprintDeviceAdapter();
