import { describe, expect, it } from 'vitest';
import { storageService, DEFAULT_BIOMETRIC_CONFIG } from './storageService';
import { Trainee, Trainer, PaymentTransaction, PTSubscription, PTSession, PTCommissionSettlement, RefundRecord, Enquiry } from '../types';

const trainee = (overrides: Partial<Trainee> = {}): Trainee => ({
  id: 'tr1', fullName: 'Rahul Malhotra', phone: '9000000000', email: 'r@x.com', address: 'x',
  dob: '1990-01-01', gender: 'Male', emergencyContact: 'x', joiningDate: '2026-09-01',
  branchId: 'branch-1', totalPaid: 0, totalDue: 5000, status: 'active', createdAt: '2026-09-01',
  ...overrides,
});

const trainer = (overrides: Partial<Trainer> = {}): Trainer => ({
  id: 'tn1', fullName: 'Amit Verma', phone: '', email: '', address: '', dob: '', joiningDate: '',
  emergencyContact: '', qualifications: '', certifications: [], specializations: [], experienceYears: 1,
  salaryType: 'monthly', baseSalary: 25000, bankAccountDetails: '', branchId: 'branch-1', status: 'active',
  ptRevenueGenerated: 0, ptCommissionEarned: 12000, ptCommissionPaid: 0, ptCommissionOutstanding: 12000,
  salaryPayable: 25000, advancesOutstanding: 0, totalSessionsConducted: 0, createdAt: '',
  ...overrides,
});

describe('storageService.getCurrentUser', () => {
  it('defaults to the super-admin fallback when no user has been persisted', () => {
    const user = storageService.getCurrentUser();
    expect(user.role).toBe('admin');
    expect(user.branchId).toBe('all');
  });

  it('round-trips a persisted user', () => {
    storageService.setCurrentUser({ id: 'u1', name: 'Manager', email: 'm@x.com', role: 'manager', branchId: 'branch-1' });
    expect(storageService.getCurrentUser()).toMatchObject({ id: 'u1', role: 'manager', branchId: 'branch-1' });
  });

  it('resilience: falls back to the default user instead of throwing when localStorage holds corrupted JSON', () => {
    localStorage.setItem('gymos_current_user_v1', '{not-valid-json');
    expect(() => storageService.getCurrentUser()).not.toThrow();
    expect(storageService.getCurrentUser().role).toBe('admin');
  });
});

describe('storageService.resetToDefaults / clearOperationalData', () => {
  it('resetToDefaults seeds every operational collection with valid, non-empty data', () => {
    storageService.resetToDefaults();
    expect(storageService.getBranches().length).toBeGreaterThan(0);
    expect(storageService.getTrainees().length).toBeGreaterThan(0);
    expect(storageService.getTrainers().length).toBeGreaterThan(0);
    expect(storageService.getPaymentTransactions().length).toBeGreaterThan(0);
    expect(storageService.getRefunds()).toEqual([]);
  });

  it('clearOperationalData empties every operational collection', () => {
    storageService.resetToDefaults();
    storageService.clearOperationalData();
    expect(storageService.getBranches()).toEqual([]);
    expect(storageService.getTrainees()).toEqual([]);
    expect(storageService.getPaymentTransactions()).toEqual([]);
  });

  it('clearOperationalData does not log the operator out (current user key untouched)', () => {
    storageService.setCurrentUser({ id: 'u1', name: 'Manager', email: 'm@x.com', role: 'manager', branchId: 'branch-1' });
    storageService.clearOperationalData();
    expect(storageService.getCurrentUser().id).toBe('u1');
  });
});

