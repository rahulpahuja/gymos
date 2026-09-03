import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, CheckCircle2, Split, Dumbbell, Users } from 'lucide-react';
import { Trainee, Receipt, CurrentUser, PaymentTransaction } from '../../types';
import { storageService } from '../../services/storageService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainees: Trainee[];
  currentUser?: CurrentUser;
  onPaymentSuccess: (receipt: Receipt) => void;
  packages?: any[];
  branches?: any[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  trainees,
  currentUser,
  onPaymentSuccess,
}) => {
  const [traineeId, setTraineeId] = useState<string>(trainees[0]?.id || '');
  const [membershipAmount, setMembershipAmount] = useState<number>(12000);
  const [ptAmount, setPtAmount] = useState<number>(20000);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    'UPI-' + Math.floor(100000000 + Math.random() * 900000000)
  );
  const [notes, setNotes] = useState<string>('Combined Membership + PT quarterly renewal');

  if (!isOpen) return null;

  const currentTrainee = trainees.find((t) => t.id === traineeId) || trainees[0];
  const totalAmount = membershipAmount + ptAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrainee || totalAmount <= 0) return;

    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const paymentTx: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      receiptNumber: receiptNo,
      traineeId: currentTrainee.id,
      traineeName: currentTrainee.fullName,
      branchId: currentTrainee.branchId,
      paymentDate: new Date().toISOString().substring(0, 10),
      paymentMethod,
      referenceNumber,
      totalAmount,
      allocation: {
        generalMembershipAmount: membershipAmount,
        ptAmount,
      },
      discount: 0,
      tax: 0,
      previousDue: currentTrainee.totalDue || 0,
      remainingDue: Math.max(0, (currentTrainee.totalDue || 0) - totalAmount),
      notes,
      createdBy: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };

    storageService.recordPayment(paymentTx);

    const receipt = storageService.getReceiptByNumber(receiptNo);
    if (receipt) {
      onPaymentSuccess(receipt);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Record Segregated Payment (Section 60 & 69)
              </h3>
              <p className="text-xs text-slate-500">
                Maintains separate accounting for General Membership vs Personal Training
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm text-slate-700">
          {/* Trainee Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Select Trainee / Member
            </label>
            <select
              value={traineeId}
              onChange={(e) => setTraineeId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
            >
              {trainees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.phone}) - Total Due: ₹{(t.totalDue || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          {/* Current Outstanding Balances */}
          {currentTrainee && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  General Membership Due
                </span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  ₹{(currentTrainee.membershipDue ?? 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Personal Training (PT) Due
                </span>
                <div className="font-bold text-indigo-700 text-sm mt-0.5">
                  ₹{(currentTrainee.ptDue ?? 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          {/* Revenue Stream Allocation (Section 60 Example) */}
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Split className="w-3.5 h-3.5 text-indigo-600" />
                Revenue Stream Allocation
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                Strict Separation
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  General Membership (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={membershipAmount}
                  onChange={(e) => setMembershipAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal Training (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={ptAmount}
                  onChange={(e) => setPtAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-indigo-700"
                />
              </div>
            </div>

            {/* Total Paid calculation */}
            <div className="pt-2 border-t border-indigo-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Total Customer Payment:
              </span>
              <span className="text-lg font-black text-indigo-950">
                ₹{(totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              >
                <option value="UPI">UPI / QR (GPay, PhonePe)</option>
                <option value="Cash">Cash In Hand</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Net Banking / IMPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Txn Ref / Cheque #
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
              Payment Remarks / Package Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Prompt Audit Note */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              The system records <strong>₹{(membershipAmount || 0).toLocaleString('en-IN')}</strong> to General Membership Revenue and <strong>₹{(ptAmount || 0).toLocaleString('en-IN')}</strong> to PT Revenue with automatic trainer revenue-sharing split.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Generate Segregated Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
