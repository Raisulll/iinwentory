import { describe, it, expect } from 'vitest';
import { PLANS, PLAN_IDS, getPlan, type PlanId } from './plans.js';

describe('plans', () => {
  it('exposes a limits entry for every plan id', () => {
    for (const id of PLAN_IDS) {
      expect(PLANS[id]).toBeDefined();
      expect(PLANS[id].id).toBe(id);
    }
  });

  it('has monotonically non-decreasing item limits up the tiers', () => {
    const order: PlanId[] = ['free', 'advanced', 'ultra', 'premium', 'enterprise'];
    for (let i = 1; i < order.length; i++) {
      expect(PLANS[order[i]].maxItems).toBeGreaterThanOrEqual(PLANS[order[i - 1]].maxItems);
      expect(PLANS[order[i]].maxUsers).toBeGreaterThanOrEqual(PLANS[order[i - 1]].maxUsers);
    }
  });

  it('models unlimited enterprise tiers as Infinity', () => {
    expect(PLANS.enterprise.maxItems).toBe(Infinity);
    expect(PLANS.enterprise.maxUsers).toBe(Infinity);
    expect(PLANS.enterprise.customFields).toBe(Infinity);
  });

  it('prices the free tier at zero and leaves enterprise as custom (null)', () => {
    expect(PLANS.free.monthlyPrice).toBe(0);
    expect(PLANS.enterprise.monthlyPrice).toBeNull();
    expect(PLANS.enterprise.yearlyPrice).toBeNull();
  });

  describe('getPlan', () => {
    it('returns the matching plan for a known id', () => {
      expect(getPlan('ultra').id).toBe('ultra');
    });

    it('falls back to free for unknown, null, or undefined ids', () => {
      expect(getPlan('does-not-exist').id).toBe('free');
      expect(getPlan(null).id).toBe('free');
      expect(getPlan(undefined).id).toBe('free');
      expect(getPlan('').id).toBe('free');
    });
  });
});