describe('storageService pub/sub (subscribe/notify)', () => {
  it('invokes a key-specific listener when that exact key is written, and not for a different key', () => {
    let traineeCalls = 0;
    let trainerCalls = 0;
    const unsub1 = storageService.subscribe('gymos_trainees_v1', () => { traineeCalls++; });
    const unsub2 = storageService.subscribe('gymos_trainers_v1', () => { trainerCalls++; });
    storageService.saveTrainee(trainee());
    unsub1();
    unsub2();
    expect(traineeCalls).toBe(1);
    expect(trainerCalls).toBe(0);
  });

  it('invokes global ("*") listeners on every write, regardless of key', () => {
    let calls = 0;
    const unsub = storageService.subscribe('*', () => { calls++; });
    // { silent: true } isolates this from the (separately tested) audit-log
    // write each of these methods also makes, which would otherwise double
    // the notification count and couple this test to that unrelated detail.
    storageService.saveTrainee(trainee(), { silent: true });
    storageService.saveTrainer(trainer(), { silent: true });
    unsub();
    expect(calls).toBe(2);
  });

  it('the returned unsubscribe function removes only that listener, leaving others intact', () => {
    let a = 0;
    let b = 0;
    const unsubA = storageService.subscribe('gymos_trainees_v1', () => { a++; });
    const unsubB = storageService.subscribe('gymos_trainees_v1', () => { b++; });
    unsubA();
    storageService.saveTrainee(trainee());
    unsubB();
    expect(a).toBe(0);
    expect(b).toBe(1);
  });
});

describe('storageService theme preference', () => {
  it('defaults to light when unset, and falls back to light for a tampered/garbage value', () => {
    expect(storageService.getThemePreference()).toBe('light');
    localStorage.setItem('fitos_theme', 'not-a-real-theme');
    expect(storageService.getThemePreference()).toBe('light');
  });

  it('round-trips dark mode', () => {
    storageService.setThemePreference('dark');
    expect(storageService.getThemePreference()).toBe('dark');
  });
});

describe('storageService biometric config', () => {
  it('returns the built-in default when nothing has been saved', () => {
    expect(storageService.getBiometricConfig()).toEqual(DEFAULT_BIOMETRIC_CONFIG);
  });

  it('merges a partial saved config over the defaults rather than replacing it wholesale', () => {
    storageService.saveBiometricConfig({ ...DEFAULT_BIOMETRIC_CONFIG, bridgeUrl: 'https://192.168.1.50:8090' });
    const cfg = storageService.getBiometricConfig();
    expect(cfg.bridgeUrl).toBe('https://192.168.1.50:8090');
    expect(cfg.deviceModel).toBe(DEFAULT_BIOMETRIC_CONFIG.deviceModel);
  });
});

describe('storageService.getTrainers (read-time normalization)', () => {
  it('derives ptCommissionOutstanding from earned-minus-paid when the stored record omits it', () => {
    storageService.saveTrainer({ ...trainer(), ptCommissionEarned: 12000, ptCommissionPaid: 8000, ptCommissionOutstanding: undefined as any });
    expect(storageService.getTrainers()[0].ptCommissionOutstanding).toBe(4000);
  });

  it('treats missing numeric financial fields as zero rather than undefined/NaN', () => {
    storageService.saveTrainer({ ...trainer(), baseSalary: undefined as any, ptCommissionEarned: undefined as any, ptCommissionPaid: undefined as any });
    const t = storageService.getTrainers()[0];
    expect(t.baseSalary).toBe(0);
    expect(t.ptCommissionEarned).toBe(0);
    expect(Number.isNaN(t.ptCommissionOutstanding)).toBe(false);
  });
});

