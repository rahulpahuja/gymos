import React, { useState } from 'react';
import {
  X,
  Award,
  DollarSign,
  CalendarCheck,
  Dumbbell,
  Users,
  HandCoins,
  CheckCircle2,
} from 'lucide-react';
import { Trainer, PTSubscription, PTSession, PTCommissionSettlement } from '../../types';

interface TrainerDetailModalProps {
  trainer: Trainer | null;
  onClose: () => void;
  ptSubscriptions: PTSubscription[];
  sessions: PTSession[];
  settlements: PTCommissionSettlement[];
  onOpenSettlement: (trainerId: string) => void;
}

export const TrainerDetailModal: React.FC<TrainerDetailModalProps> = ({
  trainer,
  onClose,
  ptSubscriptions,
  sessions,
  settlements,
  onOpenSettlement,
}) => {
  const [activeTab, setActiveTab] = useState<'pt_tab' | 'overview' | 'sessions' | 'payouts'>('pt_tab');

  if (!trainer) return null;

  const assignedSubs = ptSubscriptions.filter((s) => s.trainerId === trainer.id);
  const trainerSessions = sessions.filter((s) => s.trainerId === trainer.id);
  const trainerSettlements = settlements.filter((s) => s.trainerId === trainer.id);

  const ptRevenueGenerated = assignedSubs.reduce((sum, s) => sum + (s.packagePrice || s.netPrice || s.price || 0), 0);
  const completedSessions = trainerSessions.filter((s) => s.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
              {trainer.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">{trainer.fullName}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {trainer.specializations?.join(', ') || 'Head Coach'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {trainer.phone} • Base Salary: ₹{(trainer.baseSalary || 0).toLocaleString('en-IN')}/mo ({trainer.salaryType})
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('pt_tab')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pt_tab'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Personal Training & Commission (Section 79)</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'sessions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Delivered Sessions ({completedSessions})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'payouts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Settlement Disbursements ({trainerSettlements.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {/* Section 79: Trainer PT Tab */}
          {activeTab === 'pt_tab' && (
            <div className="space-y-4">
              {/* 4-KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">PT Revenue Generated</div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    ₹{(ptRevenueGenerated || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <div className="text-[10px] text-indigo-600 uppercase font-bold">Commission Earned</div>
                  <div className="text-base font-black text-indigo-600 mt-1">
                    ₹{(trainer.ptCommissionEarned || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <div className="text-[10px] text-emerald-600 uppercase font-bold">Commission Paid</div>
                  <div className="text-base font-black text-emerald-600 mt-1">
                    ₹{(trainer.ptCommissionPaid || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                  <div className="text-[10px] text-rose-700 uppercase font-bold">Commission Outstanding</div>
                  <div className="text-base font-black text-rose-600 mt-1">
                    ₹{(trainer.ptCommissionOutstanding || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="p-3 bg-indigo-950 text-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs">Ready to disburse earnings?</span>
                  <p className="text-[11px] text-indigo-300">
                    Outstanding balance: ₹{(trainer.ptCommissionOutstanding || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSettlement(trainer.id)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-xs"
                >
                  Disburse Commission
                </button>
              </div>

              {/* Assigned PT Trainees & Packages */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 text-xs">Assigned PT Trainees & Packages ({assignedSubs.length})</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Trainee</th>
                        <th className="p-2.5">Package</th>
                        <th className="p-2.5">Sessions Progress</th>
                        <th className="p-2.5 text-right">Package Price</th>
                        <th className="p-2.5 text-right">Trainer Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignedSubs.map((sub) => (
                        <tr key={sub.id}>
                          <td className="p-2.5 font-bold text-slate-900">{sub.traineeName}</td>
                          <td className="p-2.5 text-slate-700">{sub.packageName}</td>
                          <td className="p-2.5">
                            {sub.completedSessions} / {sub.totalSessions} ({sub.remainingSessions} left)
                          </td>
                          <td className="p-2.5 text-right font-semibold text-slate-800">
                            ₹{(sub.packagePrice || sub.netPrice || sub.price || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-600">
                            ₹{(sub.trainerCommissionTotal || sub.trainerShare || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sessions tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 mb-2">Conducted Workout History</div>
              {trainerSessions.map((ses) => (
                <div key={ses.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{ses.scheduledDate} • {ses.startTime}</div>
                    <div className="text-slate-500 text-[11px]">Trainee: {ses.traineeName} | Check-in: {ses.actualCheckIn || '-'}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      ses.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {ses.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Payouts tab */}
          {activeTab === 'payouts' && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 mb-2">Settlement Disbursements Log</div>
              {trainerSettlements.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  No commission settlements disbursed yet.
                </div>
              ) : (
                trainerSettlements.map((set) => (
                  <div key={set.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{set.settlementNumber} • {set.settlementDate}</div>
                      <div className="text-slate-500 text-[11px]">Mode: {set.paymentMethod} | Ref: {set.referenceNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 text-sm">₹{(set.amount || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400">{set.approvedBy}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
