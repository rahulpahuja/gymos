import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeTrainerSalary, statementService } from './statementService';
import { PrintService } from './printService';
import { downloadCSV } from '../utils/exporters';
import { Trainer, Trainee, PaymentTransaction, PTSubscription, PTSession, PTCommissionSettlement } from '../types';

vi.mock('./printService', () => ({
  PrintService: { printReportDocument: vi.fn() },
}));
vi.mock('../utils/exporters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/exporters')>();
  return { ...actual, downloadCSV: vi.fn() };
});

const trainer = (overrides: Partial<Trainer> = {}): Trainer => ({
  id: 't1',
  fullName: 'Amit Verma',
  photo: undefined,
  phone: '+91 90000 00000',
  email: 'amit@gymos.in',
  address: 'Indore',
  dob: '1990-01-01',
  joiningDate: '2024-01-01',
  emergencyContact: 'N/A',
  qualifications: 'ACE',
  certifications: [],
  specializations: [],
  experienceYears: 5,
  salaryType: 'monthly',
  baseSalary: 25000,
  bankAccountDetails: 'HDFC',
  branchId: 'branch-1',
  status: 'active',
  ptRevenueGenerated: 0,
  ptCommissionEarned: 0,
  ptCommissionPaid: 0,
  ptCommissionOutstanding: 0,
  salaryPayable: 25000,
  advancesOutstanding: 0,
  totalSessionsConducted: 0,
  createdAt: '2024-01-01',
  ...overrides,
});

describe('computeTrainerSalary', () => {
  it('computes outstanding commission as earned minus paid when not explicitly set', () => {
    const s = computeTrainerSalary(trainer({ ptCommissionEarned: 12000, ptCommissionPaid: 8000, ptCommissionOutstanding: undefined as any }), 12);
    expect(s.ptCommissionOutstanding).toBe(4000);
    expect(s.netPayable).toBe(25000 + 4000 - 0);
  });

  it('prefers an explicitly stored outstanding value over the derived one', () => {
    const s = computeTrainerSalary(trainer({ ptCommissionEarned: 12000, ptCommissionPaid: 8000, ptCommissionOutstanding: 999 }), 12);
    expect(s.ptCommissionOutstanding).toBe(999);
  });

  it('treats missing numeric fields as zero rather than NaN', () => {
    const s = computeTrainerSalary(
      { ...trainer(), baseSalary: undefined as any, ptCommissionEarned: undefined as any, ptCommissionPaid: undefined as any, advancesOutstanding: undefined as any },
      0
    );
    expect(s.baseSalary).toBe(0);
    expect(s.netPayable).toBe(0);
    expect(Number.isNaN(s.netPayable)).toBe(false);
  });

  it('clamps net payable at zero when advances exceed salary plus commission', () => {
    const s = computeTrainerSalary(trainer({ baseSalary: 5000, ptCommissionOutstanding: 1000, advancesOutstanding: 20000 }), 3);
    expect(s.netPayable).toBe(0);
  });

  it('passes through sessionsConducted unchanged', () => {
    expect(computeTrainerSalary(trainer(), 42).sessionsConducted).toBe(42);
  });
});

