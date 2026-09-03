/**
 * Self-service statement generation for trainers and trainees.
 * PDF documents reuse the audited PrintService layout; raw data downloads use CSV.
 */

import {
  Trainer,
  Trainee,
  Branch,
  PTSession,
  PTSubscription,
  PTCommissionSettlement,
  PaymentTransaction,
  AttendanceRecord,
} from '../types';
import { PrintService } from './printService';
import { PeriodState, periodLabel } from '../utils/period';
import { downloadCSV, fileStamp, rupee } from '../utils/exporters';

const branchName = (branches: Branch[], branchId: string): string =>
  branches.find((b) => b.id === branchId)?.name || branchId || 'All Branches';

export interface TrainerSalaryBreakdown {
  baseSalary: number;
  ptCommissionEarned: number;
  ptCommissionPaid: number;
  ptCommissionOutstanding: number;
  advancesOutstanding: number;
  sessionsConducted: number;
  netPayable: number;
}

export function computeTrainerSalary(
  trainer: Trainer,
  sessionsConducted: number,
): TrainerSalaryBreakdown {
  const baseSalary = trainer.baseSalary || 0;
  const ptCommissionEarned = trainer.ptCommissionEarned || 0;
  const ptCommissionPaid = trainer.ptCommissionPaid || 0;
  const ptCommissionOutstanding =
    trainer.ptCommissionOutstanding ?? Math.max(0, ptCommissionEarned - ptCommissionPaid);
  const advancesOutstanding = trainer.advancesOutstanding || 0;
  return {
    baseSalary,
    ptCommissionEarned,
    ptCommissionPaid,
    ptCommissionOutstanding,
    advancesOutstanding,
    sessionsConducted,
    netPayable: Math.max(0, baseSalary + ptCommissionOutstanding - advancesOutstanding),
  };
}

