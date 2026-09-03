import React, { useState } from 'react';
import {
  X,
  User,
  Dumbbell,
  CreditCard,
  CalendarCheck,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Trainee, PTSubscription, PTSession, PaymentTransaction } from '../../types';

interface TraineeDetailModalProps {
  trainee: Trainee | null;
  onClose: () => void;
  ptSubscriptions: PTSubscription[];
  sessions: PTSession[];
  transactions: PaymentTransaction[];
  onOpenRecordPayment: () => void;
}

export const TraineeDetailModal: React.FC<TraineeDetailModalProps> = ({
  trainee,
  onClose,
  ptSubscriptions,
  sessions,
  transactions,
  onOpenRecordPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'membership' | 'pt' | 'payments' | 'sessions'>('pt');

  if (!trainee) return null;

  const traineePTSubs = ptSubscriptions.filter((s) => s.traineeId === trainee.id);
  const traineeSessions = sessions.filter((s) => s.traineeId === trainee.id);
  const traineeTxs = transactions.filter((t) => t.traineeId === trainee.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
              {trainee.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">{trainee.fullName}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    trainee.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {trainee.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{trainee.phone}</span>
                <span>•</span>
                <span>{trainee.email}</span>
                <span>•</span>
                <span className="font-mono">{trainee.id}</span>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('pt')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pt'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Personal Training (Tab 78)</span>
          </button>
          <button
            onClick={() => setActiveTab('membership')}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'membership'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            General Membership
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payments & Dues</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'sessions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            PT Sessions Log ({traineeSessions.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {/* Section 78: Personal Training Tab */}
          {activeTab === 'pt' && (
            <div className="space-y-4">
              {traineePTSubs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Dumbbell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="font-bold text-slate-700 text-sm">No Active PT Subscription</div>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                    This trainee currently only has standard gym floor access or has completed their previous package.
                  </p>
                </div>
              ) : (
                traineePTSubs.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-700 px-2 py-0.5 rounded-sm bg-indigo-100">
                          {sub.packageName}
                        </span>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          Coach: {sub.trainerName}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          sub.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    {/* Sessions Grid */}
                    <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Total Sessions</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">{sub.totalSessions}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-700 uppercase font-bold">Completed</div>
                        <div className="text-base font-black text-emerald-600 mt-0.5">{sub.completedSessions}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-indigo-700 uppercase font-bold">Remaining</div>
                        <div className="text-base font-black text-indigo-600 mt-0.5">{sub.remainingSessions}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Expires</div>
                        <div className="text-xs font-bold text-slate-800 mt-1.5">{sub.expiryDate}</div>
                      </div>
                    </div>

                    {/* Financial Status (Section 78) */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold">PT Financials</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          Package Price: <strong>₹{(sub.packagePrice || sub.netPrice || sub.price || 0).toLocaleString('en-IN')}</strong> | Paid: <strong className="text-emerald-600">₹{(sub.paidAmount || 0).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        {(sub.dueAmount || 0) > 0 ? (
                          <div className="text-rose-600 font-bold">
                            Due: ₹{(sub.dueAmount || 0).toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                            Fully Paid
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Coach Assignment Trail */}
                    {sub.history && sub.history.length > 0 && (
                      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-700">Coach History: </span>
                        {sub.history.map((h, i) => (
                          <span key={i} className="mr-2">
                            {h.newTrainerName || h.action} ({h.timestamp.substring(0, 10)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* General Membership Tab */}
          {activeTab === 'membership' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {trainee.generalMembershipPlanName || trainee.membershipPlan || 'Quarterly Gym Access'}
                  </div>
                  <div className="text-slate-500">Plan Duration: 3 Months Gym Access</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                <div>Enrolled Date: <strong>{trainee.joiningDate || trainee.joinDate || '2026-06-01'}</strong></div>
                <div>Expiry Date: <strong>{trainee.generalMembershipExpiryDate || trainee.membershipExpiry || '2026-09-30'}</strong></div>
                <div>Total Paid: <strong className="text-emerald-600">₹{(trainee.totalPaid || 0).toLocaleString('en-IN')}</strong></div>
                <div>Total Due: <strong className="text-rose-600">₹{(trainee.totalDue || 0).toLocaleString('en-IN')}</strong></div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="font-bold text-slate-800">Payment History & Dues</div>
                <button
                  onClick={onOpenRecordPayment}
                  className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold"
                >
                  Record New Payment
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Receipt #</th>
                      <th className="p-2 text-right">Membership (₹)</th>
                      <th className="p-2 text-right">PT (₹)</th>
                      <th className="p-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {traineeTxs.map((tx) => (
                      <tr key={tx.id}>
                        <td className="p-2 font-mono">{tx.paymentDate}</td>
                        <td className="p-2 font-mono text-indigo-600">{tx.receiptNumber}</td>
                        <td className="p-2 text-right text-blue-700 font-semibold">
                          ₹{(tx.membershipAmount ?? tx.allocation?.generalMembershipAmount ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-right text-indigo-700 font-semibold">
                          ₹{(tx.ptAmount ?? tx.allocation?.ptAmount ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-right font-black">
                          ₹{(tx.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-2">
              <div className="font-bold text-slate-800 mb-2">1-on-1 Personal Training Workouts</div>
              {traineeSessions.map((ses) => (
                <div key={ses.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{ses.scheduledDate} • {ses.startTime} - {ses.endTime}</div>
                    <div className="text-slate-500 text-[11px]">Coach: {ses.trainerName} | {ses.notes || 'Routine coaching'}</div>
                  </div>
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
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-[11px] text-slate-500">
            Total Outstanding Balance: <strong className="text-rose-600 text-sm">₹{(trainee.totalDue || 0).toLocaleString('en-IN')}</strong>
          </div>
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
