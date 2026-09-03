import React, { useMemo, useState } from 'react';
import {
  Award,
  Wallet,
  CalendarCheck,
  Dumbbell,
  Download,
  FileText,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  Trainer,
  Branch,
  PTSession,
  PTSubscription,
  PTCommissionSettlement,
  AttendanceRecord,
  CurrentUser,
} from '../../types';
import { PeriodFilter } from '../common/PeriodFilter';
import { PeriodState, defaultPeriod, filterByPeriod, periodLabel } from '../../utils/period';
import { statementService, computeTrainerSalary } from '../../services/statementService';
import { rupee } from '../../utils/exporters';

interface TrainerPortalProps {
  currentUser: CurrentUser;
  trainers: Trainer[];
  branches: Branch[];
  sessions: PTSession[];
  subscriptions: PTSubscription[];
  settlements: PTCommissionSettlement[];
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

export const TrainerPortal: React.FC<TrainerPortalProps> = ({
  currentUser,
  trainers,
  branches,
  sessions,
  subscriptions,
  settlements,
  attendance,
}) => {
  const [period, setPeriod] = useState<PeriodState>(defaultPeriod('all'));

  const trainer = useMemo(() => {
    if (currentUser.linkedTrainerId) {
      const linked = trainers.find((t) => t.id === currentUser.linkedTrainerId);
      if (linked) return linked;
    }
    return trainers.find(
      (t) => t.email?.toLowerCase() === currentUser.email?.toLowerCase(),
    );
  }, [trainers, currentUser]);

  if (!trainer) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm text-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Trainer record not linked</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Your login is approved but not yet linked to a trainer profile. Ask your branch manager to
          open <span className="font-semibold">Staff &amp; Approvals → Edit</span> and set your Linked
          Trainer Record — or add a trainer whose email is{' '}
          <span className="font-semibold">{currentUser.email}</span>.
        </p>
      </div>
    );
  }

  const mySessions = filterByPeriod<PTSession>(
    sessions.filter((s) => s.trainerId === trainer.id),
    (s) => s.scheduledDate,
    period,
  );
  const mySettlements = filterByPeriod<PTCommissionSettlement>(
    settlements.filter((s) => s.trainerId === trainer.id),
    (s) => s.settlementDate,
    period,
  );
  const myAttendance = filterByPeriod<AttendanceRecord>(
    attendance.filter((a) => a.personType === 'trainer' && a.personId === trainer.id),
    (a) => a.date,
    period,
  );
  const myClients = subscriptions.filter((s) => s.trainerId === trainer.id);

  const completed = mySessions.filter((s) => s.status === 'completed').length;
  const salary = computeTrainerSalary(trainer, completed);

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
            <Award className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Welcome, {trainer.fullName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {branches.find((b) => b.id === trainer.branchId)?.name || trainer.branchId} •{' '}
              {trainer.specializations?.slice(0, 2).join(', ')}
            </p>
          </div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Base Salary" value={rupee(salary.baseSalary)} sub={trainer.salaryType} />
        <StatCard
          label="Commission Outstanding"
          value={rupee(salary.ptCommissionOutstanding)}
          sub="Awaiting settlement"
          tone="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          label="Advances Outstanding"
          value={rupee(salary.advancesOutstanding)}
          sub="Recoverable from salary"
          tone="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Net Payable"
          value={rupee(salary.netPayable)}
          sub="Base + due commission − advances"
          tone="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Downloads */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Download Statements
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3">
          Scoped to <span className="font-semibold">{periodLabel(period)}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              statementService.trainerSalaryStatementPDF(
                trainer,
                branches,
                period,
                completed,
                mySettlements,
              )
            }
            className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Salary Statement (PDF)
          </button>
          <button
            type="button"
            onClick={() => statementService.trainerAdvanceStatementCSV(trainer, mySettlements)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            Advance Statement (CSV)
          </button>
          <button
            type="button"
            onClick={() => statementService.trainerSessionsCSV(mySessions, trainer.fullName)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            PT Sessions (CSV)
          </button>
          <button
            type="button"
            onClick={() => statementService.attendanceCSV(myAttendance, trainer.fullName)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Attendance (CSV)
          </button>
        </div>
      </div>

      {/* Sessions + attendance tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              PT Sessions ({mySessions.length})
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              {completed} completed
            </span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-[11px] text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Trainee</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {mySessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-mono">{s.scheduledDate}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                      {s.traineeName}
                    </td>
                    <td className="px-3 py-2">{s.startTime}</td>
                    <td className="px-3 py-2 capitalize">{s.status.replace('_', ' ')}</td>
                  </tr>
                ))}
                {mySessions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                      No sessions in {periodLabel(period)}.
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
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              My Attendance ({myAttendance.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-[11px] text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">In</th>
                  <th className="px-3 py-2">Out</th>
                  <th className="px-3 py-2">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {myAttendance.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-mono">{a.date}</td>
                    <td className="px-3 py-2">{a.checkInTime || '—'}</td>
                    <td className="px-3 py-2">{a.checkOutTime || '—'}</td>
                    <td className="px-3 py-2 uppercase">{a.verificationMethod}</td>
                  </tr>
                ))}
                {myAttendance.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                      No attendance logged in {periodLabel(period)}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Clients */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            My PT Clients ({myClients.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-gray-600 dark:text-slate-300">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2">Trainee</th>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">Sessions</th>
                <th className="px-3 py-2 text-right">My Commission</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {myClients.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                    {c.traineeName}
                  </td>
                  <td className="px-3 py-2">{c.packageName}</td>
                  <td className="px-3 py-2">
                    {c.completedSessions} / {c.totalSessions}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                    {rupee(c.trainerCommissionTotal)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-amber-600 dark:text-amber-400">
                    {rupee(c.trainerCommissionOutstanding)}
                  </td>
                </tr>
              ))}
              {myClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    No PT clients assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