describe('storageService.recordPayment', () => {
  it('increases the trainee\'s totalPaid and decreases totalDue by the payment amount, clamped at zero', () => {
    storageService.saveTrainee(trainee({ totalPaid: 1000, totalDue: 3000 }));
    storageService.recordPayment({
      id: 'pay1', receiptNumber: 'R1', traineeId: 'tr1', traineeName: 'Rahul Malhotra', branchId: 'branch-1',
      paymentDate: '2026-09-05', paymentMethod: 'UPI', referenceNumber: '', totalAmount: 5000,
      allocation: { generalMembershipAmount: 5000, ptAmount: 0 }, discount: 0, tax: 0, previousDue: 3000,
      remainingDue: 0, createdBy: 'admin', createdAt: '2026-09-05',
    });
    const updated = storageService.getTrainees().find((t) => t.id === 'tr1')!;
    expect(updated.totalPaid).toBe(6000);
    expect(updated.totalDue).toBe(0); // clamped, not -2000
  });

  it('applies a PT-allocated payment to the linked subscription\'s paid/due amounts', () => {
    storageService.saveTrainee(trainee());
    storageService.savePTSubscription({
      id: 'sub1', traineeId: 'tr1', traineeName: 'Rahul Malhotra', trainerId: 'tn1', trainerName: 'Amit',
      packageId: 'pkg1', packageName: 'PT Standard', branchId: 'branch-1', startDate: '2026-09-01',
      expiryDate: '2026-10-01', totalSessions: 20, completedSessions: 0, remainingSessions: 20,
      cancelledSessions: 0, noShowSessions: 0, packagePrice: 15000, discount: 0, netPrice: 15000,
      paidAmount: 5000, dueAmount: 10000, revenueRule: { model: 'percentage', trainerPercent: 60, discountPolicy: 'net_price', refundPolicy: 'proportional' },
      trainerCommissionTotal: 9000, trainerCommissionEarned: 0, trainerCommissionPaid: 0, trainerCommissionOutstanding: 0,
      branchShare: 6000, status: 'active', history: [], createdAt: '', updatedAt: '',
    });

    storageService.recordPayment({
      id: 'pay1', receiptNumber: 'R1', traineeId: 'tr1', traineeName: 'Rahul Malhotra', branchId: 'branch-1',
      paymentDate: '2026-09-05', paymentMethod: 'UPI', referenceNumber: '', totalAmount: 7000,
      ptSubscriptionId: 'sub1', allocation: { generalMembershipAmount: 0, ptAmount: 7000 }, discount: 0, tax: 0,
      previousDue: 10000, remainingDue: 3000, createdBy: 'admin', createdAt: '2026-09-05',
    });

    const sub = storageService.getPTSubscriptions().find((s) => s.id === 'sub1')!;
    expect(sub.paidAmount).toBe(12000);
    expect(sub.dueAmount).toBe(3000);
  });

  it('does not touch any subscription when the payment has no PT allocation', () => {
    storageService.savePTSubscription({
      id: 'sub1', traineeId: 'tr1', traineeName: 'x', trainerId: 'tn1', trainerName: 'x', packageId: 'p',
      packageName: 'p', branchId: 'branch-1', startDate: '', expiryDate: '', totalSessions: 10,
      completedSessions: 0, remainingSessions: 10, cancelledSessions: 0, noShowSessions: 0, packagePrice: 8000,
      discount: 0, netPrice: 8000, paidAmount: 2000, dueAmount: 6000,
      revenueRule: { model: 'percentage', discountPolicy: 'net_price', refundPolicy: 'proportional' },
      trainerCommissionTotal: 0, trainerCommissionEarned: 0, trainerCommissionPaid: 0, trainerCommissionOutstanding: 0,
      branchShare: 0, status: 'active', history: [], createdAt: '', updatedAt: '',
    });
    storageService.saveTrainee(trainee());
    storageService.recordPayment({
      id: 'pay1', receiptNumber: 'R1', traineeId: 'tr1', traineeName: 'x', branchId: 'branch-1',
      paymentDate: '', paymentMethod: 'Cash', referenceNumber: '', totalAmount: 1000,
      allocation: { generalMembershipAmount: 1000, ptAmount: 0 }, discount: 0, tax: 0, previousDue: 0,
      remainingDue: 0, createdBy: '', createdAt: '',
    });
    expect(storageService.getPTSubscriptions().find((s) => s.id === 'sub1')!.paidAmount).toBe(2000);
  });
});

