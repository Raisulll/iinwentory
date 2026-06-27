export type PlanId = 'free' | 'advanced' | 'ultra' | 'premium' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  maxItems: number;
  maxUsers: number;
  customFields: number;
  activityHistoryMonths: number; // Infinity = unlimited
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  color: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    maxItems: 100,
    maxUsers: 1,
    customFields: 1,
    activityHistoryMonths: 1,
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: '#10b981',
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    maxItems: 500,
    maxUsers: 2,
    customFields: 5,
    activityHistoryMonths: 12,
    monthlyPrice: 49,
    yearlyPrice: 24,
    color: '#2563eb',
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    maxItems: 2000,
    maxUsers: 5,
    customFields: 10,
    activityHistoryMonths: 36,
    monthlyPrice: 149,
    yearlyPrice: 74,
    color: '#294EA7',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    maxItems: 5000,
    maxUsers: 8,
    customFields: 20,
    activityHistoryMonths: Infinity,
    monthlyPrice: 299,
    yearlyPrice: 149,
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

const VALID_PLAN_IDS: PlanId[] = ['free', 'advanced', 'ultra', 'premium', 'enterprise'];

export function getPlan(id: string | null | undefined): Plan {
  if (id && VALID_PLAN_IDS.includes(id as PlanId)) {
    return PLANS[id as PlanId];
  }
  return PLANS.free;
}

/** Next plan up from the current one, for upgrade prompts. */
export function getNextPlan(id: PlanId): Plan | null {
  const order: PlanId[] = ['free', 'advanced', 'ultra', 'premium', 'enterprise'];
  const idx = order.indexOf(id);
  if (idx === -1 || idx === order.length - 1) return null;
  return PLANS[order[idx + 1]];
}
