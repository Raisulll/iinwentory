// Plan IDs are now plain strings stored in public.team_billing.plan_id. The
// previous Prisma `PlanId` enum is gone (Supabase dump uses text + CHECK
// constraints rather than native enums for app-level enums).

export type PlanId = 'free' | 'advanced' | 'premium' | 'enterprise';

export const PLAN_IDS: readonly PlanId[] = ['free', 'advanced', 'premium', 'enterprise'] as const;

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
    maxItems: 200,
    maxUsers: 1,
    customFields: 0,
    activityHistoryMonths: 2,
    monthlyPrice: 0,
    yearlyPrice: 0,
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
