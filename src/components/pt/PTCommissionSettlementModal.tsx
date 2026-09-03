import React, { useState } from 'react';
import { X, HandCoins, CheckCircle2, AlertCircle } from 'lucide-react';
import { Trainer, PTCommissionSettlement, CurrentUser } from '../../types';
import { storageService } from '../../services/storageService';

interface PTCommissionSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainers: Trainer[];
  currentUser?: CurrentUser;
  selectedTrainerId?: string;
  preselectedTrainerId?: string;
  onSettled?: () => void;
  onSettlementCreated?: () => void;
}

export const PTCommissionSettlementModal: React.FC<PTCommissionSettlementModalProps> = ({
  isOpen,
  onClose,
  trainers,
  currentUser,
  selectedTrainerId,
  preselectedTrainerId,
  onSettled,
  onSettlementCreated,
}) => {
  const initialTrainerId = preselectedTrainerId || selectedTrainerId || (trainers[0]?.id || '');
  const [trainerId, setTrainerId] = useState<string>(initialTrainerId);
  const [amount, setAmount] = useState<number>(4000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>('IMPS-' + Math.floor(100000 + Math.random() * 900000));
  const [notes, setNotes] = useState<string>('Monthly personal training commission disbursement');

  // Sync trainer when selected prop changes
  React.useEffect(() => {
    const target = preselectedTrainerId || selectedTrainerId;
    if (target) {
      setTrainerId(target);
    }
  }, [preselectedTrainerId, selectedTrainerId, isOpen]);

  if (!isOpen) return null;

  const activeUser = currentUser || storageService.getCurrentUser() || {
    id: 'admin-1',
    name: 'Super Administrator',
    email: 'admin@gymos-fitness.com',
    role: 'admin',
    branchId: 'all',
  };

  const currentTrainer = trainers.find((t) => t.id === trainerId);
  const earned = currentTrainer?.ptCommissionEarned || 0;
  const paid = currentTrainer?.ptCommissionPaid || 0;
  const outstanding = currentTrainer?.ptCommissionOutstanding || Math.max(0, earned - paid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrainer || amount <= 0) return;

    if (amount > outstanding) {
      if (!window.confirm(`Payment amount (₹${(amount || 0).toLocaleString('en-IN')}) exceeds currently outstanding commission (₹${(outstanding || 0).toLocaleString('en-IN')}). Proceed as advance/excess settlement?`)) {
        return;
      }
    }

    const settlement: PTCommissionSettlement = {
      id: `set-${Date.now()}`,
      settlementNumber: `SET-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      trainerId: currentTrainer.id,
      trainerName: currentTrainer.fullName,
      branchId: currentTrainer.branchId,
      amount,
      settlementDate: new Date().toISOString().substring(0, 10),
      paymentMethod,
      referenceNumber,
      approvedBy: `${activeUser.name} (${activeUser.role})`,
      notes,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    storageService.recordSettlement(settlement);
    if (onSettled) onSettled();
    if (onSettlementCreated) onSettlementCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Settle PT Trainer Commission
              </h3>
              <p className="text-xs text-slate-500">
                Independent commission disbursement ledger (Section 68)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Select Trainer
            </label>
            <select
              value={trainerId}
              onChange={(e) => {
                setTrainerId(e.target.value);
                const t = trainers.find((tr) => tr.id === e.target.value);
                if (t) setAmount(t.ptCommissionOutstanding || 4000);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
            >
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} (Outstanding: ₹{(t.ptCommissionOutstanding || 0).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* Trainer Commission Status Box */}
          {currentTrainer && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold">Commission Earned</div>
                <div className="text-slate-900 font-bold text-sm mt-0.5">
                  ₹{(earned || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold">Commission Paid</div>
                <div className="text-emerald-600 font-bold text-sm mt-0.5">
                  ₹{(paid || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold">Commission Due</div>
                <div className="text-rose-600 font-bold text-sm mt-0.5">
                  ₹{(outstanding || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-600">
                Disbursement Amount (₹)
              </label>
              <button
                type="button"
                onClick={() => setAmount(outstanding)}
                className="text-[11px] text-indigo-600 font-semibold hover:underline"
              >
                Fill Full Due (₹{(outstanding || 0).toLocaleString('en-IN')})
              </button>
            </div>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              >
                <option value="bank_transfer">Direct Bank Transfer / NEFT</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cash">Cash Voucher</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Reference / Txn #
              </label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Disbursement Notes / Period
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared 10 completed sessions commission"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              Recording this settlement updates the trainer's paid commission and reduces outstanding dues without altering gross customer revenue receipts.
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <HandCoins className="w-4 h-4" />
              Confirm Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
