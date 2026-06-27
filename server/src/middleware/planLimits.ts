import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db.js';
import { getPlan } from '../utils/plans.js';

/**
 * Resolve a team's effective plan tier. teams.plan is the source of truth —
 * the mobile app writes/reads it directly via Supabase (in-app purchases,
 * RevenueCat webhooks, etc.). team_billing.plan_id is a Stripe-history
 * mirror for the web; fall back to it only when teams.plan is unset, so an
 * account that predates the app's plan tracking still resolves correctly.
 */
export async function getTeamPlanId(teamId: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ plan: string | null }[]>`
    SELECT plan FROM public.teams WHERE id = ${teamId}::uuid
  `;
  if (rows[0]?.plan) return rows[0].plan;
  const billing = await prisma.teamBilling.findUnique({ where: { teamId } });
  return billing?.planId ?? 'free';
}

export async function enforceItemLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const teamId = req.auth?.teamId;
  if (!teamId) { res.status(403).json({ error: 'Team membership required' }); return; }

  const plan = getPlan(await getTeamPlanId(teamId));
  if (plan.maxItems === Infinity) { next(); return; }

  const itemCount = await prisma.item.count({ where: { teamId } });
  if (itemCount >= plan.maxItems) {
    res.status(403).json({
      error: 'Plan limit reached',
      message: `Your ${plan.name} plan supports up to ${plan.maxItems} items. Please upgrade to add more.`,
      currentCount: itemCount,
      maxItems: plan.maxItems,
      planId: plan.id,
    });
    return;
  }
  next();
}

export async function enforceUserLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const teamId = req.auth?.teamId;
  if (!teamId) { res.status(403).json({ error: 'Team membership required' }); return; }

  const plan = getPlan(await getTeamPlanId(teamId));
  if (plan.maxUsers === Infinity) { next(); return; }

  const memberCount = await prisma.teamMember.count({ where: { teamId } });
  if (memberCount >= plan.maxUsers) {
    res.status(403).json({
      error: 'Plan limit reached',
      message: `Your ${plan.name} plan supports up to ${plan.maxUsers} users. Please upgrade.`,
      currentCount: memberCount,
      maxUsers: plan.maxUsers,
      planId: plan.id,
    });
    return;
  }
  next();
}