describe('storageService.recordSettlement', () => {
  it('increments the trainer\'s commission paid and recomputes outstanding', () => {
    storageService.saveTrainer(trainer({ ptCommissionEarned: 12000, ptCommissionPaid: 4000, ptCommissionOutstanding: 8000 }));
    storageService.recordSettlement({
      id: 'set1', settlementNumber: 'S1', trainerId: 'tn1', trainerName: 'Amit Verma', branchId: 'branch-1',
      amount: 3000, settlementDate: '2026-09-05', paymentMethod: 'upi', referenceNumber: '', approvedBy: '',
      notes: '', createdAt: '2026-09-05',
    });
    const t = storageService.getTrainers().find((x) => x.id === 'tn1')!;
    expect(t.ptCommissionPaid).toBe(7000);
    expect(t.ptCommissionOutstanding).toBe(5000);
  });

  it('never lets outstanding go negative even if settlements over-pay the earned amount', () => {
    storageService.saveTrainer(trainer({ ptCommissionEarned: 5000, ptCommissionPaid: 4000, ptCommissionOutstanding: 1000 }));
    storageService.recordSettlement({
      id: 'set1', settlementNumber: 'S1', trainerId: 'tn1', trainerName: 'Amit Verma', branchId: 'branch-1',
      amount: 5000, settlementDate: '', paymentMethod: 'cash', referenceNumber: '', approvedBy: '', notes: '', createdAt: '',
    });
    expect(storageService.getTrainers().find((x) => x.id === 'tn1')!.ptCommissionOutstanding).toBe(0);
  });
});

describe('storageService.recordRefund', () => {
  it('marks the originating payment as refunded and accumulates the refunded amount', () => {
    storageService.recordPayment({
      id: 'pay1', receiptNumber: 'R1', traineeId: 'tr1', traineeName: 'x', branchId: 'branch-1',
      paymentDate: '', paymentMethod: 'Cash', referenceNumber: '', totalAmount: 5000,
      allocation: { generalMembershipAmount: 5000, ptAmount: 0 }, discount: 0, tax: 0, previousDue: 0,
      remainingDue: 0, createdBy: '', createdAt: '',
    });
    storageService.recordRefund({
      id: 'ref1', paymentId: 'pay1', receiptNumber: 'R1', traineeId: 'tr1', traineeName: 'x',
      branchId: 'branch-1', refundType: 'general', amount: 2000, reason: 'Membership cancelled',
      refundDate: '2026-09-05', paymentMethod: 'Cash', approvedBy: 'admin', createdAt: '2026-09-05',
    });
    const pay = storageService.getPayments().find((p) => p.id === 'pay1')!;
    expect(pay.isRefunded).toBe(true);
    expect(pay.refundedAmount).toBe(2000);
  });
});

describe('storageService.recalculateSubscriptionSessions', () => {
  const baseSub: PTSubscription = {
    id: 'sub1', traineeId: 'tr1', traineeName: 'x', trainerId: 'tn1', trainerName: 'x', packageId: 'p',
    packageName: 'p', branchId: 'branch-1', startDate: '', expiryDate: '', totalSessions: 3,
    completedSessions: 0, remainingSessions: 3, cancelledSessions: 0, noShowSessions: 0, packagePrice: 3000,
    discount: 0, netPrice: 3000, paidAmount: 3000, dueAmount: 0,
    revenueRule: { model: 'percentage', discountPolicy: 'net_price', refundPolicy: 'proportional' },
    trainerCommissionTotal: 0, trainerCommissionEarned: 0, trainerCommissionPaid: 0, trainerCommissionOutstanding: 0,
    branchShare: 0, status: 'active', history: [], createdAt: '', updatedAt: '',
  };

  const session = (overrides: Partial<PTSession>): PTSession => ({
    id: overrides.id || 's', subscriptionId: 'sub1', traineeId: 'tr1', traineeName: 'x', trainerId: 'tn1',
    trainerName: 'x', branchId: 'branch-1', scheduledDate: '', startTime: '', endTime: '',
    status: 'completed', createdBy: '', createdAt: '', ...overrides,
  });

  it('counts completed/cancelled/no-show sessions and derives remaining sessions', () => {
    storageService.savePTSubscription(baseSub);
    storageService.savePTSession(session({ id: 's1', status: 'completed' }));
    storageService.savePTSession(session({ id: 's2', status: 'no_show' }));
    const sub = storageService.getPTSubscriptions().find((s) => s.id === 'sub1')!;
    expect(sub.completedSessions).toBe(1);
    expect(sub.noShowSessions).toBe(1);
    expect(sub.remainingSessions).toBe(1); // 3 total - 1 completed - 1 no-show
  });

  it('marks the subscription completed once every session is used up, and never goes negative', () => {
    storageService.savePTSubscription({ ...baseSub, totalSessions: 1 });
    storageService.savePTSession(session({ id: 's1', status: 'completed' }));
    storageService.savePTSession(session({ id: 's2', status: 'completed' })); // extra beyond totalSessions
    const sub = storageService.getPTSubscriptions().find((s) => s.id === 'sub1')!;
    expect(sub.remainingSessions).toBe(0);
    expect(sub.status).toBe('completed');
  });
});

