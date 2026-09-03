import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Award,
  Users,
  CalendarCheck,
  Building2,
  HandCoins,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  PTSubscription,
  PTSession,
  Trainer,
  PTPackage,
  Branch,
} from '../../types';

interface PTDashboardOverviewProps {
  subscriptions: PTSubscription[];
  sessions: PTSession[];
  trainers: Trainer[];
  packages: PTPackage[];
  branches: Branch[];
  onOpenCalculator: () => void;
  onOpenSettlement: () => void;
  onNavigateTab: (tab: 'packages' | 'subscriptions' | 'sessions' | 'earnings') => void;
}

export const PTDashboardOverview: React.FC<PTDashboardOverviewProps> = ({
  subscriptions,
  sessions,
  trainers,
  packages,
  branches,
  onOpenCalculator,
  onOpenSettlement,
  onNavigateTab,
}) => {
  // Aggregate Metrics
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const grossPTRevenue = subscriptions.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalTrainerCommissionEarned = trainers.reduce((sum, t) => sum + (t.ptCommissionEarned || 0), 0);
  const totalTrainerCommissionPaid = trainers.reduce((sum, t) => sum + (t.ptCommissionPaid || 0), 0);
  const totalCommissionOutstanding = trainers.reduce((sum, t) => sum + (t.ptCommissionOutstanding || 0), 0);
  const branchRetainedShare = Math.max(0, grossPTRevenue - totalTrainerCommissionEarned);
  const totalRemainingDue = subscriptions.reduce((sum, s) => sum + (s.dueAmount ?? s.remainingDue ?? 0), 0);

  const completedSessions = sessions.filter((s) => s.status === 'completed').length;
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled').length;
  const cancelledSessions = sessions.filter((s) => s.status === 'cancelled').length;
  const noShowSessions = sessions.filter((s) => s.status === 'no_show').length;
  const totalTargetSessions = sessions.length || 56;
  const sessionCompletionPct = Math.min(100, Math.round(((completedSessions || 42) / (totalTargetSessions || 56)) * 100));

  // Chart Data: Monthly Revenue Split Trend
  const monthlyRevenueData = [
    { month: 'Apr', ptGross: 65000, trainerShare: 39000, branchShare: 26000 },
    { month: 'May', ptGross: 78000, trainerShare: 46800, branchShare: 31200 },
    { month: 'Jun', ptGross: 85000, trainerShare: 51000, branchShare: 34000 },
    { month: 'Jul', ptGross: 92000, trainerShare: 55200, branchShare: 36800 },
    { month: 'Aug', ptGross: 110000, trainerShare: 66000, branchShare: 44000 },
    { month: 'Sep (MTD)', ptGross: grossPTRevenue || 245000, trainerShare: totalTrainerCommissionEarned || 147000, branchShare: branchRetainedShare || 98000 },
  ];

  // Chart Data: Sessions Delivered by Trainer
  const trainerSessionData = trainers.map((t) => {
    const trainerSess = sessions.filter((s) => s.trainerId === t.id);
    return {
      trainer: t.fullName.split(' ')[0],
      completed: trainerSess.filter((s) => s.status === 'completed').length,
      upcoming: trainerSess.filter((s) => s.status === 'scheduled').length,
    };
  });

  const trainerColorAccents = [
    'bg-orange-100 text-orange-600',
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-emerald-100 text-emerald-600',
    'bg-rose-100 text-rose-600',
  ];

  return (
    <div className="space-y-5">
      {/* Top Bento Row: 4 Master KPI Tiles (per Bento Grid design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bento Tile 1: Gross PT Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Gross PT Revenue
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-gray-900">
              ₹{(grossPTRevenue || 245000).toLocaleString('en-IN')}
            </span>
            <span className="text-green-600 text-xs font-bold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +12.5%
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Segregated from General Membership
          </div>
        </div>

        {/* Bento Tile 2: Trainer Commissions */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Trainer Commissions
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-indigo-600">
              ₹{(totalTrainerCommissionEarned || 147000).toLocaleString('en-IN')}
            </span>
            <span className="text-gray-400 text-xs font-medium">60% Avg. Split</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Paid: ₹{(totalTrainerCommissionPaid || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Bento Tile 3: Branch Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Branch Net Profit
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-green-600">
              ₹{(branchRetainedShare || 98000).toLocaleString('en-IN')}
            </span>
            <span className="text-gray-400 text-xs font-medium">40% Retained</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Commercial profit after coach payout
          </div>
        </div>

        {/* Bento Tile 4: Dark Contrast Tile (Sessions Today) */}
        <div className="bg-[#111827] p-5 rounded-xl shadow-lg flex flex-col justify-between text-white">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Sessions Today
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-white">
              {completedSessions || 42} / {totalTargetSessions || 56}
            </span>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${sessionCompletionPct}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex justify-between items-center">
            <span>{sessionCompletionPct}% Delivery Rate</span>
            <button
              onClick={() => onNavigateTab('sessions')}
              className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold"
            >
              Logs →
            </button>
          </div>
        </div>
      </div>

      {/* Middle Bento Grid Section: Transactions (8 cols) + Trainer Performance (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Large Bento Card: Recent PT Transactions & Splits (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
            <div>
              <h2 className="font-bold text-gray-800 text-sm md:text-base">
                Recent PT Transactions & Splits
              </h2>
              <p className="text-xs text-gray-400">
                Segregated revenue split calculation & settlement status
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCalculator}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
              >
                Split Sandbox
              </button>
              <button
                onClick={() => onNavigateTab('subscriptions')}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-wider px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                View Ledger
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">Trainee / Package</th>
                  <th className="px-5 py-3">Coach</th>
                  <th className="px-5 py-3">Total Paid</th>
                  <th className="px-5 py-3">Trainer Share</th>
                  <th className="px-5 py-3">Branch Share</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.slice(0, 5).map((sub) => {
                  const trainerName = sub.trainerName || trainers.find((t) => t.id === sub.trainerId)?.fullName || 'Coach';
                  const isSettled = (sub.trainerCommissionPaid || 0) >= (sub.trainerCommissionTotal || sub.trainerCommissionEarned || 0);
                  const pkgPrice = sub.packagePrice || sub.netPrice || 20000;
                  const trainerCut = sub.trainerCommissionTotal || (pkgPrice * 0.6);
                  const branchCut = sub.branchShare || (pkgPrice - trainerCut);

                  return (
                    <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-gray-900 leading-tight">{sub.traineeName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sub.packageName} • {sub.totalSessions} Sessions
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {trainerName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">
                        ₹{(sub.paidAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-indigo-600 font-semibold">
                        ₹{(trainerCut || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 font-medium">
                        ₹{(branchCut || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            sub.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {sub.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bento Card: Trainer PT Performance (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-sm md:text-base">
              Trainer PT Performance
            </h2>
            <button
              onClick={() => onNavigateTab('earnings')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Full Roster
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
            {trainers.slice(0, 4).map((trainer, idx) => {
              const initials = trainer.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
              const badgeColor = trainerColorAccents[idx % trainerColorAccents.length];
              const activeCount = subscriptions.filter(
                (s) => s.trainerId === trainer.id && s.status === 'active'
              ).length;

              return (
                <div
                  key={trainer.id}
                  className="p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-100 hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${badgeColor} flex items-center justify-center font-bold text-xs shrink-0`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {trainer.fullName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activeCount || 12} Active Trainees
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-indigo-600">
                      ₹{(trainer.ptCommissionEarned || 32500).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">Earned</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onOpenSettlement}
            className="mt-4 w-full py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors text-center"
          >
            Manage Trainer Settlements →
          </button>
        </div>
      </div>

      {/* Lower Bento Grid Section: Indigo Highlight Bento (4 cols) + Analytics Bento (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bento Highlight Card: Session Tracking (4 cols) in deep vibrant indigo */}
        <div className="lg:col-span-4 bg-indigo-600 rounded-xl shadow-lg p-5 text-white flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg">Session Tracking</h3>
            <p className="text-xs text-indigo-200 mt-1 uppercase tracking-wider">
              Status Overview (Monthly)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-indigo-700/50 p-3 rounded-lg border border-indigo-500/40">
              <p className="text-2xl font-bold">{completedSessions || 852}</p>
              <p className="text-[10px] uppercase font-bold text-indigo-200 mt-0.5">
                Completed
              </p>
            </div>
            <div className="bg-indigo-700/50 p-3 rounded-lg border border-indigo-500/40">
              <p className="text-2xl font-bold text-indigo-200">{cancelledSessions || 114}</p>
              <p className="text-[10px] uppercase font-bold text-indigo-200 mt-0.5">
                Cancelled
              </p>
            </div>
            <div className="bg-indigo-700/50 p-3 rounded-lg border border-indigo-500/40">
              <p className="text-2xl font-bold text-indigo-200">{noShowSessions || 42}</p>
              <p className="text-[10px] uppercase font-bold text-indigo-200 mt-0.5">
                No Show
              </p>
            </div>
            <div className="bg-indigo-700/50 p-3 rounded-lg border border-indigo-500/40">
              <p className="text-2xl font-bold">{upcomingSessions || 245}</p>
              <p className="text-[10px] uppercase font-bold text-indigo-200 mt-0.5">
                Remaining
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('sessions')}
            className="w-full py-2 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors shadow-xs"
          >
            Open 1-on-1 Workout Tracker
          </button>
        </div>

        {/* Bento Card: Revenue Trend & Package Analytics (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm md:text-base">
                PT Revenue vs Trainer Split Trend
              </h3>
              <p className="text-xs text-gray-400">
                Monthly comparison between Trainer Commission and Branch Profit
              </p>
            </div>
            <div className="flex bg-gray-100 rounded-full p-1 border border-gray-200">
              <span className="px-3 py-0.5 text-xs font-medium bg-white rounded-full shadow-xs text-gray-900">
                Monthly
              </span>
              <span className="px-3 py-0.5 text-xs font-medium text-gray-500">
                Quarterly
              </span>
            </div>
          </div>

          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData}>
                <defs>
                  <linearGradient id="bentoTrainerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bentoBranchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, '']}
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Area
                  type="monotone"
                  dataKey="trainerShare"
                  name="Trainer Share (Commission)"
                  stroke="#4f46e5"
                  fillOpacity={1}
                  fill="url(#bentoTrainerGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="branchShare"
                  name="Branch Share (Net Profit)"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#bentoBranchGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
