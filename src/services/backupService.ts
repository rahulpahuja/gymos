/**
 * Full data backup & restore (admin only).
 * Serializes every GymOS collection held in localStorage into a single portable
 * JSON envelope, and restores from the same shape.
 */

import { downloadJSON, fileStamp } from '../utils/exporters';
import { storageService } from './storageService';

const BACKUP_KEYS = [
  'gymos_branches_v1',
  'gymos_trainees_v1',
  'gymos_trainers_v1',
  'gymos_pt_packages_v1',
  'gymos_pt_subscriptions_v1',
  'gymos_pt_sessions_v1',
  'gymos_pt_settlements_v1',
  'gymos_payments_v1',
  'gymos_refunds_v1',
  'gymos_expenses_v1',
  'gymos_equipment_v1',
  'gymos_attendance_v1',
  'gymos_trainer_salaries_v1',
  'gymos_trainer_advances_v1',
  'gymos_enquiries_v1',
  'gymos_membership_plans_v1',
  'gymos_audit_logs_v1',
];

export interface BackupEnvelope {
  app: 'GymOS';
  version: 1;
  exportedAt: string;
  collections: Record<string, unknown>;
}

export const backupService = {
  buildBackup(): BackupEnvelope {
    const collections: Record<string, unknown> = {};
    for (const key of BACKUP_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw == null) continue;
      try {
        collections[key] = JSON.parse(raw);
      } catch {
        collections[key] = raw;
      }
    }
    return {
      app: 'GymOS',
      version: 1,
      exportedAt: new Date().toISOString(),
      collections,
    };
  },

  downloadBackup(): void {
    downloadJSON(`gymos-backup-${fileStamp()}.json`, this.buildBackup());
  },

  /** Count of records per collection, for the admin summary UI. */
  summary(): { key: string; label: string; count: number }[] {
    const envelope = this.buildBackup();
    return BACKUP_KEYS.map((key) => {
      const value = envelope.collections[key];
      return {
        key,
        label: key.replace(/^gymos_/, '').replace(/_v1$/, '').replace(/_/g, ' '),
        count: Array.isArray(value) ? value.length : value ? 1 : 0,
      };
    });
  },

  restoreBackup(envelope: BackupEnvelope): { restored: string[] } {
    if (!envelope || envelope.app !== 'GymOS' || !envelope.collections) {
      throw new Error('Invalid GymOS backup file.');
    }
    const restored: string[] = [];
    for (const [key, value] of Object.entries(envelope.collections)) {
      if (!BACKUP_KEYS.includes(key)) continue;
      localStorage.setItem(key, JSON.stringify(value));
      restored.push(key);
    }
    storageService.notify('*');
    return { restored };
  },
};
