import { describe, expect, it } from 'vitest';
import { PTRevenueService } from './ptRevenueService';
import { RevenueSharingRule } from '../types';

const rule = (overrides: Partial<RevenueSharingRule>): RevenueSharingRule => ({
  model: 'percentage',
  discountPolicy: 'net_price',
  refundPolicy: 'proportional',
  ...overrides,
});

describe('PTRevenueService.calculateRevenueSplit', () => {
  describe('percentage model', () => {
    it('defaults to a 60/40 split when no percentages are configured', () => {
      const r = PTRevenueService.calculateRevenueSplit(10000, 0, rule({ model: 'percentage' }));
      expect(r.trainerShare).toBe(6000);
      expect(r.branchShare).toBe(4000);
      expect(r.netPTRevenue).toBe(10000);
    });

    it('honors an explicit trainer/branch percent pair', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        10000, 0, rule({ model: 'percentage', trainerPercent: 70, branchPercent: 30 })
      );
      expect(r.trainerShare).toBe(7000);
      expect(r.branchShare).toBe(3000);
    });

    it('derives branchPercent as the complement when only trainerPercent is given', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        10000, 0, rule({ model: 'percentage', trainerPercent: 65 })
      );
      expect(r.formulaExplanation).toContain('35%');
    });

    it('applies the discount before splitting under the default net_price policy', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        10000, 2000, rule({ model: 'percentage', trainerPercent: 60 })
      );
      expect(r.netPTRevenue).toBe(8000);
      expect(r.trainerShare).toBe(4800); // 60% of the discounted 8000
      expect(r.branchShare).toBe(3200);
    });

    it('splits on the pre-discount price under the original_price policy, but still caps branch retention at net revenue', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        10000, 2000, rule({ model: 'percentage', trainerPercent: 60, discountPolicy: 'original_price' })
      );
      // 60% of 10000 (stated price) = 6000 to trainer
      expect(r.trainerShare).toBe(6000);
      // Branch gets whatever's left of the actually-collected 8000, never negative
      expect(r.branchShare).toBe(2000);
    });

    it('clamps net revenue at zero when the discount exceeds the package price', () => {
      const r = PTRevenueService.calculateRevenueSplit(5000, 8000, rule({ model: 'percentage' }));
      expect(r.netPTRevenue).toBe(0);
      expect(r.trainerShare).toBe(0);
      expect(r.branchShare).toBe(0);
    });

    it('rounds the trainer share to the nearest rupee', () => {
      // 33% of 10000 = 3300 exactly; use a case that lands on .5
      const r = PTRevenueService.calculateRevenueSplit(
        10001, 0, rule({ model: 'percentage', trainerPercent: 50 })
      );
      expect(r.trainerShare).toBe(Math.round(10001 * 0.5));
      expect(Number.isInteger(r.trainerShare)).toBe(true);
    });

    it('treats a zero package price as zero revenue without dividing by zero or throwing', () => {
      const r = PTRevenueService.calculateRevenueSplit(0, 0, rule({ model: 'percentage' }));
      expect(r.trainerShare).toBe(0);
      expect(r.branchShare).toBe(0);
    });
  });

  describe('fixed_trainer model', () => {
    it('pays the fixed amount to the trainer and the remainder to the branch', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        20000, 0, rule({ model: 'fixed_trainer', fixedTrainerAmount: 12000 })
      );
      expect(r.trainerShare).toBe(12000);
      expect(r.branchShare).toBe(8000);
    });

    it('caps the trainer at the actual net revenue when the fixed amount would exceed it', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        5000, 0, rule({ model: 'fixed_trainer', fixedTrainerAmount: 12000 })
      );
      expect(r.trainerShare).toBe(5000); // capped, not 12000
      expect(r.branchShare).toBe(0);
    });

    it('falls back to a ₹10,000 default when no fixed amount is configured', () => {
      const r = PTRevenueService.calculateRevenueSplit(20000, 0, rule({ model: 'fixed_trainer' }));
      expect(r.trainerShare).toBe(10000);
    });
  });

  describe('per_session model', () => {
    it('multiplies the configured per-session rate by sessions conducted', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        12000, 0, rule({ model: 'per_session', perSessionCommission: 600 }), 10, 20
      );
      expect(r.perSessionRate).toBe(600);
      expect(r.trainerShare).toBe(6000); // 10 conducted, not 20 total
      expect(r.branchShare).toBe(6000);
    });

    it('uses totalSessions as the multiplier when no sessions have been conducted yet', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        12000, 0, rule({ model: 'per_session', perSessionCommission: 600 }), 0, 20
      );
      expect(r.trainerShare).toBe(12000); // 20 * 600, capped at net revenue anyway
    });

    it('caps the trainer share at net revenue even if the rate * sessions would exceed it', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        5000, 0, rule({ model: 'per_session', perSessionCommission: 600 }), 20, 20
      );
      expect(r.trainerShare).toBe(5000);
      expect(r.branchShare).toBe(0);
    });

    it('derives a default per-session rate from net revenue / total sessions when unset', () => {
      const r = PTRevenueService.calculateRevenueSplit(20000, 0, rule({ model: 'per_session' }), 10, 20);
      expect(r.perSessionRate).toBe(Math.round((20000 / 20) * 0.6));
    });

    it('falls back to a flat ₹600 default when totalSessions is zero (avoids divide-by-zero)', () => {
      const r = PTRevenueService.calculateRevenueSplit(20000, 0, rule({ model: 'per_session' }), 0, 0);
      expect(r.perSessionRate).toBe(600);
      expect(Number.isFinite(r.trainerShare)).toBe(true);
    });

    it('caps sessionsConducted beyond totalSessions at the net revenue (no over-payment)', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        6000, 0, rule({ model: 'per_session', perSessionCommission: 600 }), 25, 20
      );
      expect(r.trainerShare).toBeLessThanOrEqual(6000);
    });
  });

  describe('hybrid model', () => {
    it('combines a base stipend with a variable percentage commission', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        20000, 0, rule({ model: 'hybrid', hybridBaseAmount: 4000, hybridCommissionPercent: 30 })
      );
      expect(r.trainerShare).toBe(4000 + Math.round(20000 * 0.3));
      expect(r.branchShare).toBe(20000 - r.trainerShare);
    });

    it('caps the combined trainer share at net revenue', () => {
      const r = PTRevenueService.calculateRevenueSplit(
        5000, 0, rule({ model: 'hybrid', hybridBaseAmount: 4000, hybridCommissionPercent: 50 })
      );
      expect(r.trainerShare).toBe(5000);
      expect(r.branchShare).toBe(0);
    });

    it('uses the documented defaults (₹4,000 base / 30%) when unconfigured', () => {
      const r = PTRevenueService.calculateRevenueSplit(10000, 0, rule({ model: 'hybrid' }));
      expect(r.trainerShare).toBe(4000 + 3000);
    });
  });

  it('always returns branchShare + trainerShare === netPTRevenue for every model (accounting integrity)', () => {
    const models: RevenueSharingRule[] = [
      rule({ model: 'percentage', trainerPercent: 60 }),
      rule({ model: 'fixed_trainer', fixedTrainerAmount: 5000 }),
      rule({ model: 'per_session', perSessionCommission: 600 }),
      rule({ model: 'hybrid', hybridBaseAmount: 2000, hybridCommissionPercent: 20 }),
    ];
    for (const m of models) {
      const r = PTRevenueService.calculateRevenueSplit(17000, 1000, m, 8, 15);
      expect(r.trainerShare + r.branchShare).toBe(r.netPTRevenue);
    }
  });
});

