import React, { useState } from 'react';
import {
  UserCheck,
  Calendar,
  AlertCircle,
  Plus,
  RefreshCw,
  Pause,
  Play,
  XCircle,
  History,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
} from 'lucide-react';
import {
  PTSubscription,
  Trainer,
  Trainee,
  PTPackage,
  PTAssignmentHistoryItem,
  Branch,
} from '../../types';
import { storageService } from '../../services/storageService';
import { PTRevenueService } from '../../services/ptRevenueService';

interface PTSubscriptionsViewProps {
  subscriptions: PTSubscription[];
  trainers: Trainer[];
  trainees: Trainee[];
  packages: PTPackage[];
  branches: Branch[];
  onOpenRecordPayment: () => void;
}

export const PTSubscriptionsView: React.FC<PTSubscriptionsViewProps> = ({
  subscriptions,
  trainers,
  trainees,
  packages,
  branches,
  onOpenRecordPayment,
}) => {
  const [selectedSubForHistory, setSelectedSubForHistory] = useState<PTSubscription | null>(null);
  const [selectedSubForChangeTrainer, setSelectedSubForChangeTrainer] = useState<PTSubscription | null>(null);
  const [isNewSubscriptionModalOpen, setIsNewSubscriptionModalOpen] = useState<boolean>(false);

  // Change Trainer Form
  const [newTrainerId, setNewTrainerId] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('Trainee schedule adjustment');

  // New Subscription Form
  const [traineeId, setTraineeId] = useState<string>(trainees[0]?.id || '');
  const [packageId, setPackageId] = useState<string>(packages[0]?.id || '');
  const [trainerId, setTrainerId] = useState<string>(trainers[0]?.id || '');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [initialPayment, setInitialPayment] = useState<number>(20000);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');

  const handleChangeTrainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForChangeTrainer || !newTrainerId) return;

    const newTrainer = trainers.find((t) => t.id === newTrainerId);
    if (!newTrainer) return;

    storageService.changeTrainerForSubscription(
      selectedSubForChangeTrainer.id,
      newTrainer.id,
      newTrainer.fullName,
      changeReason,
      'Admin / Manager'
    );

    setSelectedSubForChangeTrainer(null);
  };

  const handlePauseResume = (sub: PTSubscription) => {
    const updatedStatus = sub.status === 'active' ? 'paused' : 'active';
    const updated: PTSubscription = {
      ...sub,
      status: updatedStatus,
    };
    storageService.savePTSubscription(updated);
  };

  const handleCreateNewSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const selTrainee = trainees.find((t) => t.id === traineeId);
    const selPkg = packages.find((p) => p.id === packageId);
    const selTrainer = trainers.find((t) => t.id === trainerId);

    if (!selTrainee || !selPkg || !selTrainer) return;

    // Calculate split
    const split = PTRevenueService.calculateRevenueSplit(
      selPkg.price,
      0,
      selPkg.revenueSharingRule,
      selPkg.sessionsCount,
      selPkg.sessionsCount
    );

    const paidAmt = Math.min(selPkg.price, initialPayment);
    const dueAmt = Math.max(0, selPkg.price - paidAmt);

    // Expiry date calculation
    const exp = new Date(startDate);
    exp.setDate(exp.getDate() + selPkg.durationDays);

    const historyItem: PTAssignmentHistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'assigned',
      newTrainerId: selTrainer.id,
      newTrainerName: selTrainer.fullName,
      reason: 'Initial onboarding package assignment',
      performedBy: 'Admin / Gym Manager',
    };

    const newSub: PTSubscription = {
      id: `pts-${Date.now()}`,
      traineeId: selTrainee.id,
      traineeName: selTrainee.fullName,
      packageId: selPkg.id,
      packageName: selPkg.name,
      trainerId: selTrainer.id,
      trainerName: selTrainer.fullName,
      branchId: selTrainee.branchId,
      startDate,
      expiryDate: exp.toISOString().substring(0, 10),
      totalSessions: selPkg.sessionsCount,
      completedSessions: 0,
      remainingSessions: selPkg.sessionsCount,
      cancelledSessions: 0,
      noShowSessions: 0,
      packagePrice: selPkg.price,
      discount: 0,
      netPrice: selPkg.price,
      paidAmount: paidAmt,
      dueAmount: dueAmt,
      revenueRule: selPkg.revenueSharingRule,
      trainerCommissionTotal: split.trainerShare,
      trainerCommissionEarned: 0,
      trainerCommissionPaid: 0,
      trainerCommissionOutstanding: 0,
      branchShare: split.branchShare,
      status: 'active',
      history: [historyItem],
      createdAt: new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    storageService.savePTSubscription(newSub);

    // If initial payment was made, also record transaction
    if (paidAmt > 0) {
      storageService.recordPayment({
        id: `pay-${Date.now()}`,
        receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        traineeId: selTrainee.id,
        traineeName: selTrainee.fullName,
        branchId: selTrainee.branchId,
        paymentDate: new Date().toISOString().substring(0, 10),
        paymentMethod: paymentMethod as any,
        referenceNumber: `INIT-PT-${Math.floor(100000 + Math.random() * 900000)}`,
        totalAmount: paidAmt,
        allocation: {
          generalMembershipAmount: 0,
          ptAmount: paidAmt,
        },
        discount: 0,
        tax: 0,
        previousDue: 0,
        remainingDue: dueAmt,
        notes: `Initial PT enrollment for ${selPkg.name}`,
        createdBy: 'Admin',
        createdAt: new Date().toISOString(),
      });
    }

    setIsNewSubscriptionModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            PT Subscriptions & Assignments (Section 62)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active trainee assignments, session balances, trainer transfer audits, and status lifecycle
          </p>
        </div>

        <button
          id="btn-assign-pt-subscription"
          onClick={() => setIsNewSubscriptionModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Assign New PT Client
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Trainee / Client</th>
                <th className="px-4 py-3">Package & Price</th>
                <th className="px-4 py-3">Assigned PT Coach</th>
                <th className="px-4 py-3">Sessions Progress</th>
                <th className="px-4 py-3">Validity Window</th>
                <th className="px-4 py-3">Financials</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((sub) => {
                const percentCompleted = Math.round(
                  (sub.completedSessions / Math.max(1, sub.totalSessions)) * 100
                );

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-sm">{sub.traineeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{sub.id}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{sub.packageName}</div>
                      <div className="text-[11px] text-indigo-600 font-bold">
                        ₹{(sub.packagePrice || sub.netPrice || sub.price || 0).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {sub.trainerName}
                      </div>
                      <button
                        onClick={() => setSelectedSubForHistory(sub)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-0.5 hover:underline"
                        title="View Trainer Transfer Audit Trail"
                      >
                        <History className="w-3 h-3" />
                        {sub.history?.length || 1} Assignment(s) Logged
                      </button>
                    </td>

                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="font-semibold text-slate-700">
                          {sub.completedSessions} / {sub.totalSessions}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sub.remainingSessions} Left
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            sub.remainingSessions === 0 ? 'bg-slate-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percentCompleted}%` }}
                        ></div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[11px]">
                      <div className="text-slate-700 font-medium">From: {sub.startDate}</div>
                      <div className="text-slate-500">Expires: {sub.expiryDate}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-[11px] text-emerald-600 font-semibold">
                        Paid: ₹{(sub.paidAmount || 0).toLocaleString('en-IN')}
                      </div>
                      {(sub.dueAmount || 0) > 0 ? (
                        <div className="text-[10px] text-rose-600 font-bold">
                          Due: ₹{(sub.dueAmount || 0).toLocaleString('en-IN')}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">Paid in Full</div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          sub.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'paused'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : sub.status === 'completed'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* Change Trainer Button (Section 62 Requirement) */}
                      <button
                        onClick={() => {
                          setSelectedSubForChangeTrainer(sub);
                          setNewTrainerId('');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition-colors"
                        title="Change assigned PT coach and log audit reason"
                      >
                        Change Coach
                      </button>

                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => handlePauseResume(sub)}
                        className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                          sub.status === 'active'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                        title={sub.status === 'active' ? 'Pause subscription' : 'Resume subscription'}
                      >
                        {sub.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Change PT Trainer (Section 62) */}
      {selectedSubForChangeTrainer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Change Assigned PT Coach</h3>
              <button
                onClick={() => setSelectedSubForChangeTrainer(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangeTrainerSubmit} className="p-6 space-y-4 text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div>Client: <strong className="text-slate-900">{selectedSubForChangeTrainer.traineeName}</strong></div>
                <div>Package: <strong className="text-slate-900">{selectedSubForChangeTrainer.packageName}</strong></div>
                <div>Current Coach: <strong className="text-indigo-600">{selectedSubForChangeTrainer.trainerName}</strong></div>
                <div>Remaining Sessions: <strong className="text-slate-900">{selectedSubForChangeTrainer.remainingSessions}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Select New PT Coach
                </label>
                <select
                  required
                  value={newTrainerId}
                  onChange={(e) => setNewTrainerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Choose New Coach --</option>
                  {trainers
                    .filter((t) => t.id !== selectedSubForChangeTrainer.trainerId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.specializations?.join(', ') || 'General PT'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Reason for Transfer (Audit Mandate)
                </label>
                <textarea
                  required
                  rows={3}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Trainee requested evening coach due to work shift change"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Future conducted sessions will credit commission to the newly assigned coach. Historical completed sessions remain credited to the original coach.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubForChangeTrainer(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Confirm Coach Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assignment History Audit Log */}
      {selectedSubForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Coach Assignment History Trail
              </h3>
              <button
                onClick={() => setSelectedSubForHistory(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-slate-600">
                Audit trail for Trainee <strong>{selectedSubForHistory.traineeName}</strong> under package <strong>{selectedSubForHistory.packageName}</strong>:
              </div>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                {selectedSubForHistory.history?.map((hist, index) => (
                  <div key={index} className="relative pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600"></div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-900 text-sm">
                        {hist.newTrainerName || 'Coach Assigned'} {hist.previousTrainerName && `(from ${hist.previousTrainerName})`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Action: {hist.action} | Time: {hist.timestamp} | By: {hist.performedBy}
                      </div>
                      <div className="text-slate-600 mt-1 italic">
                        Reason: "{hist.reason || 'Routine Assignment'}"
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSubForHistory(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New PT Subscription */}
      {isNewSubscriptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Assign New Personal Training Package</h3>
              <button
                onClick={() => setIsNewSubscriptionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSubscription} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Trainee / Member</label>
                <select
                  value={traineeId}
                  onChange={(e) => setTraineeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {trainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">PT Package</label>
                <select
                  value={packageId}
                  onChange={(e) => {
                    setPackageId(e.target.value);
                    const p = packages.find((pkg) => pkg.id === e.target.value);
                    if (p) setInitialPayment(p.price);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{(p.price || 0).toLocaleString('en-IN')} ({p.sessionsCount} Sessions, {p.durationDays} Days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Assigned PT Coach</label>
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.specializations?.join(', ') || 'Coach'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Initial Payment Received (₹)</label>
                  <input
                    type="number"
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Card</option>
                  <option value="bank_transfer">Net Banking</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSubscriptionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Assign & Activate PT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
