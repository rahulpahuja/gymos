/**
 * PT Revenue Sharing Engine
 * Strict separation of PT revenue from general gym revenue.
 * Implements configurable calculation models:
 * 1. Percentage Split (e.g. 60/40, 70/30, 50/50)
 * 2. Fixed Trainer Amount (e.g. ₹10,000 to Trainer, remainder to Branch)
 * 3. Per Session Commission (e.g. ₹600/session completed)
 * 4. Hybrid (Base Trainer Amount + % Commission)
 *
 * Fully explainable and auditable (Section 83).
 */

import { RevenueSharingRule, PTRevenueSplitResult, RefundPolicy } from '../types';

export class PTRevenueService {
  /**
   * Calculates the revenue split between Trainer and Branch based on the configured rule.
   */
  static calculateRevenueSplit(
    packagePrice: number,
    discount: number = 0,
    rule: RevenueSharingRule,
    sessionsConducted: number = 0,
    totalSessions: number = 1
  ): PTRevenueSplitResult {
    const netPTRevenue = Math.max(0, packagePrice - discount);
    // Base amount used for split calculation (depends on discount policy)
    const calculationBase = rule.discountPolicy === 'original_price' ? packagePrice : netPTRevenue;

    let trainerShare = 0;
    let branchShare = 0;
    let formulaExplanation = '';
    let perSessionRate = 0;
    const auditBreakdown: { label: string; value: string | number }[] = [];

    auditBreakdown.push({ label: 'Package Stated Price', value: `₹${(packagePrice || 0).toLocaleString('en-IN')}` });
    if (discount > 0) {
      auditBreakdown.push({ label: 'Discount Applied', value: `-₹${(discount || 0).toLocaleString('en-IN')}` });
    }
    auditBreakdown.push({ label: 'Net Collected PT Revenue', value: `₹${(netPTRevenue || 0).toLocaleString('en-IN')}` });
    auditBreakdown.push({
      label: 'Discount Policy Base',
      value: rule.discountPolicy === 'original_price' ? 'Stated Price (Before Discount)' : 'Net Collected Revenue',
    });

    switch (rule.model) {
      case 'percentage': {
        const trainerPercent = rule.trainerPercent ?? 60;
        const branchPercent = rule.branchPercent ?? (100 - trainerPercent);
        trainerShare = Math.round((calculationBase * trainerPercent) / 100);
        // Branch retains the remaining net revenue (to ensure total equals net collected)
        branchShare = Math.max(0, netPTRevenue - trainerShare);

        formulaExplanation = `₹${(calculationBase || 0).toLocaleString('en-IN')} × ${trainerPercent}% = ₹${(trainerShare || 0).toLocaleString('en-IN')} (Trainer). Branch retains ₹${(branchShare || 0).toLocaleString('en-IN')} (${branchPercent}% nominal).`;
        auditBreakdown.push({ label: 'Trainer Share %', value: `${trainerPercent}%` });
        auditBreakdown.push({ label: 'Branch Share %', value: `${branchPercent}%` });
        auditBreakdown.push({ label: 'Trainer Allocation', value: `₹${(trainerShare || 0).toLocaleString('en-IN')}` });
        auditBreakdown.push({ label: 'Branch Allocation', value: `₹${(branchShare || 0).toLocaleString('en-IN')}` });
        break;
      }

      case 'fixed_trainer': {
        const fixedAmt = rule.fixedTrainerAmount ?? 10000;
        trainerShare = Math.min(netPTRevenue, fixedAmt);
        branchShare = Math.max(0, netPTRevenue - trainerShare);

        formulaExplanation = `Fixed Trainer Agreement: ₹${(fixedAmt || 0).toLocaleString('en-IN')}. Branch retains net remainder ₹${(branchShare || 0).toLocaleString('en-IN')}.`;
        auditBreakdown.push({ label: 'Fixed Trainer Fee', value: `₹${(fixedAmt || 0).toLocaleString('en-IN')}` });
        auditBreakdown.push({ label: 'Trainer Allocation', value: `₹${(trainerShare || 0).toLocaleString('en-IN')}` });
        auditBreakdown.push({ label: 'Branch Allocation', value: `₹${(branchShare || 0).toLocaleString('en-IN')}` });
        break;
      }

      case 'per_session': {
        perSessionRate = rule.perSessionCommission ?? (totalSessions > 0 ? Math.round(netPTRevenue / totalSessions * 0.6) : 600);
        // If package fully completed or prospective:
        trainerShare = perSessionRate * (sessionsConducted > 0 ? sessionsConducted : totalSessions);
        trainerShare = Math.min(netPTRevenue, trainerShare);
        branchShare = Math.max(0, netPTRevenue - trainerShare);

        formulaExplanation = `${totalSessions} Sessions @ ₹${(perSessionRate || 0).toLocaleString('en-IN')}/session = ₹${(trainerShare || 0).toLocaleString('en-IN')} (Trainer). Branch retains ₹${(branchShare || 0).toLocaleString('en-IN')}.`;
        auditBreakdown.push({ label: 'Per Session Commission', value: `₹${(perSessionRate || 0).toLocaleString('en-IN')}` });
        auditBreakdown.push({ label: 'Session Scope', value: `${sessionsConducted > 0 ? sessionsConducted : totalSessions} Sessions` });
        auditBreakdown.push({ label: 'Trainer Allocation', value: `₹${(trainerShare || 0).toLocaleString('en-IN')}` });
        auditBreakdown.push({ label: 'Branch Allocation', value: `₹${(branchShare || 0).toLocaleString('en-IN')}` });
        break;
      }

      case 'hybrid': {
        const base = rule.hybridBaseAmount ?? 4000;
        const percent = rule.hybridCommissionPercent ?? 30;
        const variable = Math.round((calculationBase * percent) / 100);
        trainerShare = Math.min(netPTRevenue, base + variable);
        branchShare = Math.max(0, netPTRevenue - trainerShare);

        formulaExplanation = `Base: ₹${(base || 0).toLocaleString('en-IN')} + (${percent}% of ₹${(calculationBase || 0).toLocaleString('en-IN')} = ₹${(variable || 0).toLocaleString('en-IN')}) = ₹${(trainerShare || 0).toLocaleString('en-IN')} (Trainer). Branch retains ₹${(branchShare || 0).toLocaleString('en-IN')}.`;
        auditBreakdown.push({ label: 'Base Trainer Stipend', value: `₹${(base || 0).toLocaleString('en-IN')}` });
        auditBreakdown.push({ label: 'Variable Commission %', value: `${percent}% (₹${(variable || 0).toLocaleString('en-IN')})` });
        auditBreakdown.push({ label: 'Total Trainer Share', value: `₹${(trainerShare || 0).toLocaleString('en-IN')}` });
        auditBreakdown.push({ label: 'Branch Share', value: `₹${(branchShare || 0).toLocaleString('en-IN')}` });
        break;
      }
    }

    return {
      ptGrossRevenue: packagePrice,
      discount,
      netPTRevenue,
      trainerShare,
      branchShare,
      calculationModel: rule.model,
      formulaExplanation,
      perSessionRate,
      auditBreakdown,
    };
  }

