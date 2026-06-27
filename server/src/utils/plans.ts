// Plan IDs are now plain strings stored in public.team_billing.plan_id. The
// previous Prisma `PlanId` enum is gone (Supabase dump uses text + CHECK
// constraints rather than native enums for app-level enums).

export type PlanId = 'free' | 'advanced' | 'ultra' | 'premium' | 'enterprise';

export const PLAN_IDS: readonly PlanId[] = ['free', 'advanced', 'ultra', 'premium', 'enterprise'] as const;

export interface PlanLimits {
  id: PlanId;
  name: string;
  maxItems: number;
  maxUsers: number;
  customFields: number;
  activityHistoryMonths: number;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    maxItems: 100,
    maxUsers: 1,
    customFields: 1,
    activityHistoryMonths: 1,
    monthlyPrice: 0,
    yearlyPrice: 0,
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
  },
};

export function getPlan(id: string | null | undefined): PlanLimits {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.free;
}
