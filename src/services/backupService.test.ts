import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backupService, BackupEnvelope } from './backupService';
import { downloadJSON } from '../utils/exporters';
import { storageService } from './storageService';

vi.mock('../utils/exporters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/exporters')>();
  return { ...actual, downloadJSON: vi.fn() };
});

describe('backupService.buildBackup', () => {
  it('includes only known GymOS keys and parses their JSON content', () => {
    localStorage.setItem('gymos_branches_v1', JSON.stringify([{ id: 'b1' }]));
    const envelope = backupService.buildBackup();
    expect(envelope.app).toBe('GymOS');
    expect(envelope.version).toBe(1);
    expect(envelope.collections['gymos_branches_v1']).toEqual([{ id: 'b1' }]);
  });

  it('omits keys that were never set, rather than including null placeholders', () => {
    const envelope = backupService.buildBackup();
    expect('gymos_branches_v1' in envelope.collections).toBe(false);
  });

  it('falls back to the raw string when a stored value is not valid JSON, instead of throwing', () => {
    localStorage.setItem('gymos_expenses_v1', 'not-json{{{');
    const envelope = backupService.buildBackup();
    expect(envelope.collections['gymos_expenses_v1']).toBe('not-json{{{');
  });

  it('never includes the logged-in user record (not part of the whitelisted backup keys)', () => {
    localStorage.setItem('gymos_current_user_v1', JSON.stringify({ role: 'admin' }));
    const envelope = backupService.buildBackup();
    expect(envelope.collections['gymos_current_user_v1']).toBeUndefined();
  });
});

describe('backupService.downloadBackup', () => {
  it('downloads a JSON file named with today\'s date stamp', () => {
    backupService.downloadBackup();
    expect(vi.mocked(downloadJSON).mock.calls[0][0]).toMatch(/^gymos-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('backupService.summary', () => {
  it('reports zero counts and human-readable labels for empty collections', () => {
    const summary = backupService.summary();
    const branches = summary.find((s) => s.key === 'gymos_branches_v1')!;
    expect(branches.count).toBe(0);
    expect(branches.label).toBe('branches');
  });

  it('reports array length for populated collections', () => {
    localStorage.setItem('gymos_trainees_v1', JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]));
    const summary = backupService.summary();
    expect(summary.find((s) => s.key === 'gymos_trainees_v1')!.count).toBe(3);
  });
});

describe('backupService.restoreBackup', () => {
  beforeEach(() => {
    vi.spyOn(storageService, 'notify');
  });

  it('rejects an envelope with the wrong app marker', () => {
    expect(() => backupService.restoreBackup({ app: 'NotGymOS' } as unknown as BackupEnvelope)).toThrow(
      /Invalid GymOS backup file/
    );
  });

  it('rejects a null/undefined envelope', () => {
    expect(() => backupService.restoreBackup(null as unknown as BackupEnvelope)).toThrow();
  });

  it('rejects an envelope missing the collections object', () => {
    expect(() =>
      backupService.restoreBackup({ app: 'GymOS', version: 1 } as unknown as BackupEnvelope)
    ).toThrow();
  });

  it('restores only whitelisted keys and reports exactly what it wrote', () => {
    const { restored } = backupService.restoreBackup({
      app: 'GymOS',
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      collections: { gymos_trainees_v1: [{ id: 't1' }] },
    });
    expect(restored).toEqual(['gymos_trainees_v1']);
    expect(JSON.parse(localStorage.getItem('gymos_trainees_v1')!)).toEqual([{ id: 't1' }]);
  });

  describe('security: restore-time key whitelisting', () => {
    it('silently drops any key not in the known backup key list, rather than writing it verbatim', () => {
      const { restored } = backupService.restoreBackup({
        app: 'GymOS',
        version: 1,
        exportedAt: 'x',
        collections: { some_unexpected_key: { evil: true } },
      });
      expect(restored).toEqual([]);
      expect(localStorage.getItem('some_unexpected_key')).toBeNull();
    });

    it('cannot be used to overwrite the current user session via a crafted backup file', () => {
      localStorage.setItem('gymos_current_user_v1', JSON.stringify({ role: 'admin', branchId: 'all' }));
      backupService.restoreBackup({
        app: 'GymOS',
        version: 1,
        exportedAt: 'x',
        collections: { gymos_current_user_v1: { role: 'attacker', branchId: 'all' } },
      });
      expect(JSON.parse(localStorage.getItem('gymos_current_user_v1')!).role).toBe('admin');
    });

    it('cannot be used to inject a __proto__ key (prototype pollution guard)', () => {
      const { restored } = backupService.restoreBackup({
        app: 'GymOS',
        version: 1,
        exportedAt: 'x',
        collections: JSON.parse('{"__proto__": {"polluted": true}}'),
      });
      expect(restored).toEqual([]);
      expect(({} as any).polluted).toBeUndefined();
    });

    it('notifies subscribers exactly once after a restore so the UI refreshes', () => {
      backupService.restoreBackup({ app: 'GymOS', version: 1, exportedAt: 'x', collections: {} });
      expect(storageService.notify).toHaveBeenCalledWith('*');
      expect(storageService.notify).toHaveBeenCalledTimes(1);
    });
  });
});