  /**
   * Evaluates the impact of a PT Refund according to configured policy (Section 70).
   * Policy A: Refund reduces trainer commission proportionally.
   * Policy B: Trainer commission is based only on completed sessions.
   * Policy C: Trainer commission is recalculated after refund.
   */
  static calculateRefundImpact(
    netCollected: number,
    originalTrainerShare: number,
    totalSessions: number,
    completedSessions: number,
    refundAmount: number,
    policy: RefundPolicy = 'proportional',
    rule: RevenueSharingRule
  ): {
    trainerReduction: number;
    branchReduction: number;
    newTrainerShare: number;
    newBranchShare: number;
    explanation: string;
  } {
    const validRefund = Math.min(netCollected, Math.max(0, refundAmount));
    const newNetRevenue = netCollected - validRefund;

    let trainerReduction = 0;
    let branchReduction = 0;
    let newTrainerShare = originalTrainerShare;
    let explanation = '';

    if (policy === 'proportional') {
      // Proportional reduction across both trainer and branch
      const ratio = validRefund / (netCollected || 1);
      trainerReduction = Math.round(originalTrainerShare * ratio);
      branchReduction = validRefund - trainerReduction;
      newTrainerShare = Math.max(0, originalTrainerShare - trainerReduction);
      explanation = `Proportional Policy A: Refund of ₹${(validRefund || 0).toLocaleString('en-IN')} (${(ratio * 100).toFixed(1)}%) reduces Trainer Commission by ₹${(trainerReduction || 0).toLocaleString('en-IN')} and Branch by ₹${(branchReduction || 0).toLocaleString('en-IN')}.`;
    } else if (policy === 'completed_sessions_only') {
      // Trainer keeps share for completed sessions; only uncompleted sessions are refunded
      const perSessionTrainer = originalTrainerShare / (totalSessions || 1);
      const earnedByTrainer = Math.round(perSessionTrainer * completedSessions);
      trainerReduction = Math.max(0, originalTrainerShare - earnedByTrainer);
      branchReduction = validRefund - trainerReduction;
      newTrainerShare = earnedByTrainer;
      explanation = `Policy B (Completed Sessions Protected): Trainer has delivered ${completedSessions}/${totalSessions} sessions earning ₹${(earnedByTrainer || 0).toLocaleString('en-IN')}. Trainer reduction capped at ₹${(trainerReduction || 0).toLocaleString('en-IN')}.`;
    } else {
      // Recalculate full split on new net revenue
      const recalculated = this.calculateRevenueSplit(newNetRevenue, 0, rule, completedSessions, totalSessions);
      newTrainerShare = recalculated.trainerShare;
      trainerReduction = Math.max(0, originalTrainerShare - newTrainerShare);
      branchReduction = validRefund - trainerReduction;
      explanation = `Policy C (Recalculated on Remaining ₹${(newNetRevenue || 0).toLocaleString('en-IN')}): New Trainer Share is ₹${(newTrainerShare || 0).toLocaleString('en-IN')}. Reduction is ₹${(trainerReduction || 0).toLocaleString('en-IN')}.`;
    }

    const newBranchShare = Math.max(0, newNetRevenue - newTrainerShare);

    return {
      trainerReduction,
      branchReduction,
      newTrainerShare,
      newBranchShare,
      explanation,
    };
  }

  /**
   * Helper to format currency in standard Indian format (₹)
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