describe('PTRevenueService.calculateRefundImpact', () => {
  const percentRule = rule({ model: 'percentage', trainerPercent: 60 });

  it('proportional policy reduces trainer and branch shares in proportion to the refund', () => {
    const result = PTRevenueService.calculateRefundImpact(10000, 6000, 10, 5, 5000, 'proportional', percentRule);
    // Refunding 50% of collected revenue reduces trainer share by 50%
    expect(result.trainerReduction).toBe(3000);
    expect(result.branchReduction).toBe(2000);
    expect(result.newTrainerShare).toBe(3000);
  });

  it('completed_sessions_only policy protects earnings for sessions already delivered', () => {
    const result = PTRevenueService.calculateRefundImpact(10000, 6000, 10, 4, 6000, 'completed_sessions_only', percentRule);
    const earned = Math.round((6000 / 10) * 4);
    expect(result.newTrainerShare).toBe(earned);
    expect(result.trainerReduction).toBe(6000 - earned);
  });

  it('recalculate policy re-derives the trainer share from the reduced net revenue', () => {
    const result = PTRevenueService.calculateRefundImpact(10000, 6000, 10, 4, 4000, 'recalculate', percentRule);
    const expectedNewShare = PTRevenueService.calculateRevenueSplit(6000, 0, percentRule, 4, 10).trainerShare;
    expect(result.newTrainerShare).toBe(expectedNewShare);
  });

  it('clamps a refund amount larger than the net collected revenue', () => {
    const result = PTRevenueService.calculateRefundImpact(5000, 3000, 10, 5, 999999, 'proportional', percentRule);
    // Refunding "everything" (clamped to netCollected) removes the full trainer share
    expect(result.newTrainerShare).toBe(0);
  });

  it('clamps a negative refund amount to zero (no negative refunds)', () => {
    const result = PTRevenueService.calculateRefundImpact(10000, 6000, 10, 5, -500, 'proportional', percentRule);
    expect(result.trainerReduction).toBe(0);
    expect(result.newTrainerShare).toBe(6000);
  });

  it('does not divide by zero when netCollected is zero', () => {
    const result = PTRevenueService.calculateRefundImpact(0, 0, 10, 0, 0, 'proportional', percentRule);
    expect(Number.isFinite(result.trainerReduction)).toBe(true);
    expect(result.newTrainerShare).toBe(0);
  });

  it('does not divide by zero when totalSessions is zero under completed_sessions_only', () => {
    const result = PTRevenueService.calculateRefundImpact(10000, 6000, 0, 0, 1000, 'completed_sessions_only', percentRule);
    expect(Number.isFinite(result.newTrainerShare)).toBe(true);
  });
});

describe('PTRevenueService.formatCurrency', () => {
  it('formats INR amounts without decimals', () => {
    expect(PTRevenueService.formatCurrency(150000)).toBe('₹1,50,000');
  });

  it('formats zero', () => {
    expect(PTRevenueService.formatCurrency(0)).toBe('₹0');
  });
});