describe('storageService.getReceiptByNumber', () => {
  it('returns null for an unknown receipt number', () => {
    expect(storageService.getReceiptByNumber('NOPE')).toBeNull();
  });

  it('includes only the payment components actually collected (no zero-amount line items)', () => {
    storageService.resetToDefaults();
    storageService.recordPayment({
      id: 'pay-x', receiptNumber: 'REC-X', traineeId: 'trainee-1', traineeName: 'Rahul Malhotra',
      branchId: 'branch-1', paymentDate: '2026-09-05', paymentMethod: 'UPI', referenceNumber: '',
      totalAmount: 8000, allocation: { generalMembershipAmount: 0, ptAmount: 8000 }, discount: 0, tax: 0,
      previousDue: 8000, remainingDue: 0, createdBy: 'admin', createdAt: '2026-09-05',
    });
    const receipt = storageService.getReceiptByNumber('REC-X')!;
    expect(receipt).not.toBeNull();
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0].category).toBe('Personal Training');
  });
});

describe('storageService.logAudit', () => {
  it('caps the audit log at 200 entries, dropping the oldest', () => {
    for (let i = 0; i < 201; i++) {
      storageService.logAudit('Action', 'Entity', `id-${i}`, 'branch-1', `details ${i}`);
    }
    const logs = storageService.getAuditLogs();
    expect(logs.length).toBe(200);
    expect(logs[0].details).toBe('details 200'); // newest first
    expect(logs.some((l) => l.details === 'details 0')).toBe(false); // oldest dropped
  });
});

