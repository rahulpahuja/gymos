import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  X,
  ShieldCheck,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  PaymentTransaction,
  PTSubscription,
  Trainer,
  RefundPolicy,
  RefundRecord,
} from '../../types';
import { PTRevenueService } from '../../services/ptRevenueService';
import { storageService } from '../../services/storageService';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: PaymentTransaction[];
  preselectedTransaction?: PaymentTransaction | null;
  onRefundSuccess: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  transactions,
  preselectedTransaction,
  onRefundSuccess,
}) => {
  const [selectedTxId, setSelectedTxId] = useState<string>(
    preselectedTransaction?.id || (transactions.length > 0 ? transactions[0].id : '')
  );
  const [refundType, setRefundType] = useState<'pt' | 'general' | 'total'>('pt');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [policy, setPolicy] = useState<RefundPolicy>('proportional');
  const [reason, setReason] = useState<string>('Medical reason / relocation');
  const [notes, setNotes] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Synchronize when preselectedTransaction changes
  React.useEffect(() => {
    if (preselectedTransaction) {
      setSelectedTxId(preselectedTransaction.id);
    } else if (transactions.length > 0 && !selectedTxId) {
      setSelectedTxId(transactions[0].id);
    }
  }, [preselectedTransaction, transactions, selectedTxId]);

  const currentTx = useMemo(() => {
    return transactions.find((t) => t.id === selectedTxId) || transactions[0];
  }, [transactions, selectedTxId]);

  // Set default refund amount when currentTx or refundType changes
  React.useEffect(() => {
    if (currentTx) {
      if (refundType === 'pt') {
        setRefundAmount(currentTx.ptAmount || 0);
      } else if (refundType === 'general') {
        setRefundAmount(currentTx.membershipAmount || 0);
      } else {
        setRefundAmount(currentTx.totalAmount || 0);
      }
    }
  }, [currentTx, refundType]);

  // Find linked PT subscription if any
  const linkedSub = useMemo(() => {
    if (!currentTx) return null;
    const subs = storageService.getPTSubscriptions();
    return subs.find((s) => s.traineeId === currentTx.traineeId) || subs[0] || null;
  }, [currentTx]);

  // Find linked trainer if any
  const linkedTrainer = useMemo(() => {
    if (!linkedSub) return null;
    const trainers = storageService.getTrainers();
    return trainers.find((t) => t.id === linkedSub.trainerId) || null;
  }, [linkedSub]);

  // Calculate refund impact using Section 70 engine
  const calculation = useMemo(() => {
    if (!currentTx || !linkedSub) {
      return {
        trainerReduction: 0,
        branchReduction: refundAmount,
        newTrainerShare: 0,
        newBranchShare: 0,
        explanation: 'Standard general membership refund directly absorbed by Gym Operations.',
      };
    }

    if (refundType === 'general') {
      return {
        trainerReduction: 0,
        branchReduction: refundAmount,
        newTrainerShare: linkedSub.trainerCommissionTotal,
        newBranchShare: Math.max(0, linkedSub.branchShare - refundAmount),
        explanation: 'General membership refund does not affect Personal Trainer commission balances.',
      };
    }

    return PTRevenueService.calculateRefundImpact(
      linkedSub.netPrice,
      linkedSub.trainerCommissionTotal,
      linkedSub.totalSessions,
      linkedSub.completedSessions,
      refundAmount,
      policy,
      linkedSub.revenueRule
    );
  }, [currentTx, linkedSub, refundAmount, policy, refundType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTx || refundAmount <= 0) return;

    const newRefund: RefundRecord = {
      id: `ref-${Date.now()}`,
      paymentId: currentTx.id,
      receiptNumber: currentTx.receiptNumber,
      traineeId: currentTx.traineeId,
      traineeName: currentTx.traineeName,
      branchId: currentTx.branchId,
      refundType,
      amount: refundAmount,
      reason,
      refundDate: new Date().toISOString().substring(0, 10),
      paymentMethod: currentTx.paymentMethod,
      approvedBy: 'Gym Administrator',
      notes,
      trainerCommissionAdjustment: calculation.trainerReduction,
      branchRevenueAdjustment: calculation.branchReduction,
      policyApplied: policy,
      createdAt: new Date().toISOString(),
    };

    storageService.recordRefund(newRefund);

    // If PT refund, adjust subscription & trainer balances
    if (refundType !== 'general' && linkedSub && linkedTrainer) {
      const updatedSub: PTSubscription = {
        ...linkedSub,
        trainerCommissionTotal: calculation.newTrainerShare,
        trainerCommissionOutstanding: Math.max(
          0,
          calculation.newTrainerShare - linkedSub.trainerCommissionPaid
        ),
        branchShare: calculation.newBranchShare,
        status: linkedSub.remainingSessions <= 0 ? 'cancelled' : linkedSub.status,
      };
      storageService.savePTSubscription(updatedSub);

      // Adjust trainer commission
      const updatedTrainer: Trainer = {
        ...linkedTrainer,
        ptCommissionEarned: Math.max(
          0,
          linkedTrainer.ptCommissionEarned - calculation.trainerReduction
        ),
        ptCommissionOutstanding: Math.max(
          0,
          linkedTrainer.ptCommissionOutstanding - calculation.trainerReduction
        ),
      };
      storageService.saveTrainer(updatedTrainer);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onRefundSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">
                Process Refund & Commission Clawback
              </h3>
              <p className="text-xs text-gray-500">
                Audited refund policy calculation engine (Section 70)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Refund Successfully Processed!</h4>
            <p className="text-xs text-gray-500">
              Transaction marked as refunded. Trainer commission and branch ledger adjusted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Step 1: Select Transaction */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Select Original Payment Transaction
              </label>
              <select
                value={selectedTxId}
                onChange={(e) => setSelectedTxId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {transactions.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.receiptNumber} — {tx.traineeName} (₹{(tx.totalAmount || 0).toLocaleString('en-IN')}) • {tx.paymentDate}
                  </option>
                ))}
              </select>
            </div>

            {currentTx && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Paid</span>
                  <span className="text-sm font-bold text-gray-900">₹{(currentTx.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase block">Membership</span>
                  <span className="text-sm font-bold text-blue-700">₹{(currentTx.membershipAmount ?? currentTx.allocation?.generalMembershipAmount ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase block">PT Stream</span>
                  <span className="text-sm font-bold text-indigo-700">₹{(currentTx.ptAmount ?? currentTx.allocation?.ptAmount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {/* Step 2: Refund Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Refund Stream Target</label>
                <select
                  value={refundType}
                  onChange={(e) => setRefundType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
                >
                  <option value="pt">Personal Training (PT) Only</option>
                  <option value="general">General Membership Only</option>
                  <option value="total">Full Payment (Total)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  max={currentTx?.totalAmount || 100000}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                />
              </div>
            </div>

            {/* Step 3: Policy Selection (Prompt Section 70) */}
            {refundType !== 'general' && (
              <div className="space-y-2">
                <label className="block font-bold text-gray-700">
                  PT Commission Clawback Policy (Section 70)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      policy === 'proportional'
                        ? 'bg-indigo-50/70 border-indigo-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="policy"
                      value="proportional"
                      checked={policy === 'proportional'}
                      onChange={() => setPolicy('proportional')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-gray-900">
                        Policy A: Proportional Reduction
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Clawback is deducted proportionately from both Trainer Commission and Branch Net Share.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      policy === 'completed_sessions_only'
                        ? 'bg-indigo-50/70 border-indigo-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="policy"
                      value="completed_sessions_only"
                      checked={policy === 'completed_sessions_only'}
                      onChange={() => setPolicy('completed_sessions_only')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-gray-900">
                        Policy B: Completed Sessions Protected
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Trainer retains 100% of commission earned for completed sessions; only unconsumed balance is clawed back.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      policy === 'recalculate'
                        ? 'bg-indigo-50/70 border-indigo-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="policy"
                      value="recalculate"
                      checked={policy === 'recalculate'}
                      onChange={() => setPolicy('recalculate')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-gray-900">
                        Policy C: Recalculate Post-Refund
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Package split formula is rerun on the new reduced net price.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Impact Calculation Preview */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Audited Financial Impact</span>
              </div>
              <p className="text-[11px] text-amber-900">{calculation.explanation}</p>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                <div className="text-[11px]">
                  <span className="text-gray-500">Trainer Clawback:</span>{' '}
                  <strong className="text-rose-600">
                    -₹{(calculation.trainerReduction || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="text-[11px]">
                  <span className="text-gray-500">Branch Loss:</span>{' '}
                  <strong className="text-gray-900">
                    -₹{(calculation.branchReduction || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Reason & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Refund</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="Medical reason / injury">Medical reason / injury</option>
                  <option value="Relocation to another city">Relocation to another city</option>
                  <option value="Trainer unavailability">Trainer unavailability</option>
                  <option value="Dissatisfaction with service">Dissatisfaction with service</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Internal Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Approved by Head Manager..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Authorize Refund (₹{(refundAmount || 0).toLocaleString('en-IN')})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
