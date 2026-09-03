import React from 'react';
import {
  Users,
  Dumbbell,
  CalendarCheck,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import {
  Trainee,
  Trainer,
  PTSubscription,
  PTSession,
  PaymentTransaction,
  Branch,
} from '../../types';

interface ManagerDashboardProps {
  branch: Branch;
  trainees: Trainee[];
  trainers: Trainer[];
  subscriptions: PTSubscription[];
  sessions: PTSession[];
  transactions: PaymentTransaction[];
  onOpenNewPayment: () => void;
  onNavigateTab: (tab: any) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  branch,
  trainees,
  trainers,
  subscriptions,
  sessions,
  transactions,
  onOpenNewPayment,
  onNavigateTab,
}) => {
  const branchTrainees = trainees.filter((t) => t.branchId === branch.id);
  const branchTrainers = trainers.filter((t) => t.branchId === branch.id);
  const branchSubs = subscriptions.filter((s) => s.branchId === branch.id);
  const branchSessions = sessions.filter((s) => s.branchId === branch.id);
  const branchTxs = transactions.filter((t) => t.branchId === branch.id);

  const branchMemRevenue = branchTxs.reduce((sum, t) => sum + (t.membershipAmount || t.allocation?.generalMembershipAmount || 0), 0);
  const branchPTRevenue = branchTxs.reduce((sum, t) => sum + (t.ptAmount || t.allocation?.ptAmount || 0), 0);
  const todaySessions = branchSessions.filter((s) => s.scheduledDate === '2026-09-03');

  return (
    <div className="space-y-6">
      {/* Branch Scope Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              Branch Manager View
            </span>
            <span className="text-xs text-slate-400 font-mono">• {branch.id}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            {branch.name} Operations Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {branch.address}, {branch.city} • Contact: {branch.phone}
          </p>
        </div>

        <button
          onClick={onOpenNewPayment}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          Collect Branch Payment
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Branch Trainees</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{branchTrainees.length}</div>
          <div className="text-[11px] text-indigo-600 mt-0.5">
            {branchSubs.length} active PT subscriptions
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Branch PT Coaches</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{branchTrainers.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Floor trainers & specialists</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <span className="text-xs font-bold text-blue-800 uppercase">General Mem. Collected</span>
          <div className="text-2xl font-black text-blue-700 mt-1">
            ₹{(branchMemRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-blue-600 mt-0.5">Gym access receipts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 shadow-xs">
          <span className="text-xs font-bold text-indigo-900 uppercase">Branch PT Revenue</span>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            ₹{(branchPTRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-indigo-600 mt-0.5">Segregated PT fees</div>
        </div>
      </div>

      {/* Today's PT Floor Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              Today's 1-on-1 PT Session Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Check-ins consume 1 session from client balance and log trainer commission
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('pt_hub')}
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            Open Full PT Hub →
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {branchSessions.slice(0, 5).map((ses) => (
            <div key={ses.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
              <div>
                <div className="font-bold text-slate-900">{ses.traineeName}</div>
                <div className="text-slate-500 text-[11px]">
                  Coach: <strong className="text-indigo-600">{ses.trainerName}</strong> • {ses.startTime} - {ses.endTime} ({ses.scheduledDate})
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    ses.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {ses.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
