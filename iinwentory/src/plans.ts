export type PlanId = 'free' | 'advanced' | 'premium' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  maxItems: number;
  maxUsers: number;
  customFields: number; // Infinity = unlimited; 0 = not available on this plan
  activityHistoryMonths: number; // Infinity = unlimited
  monthlyPrice: number | null;
  yearlyPrice: number | null; // per-month price when billed yearly
  color: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    maxItems: 200,
    maxUsers: 1,
    customFields: 0,
    activityHistoryMonths: 2,
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: '#10b981',
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    maxItems: 1000,
    maxUsers: 5,
    customFields: Infinity,
    activityHistoryMonths: 24,
    monthlyPrice: 25,
    yearlyPrice: 15,
    color: '#2563eb',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    maxItems: 5000,
    maxUsers: 10,
    customFields: Infinity,
    activityHistoryMonths: 48,
    monthlyPrice: 75,
    yearlyPrice: 50,
    color: '#7c3aed',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    maxItems: Infinity,
    maxUsers: Infinity,
    customFields: Infinity,
    activityHistoryMonths: Infinity,
    monthlyPrice: null,
    yearlyPrice: null,
    color: '#111827',
  },
};

const VALID_PLAN_IDS: PlanId[] = ['free', 'advanced', 'premium', 'enterprise'];

export function getPlan(id: string | null | undefined): Plan {
  if (id && VALID_PLAN_IDS.includes(id as PlanId)) {
    return PLANS[id as PlanId];
  }
  return PLANS.free;
}

/** Next plan up from the current one, for upgrade prompts. */
export function getNextPlan(id: PlanId): Plan | null {
  const order: PlanId[] = ['free', 'advanced', 'premium', 'enterprise'];
  const idx = order.indexOf(id);
  if (idx === -1 || idx === order.length - 1) return null;
  return PLANS[order[idx + 1]];
}