describe('statementService CSV exports', () => {
  beforeEach(() => {
    vi.mocked(downloadCSV).mockClear();
  });

  it('trainerAdvanceStatementCSV slugifies the trainer name and stamps the filename', () => {
    statementService.trainerAdvanceStatementCSV(trainer({ fullName: 'Amit  Kumar Verma' }), []);
    const [filename] = vi.mocked(downloadCSV).mock.calls[0];
    expect(filename).toMatch(/^advance-statement-amit-kumar-verma-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('trainerAdvanceStatementCSV reports settlement count and financial fields with safe zero defaults', () => {
    statementService.trainerAdvanceStatementCSV(trainer({ advancesOutstanding: undefined as any }), [{ id: 's1' } as PTCommissionSettlement]);
    const [, , rows] = vi.mocked(downloadCSV).mock.calls[0];
    const asObj = Object.fromEntries(rows as [string, unknown][]);
    expect(asObj['Advances Outstanding (INR)']).toBe(0);
    expect(asObj['Settlements Recorded']).toBe(1);
  });

  it('attendanceCSV maps every record field, defaulting missing checkout time to an empty string', () => {
    statementService.attendanceCSV(
      [{
        id: 'a1', personId: 'p1', personType: 'trainee', personName: 'X', branchId: 'branch-1',
        date: '2026-09-01', checkInTime: '07:00', checkOutTime: undefined, status: 'present',
        verificationMethod: 'fingerprint', isPTSessionAttendance: true,
      }],
      'Rahul Malhotra'
    );
    const [filename, headers, rows] = vi.mocked(downloadCSV).mock.calls[0];
    expect(filename).toMatch(/^attendance-rahul-malhotra-/);
    expect(headers).toContain('PT Session');
    expect(rows[0]).toEqual(['2026-09-01', '07:00', '', 'present', 'fingerprint', 'Yes', 'branch-1']);
  });

  it('traineePaymentsCSV falls back to allocation sub-fields when top-level amounts are absent', () => {
    const payment: PaymentTransaction = {
      id: 'p1', receiptNumber: 'REC-1', traineeId: 'tr1', traineeName: 'X', branchId: 'branch-1',
      paymentDate: '2026-09-01', paymentMethod: 'UPI', referenceNumber: 'ref',
      totalAmount: 5000, membershipAmount: undefined, ptAmount: undefined,
      allocation: { generalMembershipAmount: 2000, ptAmount: 3000 },
      discount: 0, tax: 0, previousDue: 5000, remainingDue: 0, createdBy: 'x', createdAt: '2026-09-01',
    };
    statementService.traineePaymentsCSV([payment], 'Rahul Malhotra');
    const [, , rows] = vi.mocked(downloadCSV).mock.calls[0];
    expect(rows[0]).toEqual(['REC-1', '2026-09-01', 'UPI', 2000, 3000, 5000, 'ref', 'branch-1']);
  });
});

describe('statementService PDF documents', () => {
  beforeEach(() => {
    vi.mocked(PrintService.printReportDocument).mockClear();
  });

  it('aggregates trainee payments/subscriptions correctly, and handles an empty history without throwing', () => {
    const trainee: Trainee = {
      id: 'tr1', fullName: 'Rahul Malhotra', phone: '', email: '', address: '', dob: '', gender: 'Male',
      emergencyContact: '', joiningDate: '2026-09-01', branchId: 'branch-1', totalPaid: 0, totalDue: 0,
      status: 'active', createdAt: '2026-09-01',
    };
    expect(() =>
      statementService.traineeStatementPDF(trainee, [], { mode: 'all', year: 2026, month: 0, quarter: 1, fromDate: '', toDate: '' }, [], [], [])
    ).not.toThrow();

    const config = vi.mocked(PrintService.printReportDocument).mock.calls[0][0];
    const kpiValue = (label: string) => config.kpis?.find((k) => k.label === label)?.value;
    expect(kpiValue('Total Paid')).toBe('₹0');
    expect(kpiValue('Outstanding Dues')).toBe('₹0');
  });

  it('sums membership/PT amounts across multiple payments with mixed allocation shapes', () => {
    const trainee: Trainee = {
      id: 'tr1', fullName: 'Rahul Malhotra', phone: '', email: '', address: '', dob: '', gender: 'Male',
      emergencyContact: '', joiningDate: '2026-09-01', branchId: 'branch-1', totalPaid: 0, totalDue: 0,
      status: 'active', createdAt: '2026-09-01',
    };
    const payments: PaymentTransaction[] = [
      { id: 'p1', receiptNumber: 'R1', traineeId: 'tr1', traineeName: 'X', branchId: 'branch-1', paymentDate: '2026-09-01', paymentMethod: 'UPI', referenceNumber: '', totalAmount: 20000, membershipAmount: 12000, ptAmount: 8000, allocation: { generalMembershipAmount: 12000, ptAmount: 8000 }, discount: 0, tax: 0, previousDue: 20000, remainingDue: 0, createdBy: 'x', createdAt: '2026-09-01' },
      { id: 'p2', receiptNumber: 'R2', traineeId: 'tr1', traineeName: 'X', branchId: 'branch-1', paymentDate: '2026-09-02', paymentMethod: 'Card', referenceNumber: '', totalAmount: 7000, allocation: { generalMembershipAmount: 0, ptAmount: 7000 }, discount: 0, tax: 0, previousDue: 7000, remainingDue: 0, createdBy: 'x', createdAt: '2026-09-02' },
    ];
    const subs: PTSubscription[] = [{ dueAmount: 3000 } as PTSubscription];
    const sessions: PTSession[] = [{ status: 'completed' } as PTSession, { status: 'scheduled' } as PTSession];

    statementService.traineeStatementPDF(trainee, [], { mode: 'all', year: 2026, month: 0, quarter: 1, fromDate: '', toDate: '' }, payments, subs, sessions);

    const config = vi.mocked(PrintService.printReportDocument).mock.calls[0][0];
    const kpiValue = (label: string) => config.kpis?.find((k) => k.label === label)?.value;
    expect(kpiValue('Total Paid')).toBe('₹27,000');
    expect(kpiValue('Membership')).toBe('₹12,000');
    expect(kpiValue('Personal Training')).toBe('₹15,000');
    expect(kpiValue('Outstanding Dues')).toBe('₹3,000');
    expect(kpiValue('PT Sessions Completed')).toBe('1');
  });
});
