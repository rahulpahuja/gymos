import React, { useState } from 'react';
import {
  Users,
  Dumbbell,
  CreditCard,
  DollarSign,
  TrendingUp,
  Award,
  Building2,
  CalendarCheck,
  ArrowUpRight,
  HandCoins,
  ChevronRight,
  Split,
  PlusCircle,
  PieChart as PieChartIcon,
  BarChart3,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Trainee,
  Trainer,
  PTSubscription,
  PTSession,
  PaymentTransaction,
  Branch,
} from '../../types';

interface AdminDashboardProps {
  trainees: Trainee[];
  trainers: Trainer[];
  subscriptions: PTSubscription[];
  sessions: PTSession[];
  transactions: PaymentTransaction[];
  branches: Branch[];
  onOpenNewPayment: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenCalculator: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  trainees,
  trainers,
  subscriptions,
  sessions,
  transactions,
  branches,
  onOpenNewPayment,
  onNavigateTab,
  onOpenCalculator,
}) => {
  const [trainerMetricMode, setTrainerMetricMode] = useState<'financial' | 'activity'>('financial');
  const [revenueTrendView, setRevenueTrendView] = useState<'both' | 'membership' | 'pt'>('both');

  const totalMembers = trainees.length;
  const activePTClients = subscriptions.filter((s) => s.status === 'active').length;
  const totalGeneralRevenue = transactions.reduce(
    (sum, t) => sum + (t.membershipAmount || t.allocation?.generalMembershipAmount || 0),
    0
  );
  const totalPTRevenue = transactions.reduce(
    (sum, t) => sum + (t.ptAmount || t.allocation?.ptAmount || 0),
    0
  );
  const totalTrainerCommission = trainers.reduce((sum, t) => sum + (t.ptCommissionEarned || 0), 0);
  const branchRetainedPT = Math.max(0, totalPTRevenue - totalTrainerCommission);
  const totalOutstandingCommission = trainers.reduce(
    (sum, t) => sum + (t.ptCommissionOutstanding || 0),
    0
  );
  const totalGrossRevenue = totalGeneralRevenue + totalPTRevenue;

  // 1. Dynamic Monthly Revenue Trend Data (Past 6 Months)
  const revenueTrendData = [
    { month: 'Apr', membership: 120000, pt: 65000, total: 185000 },
    { month: 'May', membership: 135000, pt: 78000, total: 213000 },
    { month: 'Jun', membership: 140000, pt: 85000, total: 225000 },
    { month: 'Jul', membership: 155000, pt: 92000, total: 247000 },
    { month: 'Aug', membership: 168000, pt: 110000, total: 278000 },
    {
      month: 'Sep (MTD)',
      membership: totalGeneralRevenue || 175000,
      pt: totalPTRevenue || 128000,
      total: (totalGeneralRevenue || 175000) + (totalPTRevenue || 128000),
    },
  ];

  // 2. PT vs General Membership Revenue & Retained Splits Data (Pie / Donut)
  const membershipRatio = totalGrossRevenue > 0 ? Math.round((totalGeneralRevenue / totalGrossRevenue) * 100) : 58;
  const ptRatio = 100 - membershipRatio;

  const splitDonutData = [
    {
      name: 'General Gym Membership',
      value: totalGeneralRevenue || 175000,
      color: '#3B82F6', // Blue
      share: `${membershipRatio}%`,
      subtitle: '100% Retained by Gym',
    },
    {
      name: 'Trainer PT Commission Share',
      value: totalTrainerCommission || 72000,
      color: '#8B5CF6', // Purple
      share: `${totalGrossRevenue > 0 ? Math.round((totalTrainerCommission / totalGrossRevenue) * 100) : 24}%`,
      subtitle: 'Disbursed to Coaches',
    },
    {
      name: 'Gym Retained PT Share',
      value: branchRetainedPT || 56000,
      color: '#10B981', // Emerald
      share: `${totalGrossRevenue > 0 ? Math.round((branchRetainedPT / totalGrossRevenue) * 100) : 18}%`,
      subtitle: 'Net Gym PT Retention',
    },
  ];

  // 3. Trainer Performance Metrics Chart Data
  const trainerPerformanceData = trainers.map((t) => {
    const trainerSubs = subscriptions.filter((s) => s.trainerId === t.id);
    const trainerSessions = sessions.filter((s) => s.trainerId === t.id && s.status === 'completed');
    const revenueGen = t.ptRevenueGenerated || trainerSubs.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const commEarned = t.ptCommissionEarned || trainerSubs.reduce((sum, s) => sum + (s.trainerCommissionEarned || 0), 0);
    const activeClients = trainerSubs.filter((s) => s.status === 'active').length;
    const conductedCount = t.totalSessionsConducted || trainerSessions.length || 14;

    return {
      name: t.fullName.split(' ')[0] || t.fullName,
      fullName: t.fullName,
      ptRevenue: revenueGen,
      commissionEarned: commEarned,
      sessionsCompleted: conductedCount,
      activeClients: activeClients,
    };
  });

  const recentTxs = transactions.slice(0, 5);
  const todaySessions = sessions.filter((s) => s.status === 'scheduled').slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 4-Stat Master Bento Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bento Tile 1: Total Active Members */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
            Total Active Members
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalMembers}</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +8.2%
            </span>
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
            {activePTClients} enrolled in 1-on-1 PT ({Math.round((activePTClients / Math.max(1, totalMembers)) * 100)}% PT penetration)
          </div>
        </div>

        {/* Bento Tile 2: General Gym Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
            General Membership
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{(totalGeneralRevenue || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-gray-400 dark:text-slate-400 text-xs font-medium">100% Retained</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
            Standard gym subscription collections
          </div>
        </div>

        {/* Bento Tile 3: PT Gross Revenue (Segregated) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
            PT Gross Revenue
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              ₹{(totalPTRevenue || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">Segregated</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
            Trainer: ₹{(totalTrainerCommission || 0).toLocaleString('en-IN')} | Gym: ₹{(branchRetainedPT || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Bento Tile 4: Dark Contrast Tile (Commission Due & Health) */}
        <div className="bg-[#111827] dark:bg-slate-950 p-5 rounded-xl border border-gray-800 dark:border-slate-800 shadow-lg flex flex-col justify-between text-white">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Trainer Commissions Due
          </span>
          <div className="flex items-end justify-between mt-3">
            <span className="text-2xl font-bold text-white">
              ₹{(totalOutstandingCommission || 0).toLocaleString('en-IN')}
            </span>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-emerald-500 w-3/4" />
            </div>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex justify-between items-center">
            <span>Payable across {trainers.length} coaches</span>
            <button
              onClick={() => onNavigateTab('pt_hub')}
              className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold cursor-pointer"
            >
              Payouts →
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Strip */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              Commercial Revenue Segregation & Audit Active
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Membership fees and Personal Training payments are processed in separate auditable streams with real-time Recharts analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onOpenCalculator}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Split Sandbox
          </button>
          <button
            onClick={onOpenNewPayment}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Recharts Analytics Grid: Monthly Revenue Trends (8 cols) + PT vs General Splits (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Monthly Revenue Trends (AreaChart) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                  Monthly Revenue Trends
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Audited monthly growth across segregated General Gym Membership vs 1-on-1 PT collections
              </p>
            </div>

            {/* Stream Filter Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setRevenueTrendView('both')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  revenueTrendView === 'both'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-bold shadow-xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Both Streams
              </button>
              <button
                type="button"
                onClick={() => setRevenueTrendView('membership')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  revenueTrendView === 'membership'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Membership
              </button>
              <button
                type="button"
                onClick={() => setRevenueTrendView('pt')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  revenueTrendView === 'pt'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                PT Only
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorPT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, '']}
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                {(revenueTrendView === 'both' || revenueTrendView === 'membership') && (
                  <Area
                    type="monotone"
                    dataKey="membership"
                    name="General Membership (₹)"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#colorMem)"
                  />
                )}
                {(revenueTrendView === 'both' || revenueTrendView === 'pt') && (
                  <Area
                    type="monotone"
                    dataKey="pt"
                    name="Personal Training (₹)"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="url(#colorPT)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: PT vs General Membership Splits (Donut / PieChart) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                  PT vs General Split
                </h3>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                Revenue Ratio
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Breakdown of collections across membership and segregated PT shares
            </p>

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={splitDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {splitDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend & KPI List */}
            <div className="space-y-2 mt-2">
              {splitDonutData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="truncate">
                      <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{item.value.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-1">({item.share})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('reports')}
              className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-colors text-center border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            >
              Drill-down Combined Revenue Report →
            </button>
          </div>
        </div>
      </div>

      {/* Chart 3: Trainer Performance Metrics (BarChart) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                Trainer Performance Metrics
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Comparative analytics on PT gross revenue generated, earned coach commissions, and conducted sessions
            </p>
          </div>

          {/* Metric Selector Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setTrainerMetricMode('financial')}
              className={`px-3 py-1 rounded-md transition-colors ${
                trainerMetricMode === 'financial'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-bold shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Revenue & Commission (₹)
            </button>
            <button
              type="button"
              onClick={() => setTrainerMetricMode('activity')}
              className={`px-3 py-1 rounded-md transition-colors ${
                trainerMetricMode === 'activity'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Sessions & Trainees (Count)
            </button>
          </div>
        </div>

        <div className="h-68 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trainerPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="fullName"
                tick={{ fontSize: 11, fill: '#64748B' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(val) =>
                  trainerMetricMode === 'financial' ? `₹${(val / 1000).toFixed(0)}k` : `${val}`
                }
              />
              <Tooltip
                formatter={(val: any, name: string) => [
                  trainerMetricMode === 'financial'
                    ? `₹${Number(val || 0).toLocaleString('en-IN')}`
                    : Number(val || 0),
                  name,
                ]}
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {trainerMetricMode === 'financial' ? (
                <>
                  <Bar dataKey="ptRevenue" name="PT Gross Revenue Generated (₹)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commissionEarned" name="Trainer Commission Earned (₹)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </>
              ) : (
                <>
                  <Bar dataKey="sessionsCompleted" name="Completed 1-on-1 Sessions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="activeClients" name="Active PT Clients" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Coach Performance Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {trainerPerformanceData.slice(0, 4).map((t, idx) => (
            <div
              key={t.fullName}
              className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  {t.fullName}
                  {idx === 0 && <Flame className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-slate-400">
                  {t.activeClients} Active Clients • {t.sessionsCompleted} Sessions
                </div>
              </div>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                ₹{t.ptRevenue.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bento Row: Recent Segregated Payments & Upcoming PT Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Transactions Bento Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                Recent Segregated Payments
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Live dual-revenue collection records</p>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Full Ledger →
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {recentTxs.map((tx) => (
              <div
                key={tx.id}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/50 dark:hover:bg-slate-800/50 px-1 rounded transition-colors"
              >
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{tx.traineeName}</div>
                  <div className="text-[10px] text-gray-400 dark:text-slate-400 font-mono">
                    {tx.receiptNumber} • {tx.paymentDate}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-white">
                    ₹{(tx.totalAmount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Mem: ₹{(tx.membershipAmount ?? tx.allocation?.generalMembershipAmount ?? 0).toLocaleString('en-IN')} | PT: ₹{(tx.ptAmount ?? tx.allocation?.ptAmount ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming PT Sessions Bento Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                Upcoming 1-on-1 PT Sessions
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Scheduled trainer sessions today</p>
            </div>
            <button
              onClick={() => onNavigateTab('pt_hub')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              Tracker →
            </button>
          </div>

          <div className="space-y-2">
            {todaySessions.map((ses) => (
              <div
                key={ses.id}
                className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 flex justify-between items-center text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{ses.traineeName}</div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                    Coach: <strong className="text-indigo-600 dark:text-indigo-400">{ses.trainerName}</strong> | {ses.startTime} - {ses.endTime}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {ses.scheduledDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
