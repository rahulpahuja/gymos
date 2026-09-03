import React, { useMemo, useState } from 'react';
import {
  User,
  CreditCard,
  CalendarCheck,
  Dumbbell,
  Download,
  FileText,
  AlertCircle,
  BadgeIndianRupee,
} from 'lucide-react';
import {
  Trainee,
  Branch,
  PaymentTransaction,
  PTSubscription,
  PTSession,
  AttendanceRecord,
  CurrentUser,
} from '../../types';
import { PeriodFilter } from '../common/PeriodFilter';
import { PeriodState, defaultPeriod, filterByPeriod, periodLabel } from '../../utils/period';
import { statementService } from '../../services/statementService';
import { rupee } from '../../utils/exporters';

interface TraineePortalProps {
  currentUser: CurrentUser;
  trainees: Trainee[];
  branches: Branch[];
  transactions: PaymentTransaction[];
  subscriptions: PTSubscription[];
  sessions: PTSession[];
  attendance: AttendanceRecord[];
}

const StatCard: React.FC<{ label: string; value: string; sub?: string; tone?: string }> = ({
  label,
  value,
  sub,
  tone = 'text-gray-900 dark:text-white',
}) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
    <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
      {label}
    </div>
    <div className={`text-2xl font-black mt-1 ${tone}`}>{value}</div>
    {sub && <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{sub}</div>}
  </div>
);

export const TraineePortal: React.FC<TraineePortalProps> = ({
  currentUser,
  trainees,
  branches,
  transactions,
  subscriptions,
  sessions,
  attendance,
}) => {
  const [period, setPeriod] = useState<PeriodState>(defaultPeriod('all'));

  const trainee = useMemo(() => {
    if (currentUser.linkedTraineeId) {
      const linked = trainees.find((t) => t.id === currentUser.linkedTraineeId);
      if (linked) return linked;
    }
    return trainees.find(
      (t) => t.email?.toLowerCase() === currentUser.email?.toLowerCase(),
    );
  }, [trainees, currentUser]);

  if (!trainee) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm text-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Member record not linked</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Your login is approved but not yet linked to a member profile. Ask the front desk or your
          branch manager to link your account from Staff &amp; Approvals.
        </p>
      </div>
    );
  }

  const myPayments = filterByPeriod<PaymentTransaction>(
    transactions.filter((t) => t.traineeId === trainee.id),
    (t) => t.paymentDate,
    period,
  );
  const mySubs = subscriptions.filter((s) => s.traineeId === trainee.id);
  const mySessions = filterByPeriod<PTSession>(
    sessions.filter((s) => s.traineeId === trainee.id),
    (s) => s.scheduledDate,
    period,
  );
  const myAttendance = filterByPeriod<AttendanceRecord>(
    attendance.filter((a) => a.personType === 'trainee' && a.personId === trainee.id),
    (a) => a.date,
    period,
  );

  const totalPaid = myPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const outstanding =
    mySubs.reduce((sum, s) => sum + (s.dueAmount || 0), 0) + (trainee.totalDue || 0);
  const completed = mySessions.filter((s) => s.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
            <User className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Welcome, {trainee.fullName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {branches.find((b) => b.id === trainee.branchId)?.name || trainee.branchId} •{' '}
              {trainee.generalMembershipPlanName || 'PT-only member'}
            </p>
          </div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Total Paid (period)" value={rupee(totalPaid)} sub={`${myPayments.length} payments`} />
        <StatCard
          label="Outstanding Dues"
          value={rupee(outstanding)}
          sub="Membership + PT"
          tone="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="PT Sessions Done"
          value={String(completed)}
          sub={`${mySessions.length} scheduled`}
          tone="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          label="Gym Visits (period)"
          value={String(myAttendance.length)}
          sub="Biometric check-ins"
          tone="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Downloads */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Download My Statements
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3">
          Scoped to <span className="font-semibold">{periodLabel(period)}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              statementService.traineeStatementPDF(
                trainee,
                branches,
                period,
                myPayments,
                mySubs,
                mySessions,
              )
            }
            className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Account Statement (PDF)
          </button>
          <button
            type="button"
            onClick={() => statementService.traineePaymentsCSV(myPayments, trainee.fullName)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payments (CSV)
          </button>
          <button
            type="button"
            onClick={() => statementService.attendanceCSV(myAttendance, trainee.fullName)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Attendance (CSV)
          </button>
        </div>
      </div>

      {/* PT packages */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            My Personal Training Packages ({mySubs.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-gray-600 dark:text-slate-300">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">Trainer</th>
                <th className="px-3 py-2">Sessions</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {mySubs.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                    {s.packageName}
                  </td>
                  <td className="px-3 py-2">{s.trainerName}</td>
                  <td className="px-3 py-2">
                    {s.completedSessions} / {s.totalSessions}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {rupee(s.paidAmount)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-amber-600 dark:text-amber-400">
                    {rupee(s.dueAmount)}
                  </td>
                </tr>
              ))}
              {mySubs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    No active PT packages.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments + sessions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <BadgeIndianRupee className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Payments ({myPayments.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-[11px] text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="px-3 py-2">Receipt</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {myPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-mono text-indigo-700 dark:text-indigo-300">
                      {p.receiptNumber}
                    </td>
                    <td className="px-3 py-2 font-mono">{p.paymentDate}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">
                      {rupee(p.totalAmount)}
                    </td>
                  </tr>
                ))}
                {myPayments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                      No payments in {periodLabel(period)}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              PT Sessions ({mySessions.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-[11px] text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Trainer</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {mySessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-mono">{s.scheduledDate}</td>
                    <td className="px-3 py-2">{s.trainerName}</td>
                    <td className="px-3 py-2 capitalize">{s.status.replace('_', ' ')}</td>
                  </tr>
                ))}
                {mySessions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                      No sessions in {periodLabel(period)}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
