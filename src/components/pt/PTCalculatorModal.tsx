import React, { useState } from 'react';
import { X, Calculator, HelpCircle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PTRevenueService } from '../../services/ptRevenueService';
import { RevenueSharingRule, RevenueSplitModel, DiscountPolicy, RefundPolicy, PTPackage } from '../../types';

interface PTCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages?: PTPackage[];
}

export const PTCalculatorModal: React.FC<PTCalculatorModalProps> = ({ isOpen, onClose, packages }) => {
  const [price, setPrice] = useState<number>(20000);
  const [discount, setDiscount] = useState<number>(0);
  const [model, setModel] = useState<RevenueSplitModel>('percentage');
  const [trainerPercent, setTrainerPercent] = useState<number>(60);
  const [branchPercent, setBranchPercent] = useState<number>(40);
  const [fixedTrainerAmount, setFixedTrainerAmount] = useState<number>(10000);
  const [perSessionCommission, setPerSessionCommission] = useState<number>(600);
  const [sessionsCount, setSessionsCount] = useState<number>(20);
  const [completedSessions, setCompletedSessions] = useState<number>(12);
  const [hybridBase, setHybridBase] = useState<number>(4000);
  const [hybridPercent, setHybridPercent] = useState<number>(30);
  const [discountPolicy, setDiscountPolicy] = useState<DiscountPolicy>('net_price');

  // Refund Simulation state (Section 70)
  const [refundAmount, setRefundAmount] = useState<number>(8000);
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy>('proportional');

  if (!isOpen) return null;

  const currentRule: RevenueSharingRule = {
    model,
    trainerPercent,
    branchPercent,
    fixedTrainerAmount,
    perSessionCommission,
    hybridBaseAmount: hybridBase,
    hybridCommissionPercent: hybridPercent,
    discountPolicy,
    refundPolicy,
  };

  const splitResult = PTRevenueService.calculateRevenueSplit(
    price,
    discount,
    currentRule,
    completedSessions,
    sessionsCount
  );

  const refundResult = PTRevenueService.calculateRefundImpact(
    splitResult.netPTRevenue,
    splitResult.trainerShare,
    sessionsCount,
    completedSessions,
    refundAmount,
    refundPolicy,
    currentRule
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                PT Revenue Sharing & Auditability Engine
              </h3>
              <p className="text-xs text-slate-500">
                Test configurable revenue split agreements, discount policies, and refund rules
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Quick Prompt Presets (Sections 64, 65, 70, 71)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPrice(20000);
                  setDiscount(0);
                  setModel('percentage');
                  setTrainerPercent(60);
                  setBranchPercent(40);
                }}
                className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
              >
                Standard 60% Trainer / 40% Branch (₹20,000)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrice(25000);
                  setDiscount(0);
                  setModel('percentage');
                  setTrainerPercent(70);
                  setBranchPercent(30);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100"
              >
                Senior Coach 70% / 30%
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrice(20000);
                  setDiscount(0);
                  setModel('fixed_trainer');
                  setFixedTrainerAmount(10000);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100"
              >
                Fixed Trainer ₹10,000
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrice(20000);
                  setDiscount(0);
                  setModel('per_session');
                  setPerSessionCommission(600);
                  setSessionsCount(20);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100"
              >
                Per Session (20 × ₹600 = ₹12,000)
              </button>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Package Price (₹)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Calculation Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as RevenueSplitModel)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
              >
                <option value="percentage">Percentage Split (e.g. 60/40, 70/30)</option>
                <option value="fixed_trainer">Fixed Trainer Amount</option>
                <option value="per_session">Per Session Commission</option>
                <option value="hybrid">Hybrid (Base Stipend + %)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Discount Policy (Section 71)
              </label>
              <select
                value={discountPolicy}
                onChange={(e) => setDiscountPolicy(e.target.value as DiscountPolicy)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
              >
                <option value="net_price">Split on Actual Net Collected (Recommended)</option>
                <option value="original_price">Split on Original Stated Price</option>
              </select>
            </div>

            {/* Model-specific controls */}
            {model === 'percentage' && (
              <div className="md:col-span-2 flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Trainer Share %
                  </label>
                  <input
                    type="number"
                    value={trainerPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTrainerPercent(val);
                      setBranchPercent(Math.max(0, 100 - val));
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Branch Share %
                  </label>
                  <input
                    type="number"
                    value={branchPercent}
                    readOnly
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm font-semibold text-slate-500"
                  />
                </div>
              </div>
            )}

            {model === 'fixed_trainer' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Fixed Trainer Amount (₹)
                </label>
                <input
                  type="number"
                  value={fixedTrainerAmount}
                  onChange={(e) => setFixedTrainerAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>
            )}

            {model === 'per_session' && (
              <div className="md:col-span-2 flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Rate Per Session (₹)
                  </label>
                  <input
                    type="number"
                    value={perSessionCommission}
                    onChange={(e) => setPerSessionCommission(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Total Sessions in Package
                  </label>
                  <input
                    type="number"
                    value={sessionsCount}
                    onChange={(e) => setSessionsCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Auditability & Calculation Result Breakdown (Section 83) */}
          <div className="p-5 bg-indigo-950 text-indigo-50 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Calculation Output & Mathematical Audit
                </span>
                <div className="text-lg font-bold text-white mt-0.5">
                  {splitResult.formulaExplanation}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-indigo-900/60 p-3 rounded-lg border border-indigo-700/50">
                <div className="text-[11px] text-indigo-300">Net PT Revenue</div>
                <div className="text-lg font-bold text-emerald-400">
                  ₹{(splitResult.netPTRevenue || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-indigo-900/60 p-3 rounded-lg border border-indigo-700/50">
                <div className="text-[11px] text-indigo-300">Trainer Commission</div>
                <div className="text-lg font-bold text-amber-300">
                  ₹{(splitResult.trainerShare || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-indigo-900/60 p-3 rounded-lg border border-indigo-700/50">
                <div className="text-[11px] text-indigo-300">Branch Retained</div>
                <div className="text-lg font-bold text-cyan-300">
                  ₹{(splitResult.branchShare || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-indigo-900/60 p-3 rounded-lg border border-indigo-700/50">
                <div className="text-[11px] text-indigo-300">Sum Integrity Check</div>
                <div className="text-xs font-mono font-bold text-emerald-300 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  100% Balanced
                </div>
              </div>
            </div>

            <div className="text-xs text-indigo-200/90 font-mono bg-indigo-900/40 p-2.5 rounded-lg border border-indigo-800">
              [Audit Trail]: PT Gross: ₹{price} | Discount: ₹{discount} | Net: ₹{splitResult.netPTRevenue} | Model: {model.toUpperCase()} | Trainer: ₹{splitResult.trainerShare} | Branch: ₹{splitResult.branchShare}
            </div>
          </div>

          {/* Refund Simulation Section (Section 70) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-amber-50/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Refund Impact Simulator (Section 70 Configurable Policies)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Sessions Completed
                </label>
                <input
                  type="number"
                  value={completedSessions}
                  onChange={(e) => setCompletedSessions(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Refund Amount Requested (₹)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Configured Policy
                </label>
                <select
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value as RefundPolicy)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="proportional">Policy A: Proportional Commission Reduction</option>
                  <option value="completed_sessions_only">Policy B: Protect Completed Sessions</option>
                  <option value="recalculate">Policy C: Full Recalculation</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-800">
                {refundResult.explanation}
              </div>
              <div className="flex gap-4 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <span>Trainer Commission Reduction: <strong className="text-rose-600">-₹{(refundResult.trainerReduction || 0).toLocaleString('en-IN')}</strong></span>
                <span>Branch Reduction: <strong className="text-amber-600">-₹{(refundResult.branchReduction || 0).toLocaleString('en-IN')}</strong></span>
                <span>Adjusted Trainer Commission: <strong className="text-emerald-700">₹{(refundResult.newTrainerShare || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Close Calculator
          </button>
        </div>
      </div>
    </div>
  );
};