describe('storageService.recordBiometricPunch (regression: attendance tracking)', () => {
  const punch = (overrides: Partial<Parameters<typeof storageService.recordBiometricPunch>[0]> = {}) => ({
    personId: 'trainee-1',
    personName: 'Rahul Malhotra',
    personType: 'trainee' as const,
    timestamp: '2026-09-05T07:00:00.000Z',
    punchType: 0,
    ...overrides,
  });

  it('a check-in punch (punchType 0) creates a new present record with checkInTime set', () => {
    const rec = storageService.recordBiometricPunch(punch());
    expect(rec.checkInTime).not.toBe('');
    expect(rec.checkOutTime).toBeUndefined();
    expect(rec.status).toBe('present');
    expect(rec.verificationMethod).toBe('fingerprint');
    expect(storageService.getAttendance()).toHaveLength(1);
  });

  it('a check-out punch (punchType 1) for the same day fills in checkOutTime on the existing visit instead of creating a second row', () => {
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T07:00:00.000Z', punchType: 0 }));
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T08:15:00.000Z', punchType: 1 }));

    const records = storageService.getAttendance();
    expect(records).toHaveLength(1); // regression: used to create a duplicate row per punch
    expect(records[0].checkInTime).not.toBe('');
    expect(records[0].checkOutTime).not.toBe('');
    expect(records[0].checkOutTime).not.toBe(records[0].checkInTime);
  });

  it('a repeat check-in punch the same day does not overwrite the original entry time or duplicate the row', () => {
    const first = storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T07:00:00.000Z', punchType: 0 }));
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T07:05:00.000Z', punchType: 0 }));

    const records = storageService.getAttendance();
    expect(records).toHaveLength(1);
    expect(records[0].checkInTime).toBe(first.checkInTime);
  });

  it('a check-out with no prior check-in on record still captures the visit rather than dropping it', () => {
    const rec = storageService.recordBiometricPunch(punch({ punchType: 1 }));
    expect(rec.checkInTime).toBe('');
    expect(rec.checkOutTime).not.toBe('');
    expect(storageService.getAttendance()).toHaveLength(1);
  });

  it('punches on different days create separate visit records', () => {
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T07:00:00.000Z' }));
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-06T07:00:00.000Z' }));
    expect(storageService.getAttendance()).toHaveLength(2);
  });

  it('a second check-out the same day does not clobber the first recorded checkout time', () => {
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T07:00:00.000Z', punchType: 0 }));
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T08:00:00.000Z', punchType: 1 }));
    storageService.recordBiometricPunch(punch({ timestamp: '2026-09-05T20:00:00.000Z', punchType: 1 }));

    const records = storageService.getAttendance();
    expect(records).toHaveLength(1);
    expect(records[0].checkOutTime).toBe(
      new Date('2026-09-05T08:00:00.000Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  });
});

describe('storageService biometric last-known status (regression: bridge looks disconnected after refresh)', () => {
  it('returns null when nothing has been persisted yet', () => {
    expect(storageService.getBiometricLastStatus()).toBeNull();
  });

  it('round-trips a saved status snapshot', () => {
    storageService.saveBiometricLastStatus({
      bridgeUrl: 'https://127.0.0.1:8090',
      connected: true,
      firmware: '1.2',
      serialNumber: 'SN1',
      userCount: 5,
      checkedAt: '2026-09-05T00:00:00.000Z',
    });
    expect(storageService.getBiometricLastStatus()).toMatchObject({ connected: true, firmware: '1.2', userCount: 5 });
  });
});

describe('audit trail coverage (every meaningful activity must be logged)', () => {
  const lastAction = () => storageService.getAuditLogs()[0];

  it('logs Trainer Added / Trainer Updated on saveTrainer, distinguishing create from edit', () => {
    storageService.saveTrainer(trainer());
    expect(lastAction().action).toBe('Trainer Added');
    storageService.saveTrainer(trainer({ fullName: 'Amit V.' }));
    expect(lastAction().action).toBe('Trainer Updated');
  });

  it('suppresses the Trainer entry when saveTrainer is called with { silent: true } (cascading update)', () => {
    const before = storageService.getAuditLogs().length;
    storageService.saveTrainer(trainer(), { silent: true });
    expect(storageService.getAuditLogs().length).toBe(before);
  });

  it('logs Trainee Added / Trainee Updated on saveTrainee', () => {
    storageService.saveTrainee(trainee());
    expect(lastAction().action).toBe('Trainee Added');
    storageService.saveTrainee(trainee({ fullName: 'Rahul M.' }));
    expect(lastAction().action).toBe('Trainee Updated');
  });

  it('does not double-log a trainee update that is only a cascading side-effect of recording a payment', () => {
    storageService.saveTrainee(trainee());
    const before = storageService.getAuditLogs().length;
    storageService.recordPayment({
      id: 'pay-x', receiptNumber: 'R1', traineeId: 'tr1', traineeName: 'x', branchId: 'branch-1',
      paymentDate: '', paymentMethod: 'Cash', referenceNumber: '', totalAmount: 500,
      allocation: { generalMembershipAmount: 500, ptAmount: 0 }, discount: 0, tax: 0, previousDue: 0,
      remainingDue: 0, createdBy: '', createdAt: '',
    });
    const after = storageService.getAuditLogs();
    // Exactly one new entry — "Payment Recorded" — not a second "Trainee Updated" for the cascading totals bump.
    expect(after.length).toBe(before + 1);
    expect(after[0].action).toBe('Payment Recorded');
  });

  it('logs PT Subscription Assigned on a genuine new subscription, but not for internal recalculation/commission cascades', () => {
    const sub: PTSubscription = {
      id: 'sub-x', traineeId: 'tr1', traineeName: 'x', trainerId: 'tn1', trainerName: 'x', packageId: 'p',
      packageName: 'PT Basic', branchId: 'branch-1', startDate: '', expiryDate: '', totalSessions: 5,
      completedSessions: 0, remainingSessions: 5, cancelledSessions: 0, noShowSessions: 0, packagePrice: 5000,
      discount: 0, netPrice: 5000, paidAmount: 0, dueAmount: 5000,
      revenueRule: { model: 'percentage', discountPolicy: 'net_price', refundPolicy: 'proportional' },
      trainerCommissionTotal: 0, trainerCommissionEarned: 0, trainerCommissionPaid: 0, trainerCommissionOutstanding: 0,
      branchShare: 0, status: 'active', history: [], createdAt: '', updatedAt: '',
    };
    storageService.savePTSubscription(sub);
    expect(lastAction().action).toBe('PT Subscription Assigned');

    const before = storageService.getAuditLogs().length;
    storageService.recalculateSubscriptionSessions('sub-x');
    expect(storageService.getAuditLogs().length).toBe(before); // silent cascade, no duplicate entry
  });

  it('logs a status-specific action for every PT session save', () => {
    storageService.savePTSession({
      id: 's1', subscriptionId: 'sub-x', traineeId: 'tr1', traineeName: 'x', trainerId: 'tn1', trainerName: 'x',
      branchId: 'branch-1', scheduledDate: '2026-09-05', startTime: '', endTime: '', status: 'completed',
      createdBy: '', createdAt: '',
    });
    expect(lastAction().action).toBe('PT Session completed');
  });

  it('logs Enquiry Logged for a new enquiry and a status-specific action for updates', () => {
    const enquiry: Enquiry = {
      id: 'enq-x', name: 'X', phone: '', email: '', age: 20, gender: 'Male', interestedPlan: '',
      source: 'Walk-in', assignedStaff: '', branchId: 'branch-1', enquiryDate: '', followUpDate: '',
      status: 'new', notes: '', createdAt: '',
    };
    storageService.saveEnquiry(enquiry);
    expect(lastAction().action).toBe('Enquiry Logged');
    storageService.saveEnquiry({ ...enquiry, status: 'converted' });
    expect(lastAction().action).toBe('Enquiry converted');
  });

  it('logs a biometric enrollment add/disable, resolving the branch from the linked trainee', () => {
    storageService.saveTrainee(trainee({ branchId: 'branch-2' }), { silent: true });
    storageService.saveBiometricEnrollment({
      personId: 'tr1', personName: 'Rahul Malhotra', personType: 'trainee', templateId: 't1',
      confidenceScore: 99, enrolledAt: '2026-09-01', status: 'active',
    });
    expect(lastAction().action).toBe('Biometric Enrollment Added');
    expect(lastAction().branchId).toBe('branch-2');

    storageService.saveBiometricEnrollment({
      personId: 'tr1', personName: 'Rahul Malhotra', personType: 'trainee', templateId: 't1',
      confidenceScore: 99, enrolledAt: '2026-09-01', status: 'disabled',
    });
    expect(lastAction().action).toBe('Biometric Access Disabled');
  });

  it('logs biometric enrollment removal, and does nothing if the person was never enrolled', () => {
    storageService.saveBiometricEnrollment({
      personId: 'tr1', personName: 'X', personType: 'trainee', templateId: 't1', confidenceScore: 99,
      enrolledAt: '', status: 'active',
    });
    storageService.deleteBiometricEnrollment('tr1');
    expect(lastAction().action).toBe('Biometric Enrollment Removed');

    const before = storageService.getAuditLogs().length;
    storageService.deleteBiometricEnrollment('never-enrolled');
    expect(storageService.getAuditLogs().length).toBe(before);
  });

  it('logs a biometric bridge config change only when the address/model actually changes, not on repeat saves of the same value', () => {
    storageService.saveBiometricConfig({ bridgeUrl: 'https://10.0.0.5:8090', deviceModel: 'ESSL', autoTurnstile: true });
    expect(lastAction().action).toBe('Biometric Bridge Configured');

    const before = storageService.getAuditLogs().length;
    storageService.saveBiometricConfig({ bridgeUrl: 'https://10.0.0.5:8090', deviceModel: 'ESSL', autoTurnstile: false });
    expect(storageService.getAuditLogs().length).toBe(before); // only autoTurnstile changed, not address/model
  });
});