export const statementService = {
  trainerSalaryStatementPDF(
    trainer: Trainer,
    branches: Branch[],
    period: PeriodState,
    sessionsConducted: number,
    settlements: PTCommissionSettlement[],
  ): void {
    const s = computeTrainerSalary(trainer, sessionsConducted);
    PrintService.printReportDocument({
      title: 'Trainer Salary Statement',
      subtitle: `${trainer.fullName} • ${trainer.salaryType?.toUpperCase() || 'MONTHLY'} engagement`,
      branchName: branchName(branches, trainer.branchId),
      dateRange: `Period: ${periodLabel(period)}`,
      kpis: [
        { label: 'Base Salary', value: rupee(s.baseSalary), subtext: 'Contracted' },
        { label: 'PT Commission Earned', value: rupee(s.ptCommissionEarned), subtext: `${s.sessionsConducted} sessions in period` },
        { label: 'Commission Paid', value: rupee(s.ptCommissionPaid), subtext: 'Settled to date' },
        { label: 'Advances Outstanding', value: rupee(s.advancesOutstanding), subtext: 'Recoverable' },
        { label: 'Net Payable', value: rupee(s.netPayable), subtext: 'Base + Due Commission − Advances' },
      ],
      tables: [
        {
          title: 'Earnings & Deductions',
          headers: ['Component', 'Type', 'Amount'],
          rows: [
            ['Base Salary', 'Earning', rupee(s.baseSalary)],
            ['PT Commission Outstanding', 'Earning', rupee(s.ptCommissionOutstanding)],
            ['Advance Recovery', 'Deduction', `- ${rupee(s.advancesOutstanding)}`],
          ],
          summaryRow: ['NET PAYABLE', '', rupee(s.netPayable)],
        },
        {
          title: 'Commission Settlement History',
          headers: ['Settlement #', 'Date', 'Method', 'Reference', 'Amount'],
          rows: settlements.map((st) => [
            st.settlementNumber,
            st.settlementDate,
            st.paymentMethod,
            st.referenceNumber || '-',
            rupee(st.amount),
          ]),
          summaryRow: [
            'TOTAL SETTLED',
            `${settlements.length} settlements`,
            '',
            '',
            rupee(settlements.reduce((sum, st) => sum + (st.amount || 0), 0)),
          ],
        },
      ],
    });
  },

  trainerAdvanceStatementCSV(
    trainer: Trainer,
    settlements: PTCommissionSettlement[],
  ): void {
    downloadCSV(
      `advance-statement-${trainer.fullName.replace(/\s+/g, '-').toLowerCase()}-${fileStamp()}.csv`,
      ['Field', 'Value'],
      [
        ['Trainer', trainer.fullName],
        ['Branch', trainer.branchId],
        ['Advances Outstanding (INR)', trainer.advancesOutstanding || 0],
        ['Commission Earned (INR)', trainer.ptCommissionEarned || 0],
        ['Commission Paid (INR)', trainer.ptCommissionPaid || 0],
        ['Commission Outstanding (INR)', trainer.ptCommissionOutstanding || 0],
        ['Settlements Recorded', settlements.length],
      ],
    );
  },

  attendanceCSV(records: AttendanceRecord[], subject: string): void {
    downloadCSV(
      `attendance-${subject.replace(/\s+/g, '-').toLowerCase()}-${fileStamp()}.csv`,
      ['Date', 'Check In', 'Check Out', 'Status', 'Method', 'PT Session', 'Branch'],
      records.map((r) => [
        r.date,
        r.checkInTime || '',
        r.checkOutTime || '',
        r.status,
        r.verificationMethod,
        r.isPTSessionAttendance ? 'Yes' : 'No',
        r.branchId,
      ]),
    );
  },

  trainerSessionsCSV(sessions: PTSession[], trainerName: string): void {
    downloadCSV(
      `pt-sessions-${trainerName.replace(/\s+/g, '-').toLowerCase()}-${fileStamp()}.csv`,
      ['Date', 'Trainee', 'Start', 'End', 'Status', 'Notes', 'Branch'],
      sessions.map((s) => [
        s.scheduledDate,
        s.traineeName,
        s.startTime,
        s.endTime,
        s.status,
        s.notes || '',
        s.branchId,
      ]),
    );
  },

  traineeStatementPDF(
    trainee: Trainee,
    branches: Branch[],
    period: PeriodState,
    payments: PaymentTransaction[],
    subscriptions: PTSubscription[],
    sessions: PTSession[],
  ): void {
    const totalPaid = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const membershipPaid = payments.reduce(
      (sum, p) => sum + (p.membershipAmount || p.allocation?.generalMembershipAmount || 0),
      0,
    );
    const ptPaid = payments.reduce(
      (sum, p) => sum + (p.ptAmount || p.allocation?.ptAmount || 0),
      0,
    );
    const outstanding = subscriptions.reduce((sum, s) => sum + (s.dueAmount || 0), 0) + (trainee.totalDue || 0);
    const completed = sessions.filter((s) => s.status === 'completed').length;

    PrintService.printReportDocument({
      title: 'Member Account Statement',
      subtitle: `${trainee.fullName} • Member since ${trainee.joiningDate}`,
      branchName: branchName(branches, trainee.branchId),
      dateRange: `Period: ${periodLabel(period)}`,
      kpis: [
        { label: 'Total Paid', value: rupee(totalPaid), subtext: `${payments.length} payments in period` },
        { label: 'Membership', value: rupee(membershipPaid), subtext: 'General access' },
        { label: 'Personal Training', value: rupee(ptPaid), subtext: 'PT stream' },
        { label: 'Outstanding Dues', value: rupee(outstanding), subtext: 'Payable' },
        { label: 'PT Sessions Completed', value: String(completed), subtext: `${sessions.length} scheduled` },
      ],
      tables: [
        {
          title: 'Payment History',
          headers: ['Receipt #', 'Date', 'Method', 'Membership', 'PT', 'Total'],
          rows: payments.map((p) => [
            p.receiptNumber,
            p.paymentDate,
            p.paymentMethod,
            rupee(p.membershipAmount || p.allocation?.generalMembershipAmount || 0),
            rupee(p.ptAmount || p.allocation?.ptAmount || 0),
            rupee(p.totalAmount || 0),
          ]),
          summaryRow: ['TOTAL', `${payments.length} payments`, '', rupee(membershipPaid), rupee(ptPaid), rupee(totalPaid)],
        },
        {
          title: 'Personal Training Packages',
          headers: ['Package', 'Trainer', 'Sessions (done / total)', 'Paid', 'Due'],
          rows: subscriptions.map((s) => [
            s.packageName,
            s.trainerName,
            `${s.completedSessions} / ${s.totalSessions}`,
            rupee(s.paidAmount || 0),
            rupee(s.dueAmount || 0),
          ]),
        },
      ],
    });
  },

  traineePaymentsCSV(payments: PaymentTransaction[], traineeName: string): void {
    downloadCSV(
      `payments-${traineeName.replace(/\s+/g, '-').toLowerCase()}-${fileStamp()}.csv`,
      ['Receipt #', 'Date', 'Method', 'Membership', 'PT', 'Total', 'Reference', 'Branch'],
      payments.map((p) => [
        p.receiptNumber,
        p.paymentDate,
        p.paymentMethod,
        p.membershipAmount || p.allocation?.generalMembershipAmount || 0,
        p.ptAmount || p.allocation?.ptAmount || 0,
        p.totalAmount || 0,
        p.referenceNumber || '',
        p.branchId,
      ]),
    );
  },
};
