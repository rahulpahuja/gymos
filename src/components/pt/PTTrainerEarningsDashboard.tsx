import React, { useState } from 'react';
import {
  Award,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HandCoins,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  Trainer,
  PTSession,
  PTSubscription,
  PTCommissionSettlement,
  Branch,
} from '../../types';

interface PTTrainerEarningsDashboardProps {
  trainers: Trainer[];
  subscriptions: PTSubscription[];
  sessions: PTSession[];
  settlements: PTCommissionSettlement[];
  branches: Branch[];
  onOpenSettlement: (trainerId: string) => void;
}

export const PTTrainerEarningsDashboard: React.FC<PTTrainerEarningsDashboardProps> = ({
  trainers,
  subscriptions,
  sessions,
  settlements,
  branches,
  onOpenSettlement,
}) => {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(trainers[0]?.id || '');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'last_month' | 'all'>('month');
  const [activeTab, setActiveTab] = useState<'package' | 'trainee' | 'session' | 'settlement'>('package');

  const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);

  // Filter subscriptions and sessions for this trainer
  const trainerSubs = subscriptions.filter((s) => s.trainerId === selectedTrainerId);
  const trainerSessions = sessions.filter((s) => s.trainerId === selectedTrainerId);
  const trainerSettlements = settlements.filter((s) => s.trainerId === selectedTrainerId);

  // Financial calculations
  const ptGrossGenerated = trainerSubs.reduce((sum, s) => sum + (s.packagePrice || s.netPrice || s.price || 0), 0);
  const totalCommissionEarned = selectedTrainer?.ptCommissionEarned || 0;
  const totalCommissionPaid = selectedTrainer?.ptCommissionPaid || 0;
  const commissionOutstanding = selectedTrainer?.ptCommissionOutstanding || Math.max(0, totalCommissionEarned - totalCommissionPaid);
  const completedSessions = trainerSessions.filter((s) => s.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Top Banner & Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Trainer PT Earnings & Commission Ledger (Section 67)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated audit breakdown of revenue produced, commissions earned, payouts settled, and session deliverables
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Trainer Selector */}
          <select
            id="select-pt-trainer"
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
          >
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName} ({t.branchId === 'branch-1' ? 'Indore' : 'Bhopal'})
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="all">All Time</option>
          </select>

          {/* Settle Commission Button */}
          <button
            id="btn-settle-pt-commission"
            onClick={() => onOpenSettlement(selectedTrainerId)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <HandCoins className="w-4 h-4" />
            Settle Commission
          </button>
        </div>
      </div>

      {/* KPI Cards (Section 67) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">PT Revenue Generated</div>
          <div className="text-xl font-black text-slate-900 mt-1">
            ₹{(ptGrossGenerated || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{trainerSubs.length} Active Clients</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-indigo-600 font-semibold uppercase">Commission Earned</div>
          <div className="text-xl font-black text-indigo-600 mt-1">
            ₹{(totalCommissionEarned || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Accrued from PT rules</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-emerald-600 font-semibold uppercase">Commission Paid</div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            ₹{(totalCommissionPaid || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Disbursed to trainer</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <div className="text-[11px] text-rose-700 font-semibold uppercase">Commission Outstanding</div>
          <div className="text-xl font-black text-rose-600 mt-1">
            ₹{(commissionOutstanding || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-rose-500 mt-1">Awaiting settlement</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Sessions Delivered</div>
          <div className="text-xl font-black text-slate-900 mt-1">{completedSessions}</div>
          <div className="text-[10px] text-slate-400 mt-1">Verified check-ins</div>
        </div>
      </div>

      {/* Breakdown Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="flex border-b border-slate-200 bg-slate-50 px-3">
          <button
            onClick={() => setActiveTab('package')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'package'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Package-Wise Breakdown
          </button>
          <button
            onClick={() => setActiveTab('trainee')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'trainee'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Trainee-Wise Breakdown
          </button>
          <button
            onClick={() => setActiveTab('session')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'session'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Session-Wise Delivery
          </button>
          <button
            onClick={() => setActiveTab('settlement')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'settlement'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Disbursement Settlements History ({trainerSettlements.length})
          </button>
        </div>

        {/* Tab 1: Package-Wise */}
        {activeTab === 'package' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Package</th>
                  <th className="px-3 py-2.5">Active Clients</th>
                  <th className="px-3 py-2.5">Package Price</th>
                  <th className="px-3 py-2.5">Revenue Split Rule</th>
                  <th className="px-3 py-2.5 text-right">Trainer Commission</th>
                  <th className="px-3 py-2.5 text-right">Branch Retained</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainerSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-bold text-slate-900">{sub.packageName}</td>
                    <td className="px-3 py-2.5 text-slate-700">{sub.traineeName}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                      ₹{(sub.packagePrice || sub.netPrice || sub.price || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {sub.revenueSharingRule?.model === 'percentage'
                        ? `${sub.revenueSharingRule.trainerPercent}% Trainer / ${sub.revenueSharingRule.branchPercent}% Branch`
                        : sub.revenueSharingRule?.model}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                      ₹{(sub.trainerCommissionTotal || sub.trainerShare || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-700">
                      ₹{(sub.branchShare || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Trainee-Wise */}
        {activeTab === 'trainee' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Trainee</th>
                  <th className="px-3 py-2.5">Package</th>
                  <th className="px-3 py-2.5">Sessions Progress</th>
                  <th className="px-3 py-2.5">Payment Status</th>
                  <th className="px-3 py-2.5 text-right">Accrued Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainerSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-bold text-slate-900">{sub.traineeName}</td>
                    <td className="px-3 py-2.5 text-slate-700">{sub.packageName}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {sub.completedSessions} of {sub.totalSessions} ({sub.remainingSessions} remaining)
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid ₹{(sub.paidAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                      ₹{(sub.trainerCommissionTotal || sub.trainerShare || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Session-Wise */}
        {activeTab === 'session' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Trainee</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Check-in / out</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainerSessions.map((ses) => (
                  <tr key={ses.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono text-slate-800">{ses.scheduledDate}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{ses.traineeName}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">
                      {ses.startTime} - {ses.endTime}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">
                      {ses.actualCheckIn ? `${ses.actualCheckIn} - ${ses.actualCheckOut}` : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          ses.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {ses.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-[11px]">{ses.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Settlements History */}
        {activeTab === 'settlement' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Settlement #</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Amount Disbursed</th>
                  <th className="px-3 py-2.5">Payment Method</th>
                  <th className="px-3 py-2.5">Reference #</th>
                  <th className="px-3 py-2.5">Approved By</th>
                  <th className="px-3 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainerSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                      No settlement payouts recorded yet for this trainer. Click "Settle Commission" above to disburse.
                    </td>
                  </tr>
                ) : (
                  trainerSettlements.map((set) => (
                    <tr key={set.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800">
                        {set.settlementNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{set.settlementDate}</td>
                      <td className="px-3 py-2.5 font-bold text-emerald-600 text-sm">
                        ₹{(set.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 capitalize text-slate-700">
                        {set.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {set.referenceNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{set.approvedBy}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-[11px]">{set.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
