// One-off: grant Premium for ~1 year to support@imperialtrends.uk
// Authorised by site owner (Ditesh Patel) on 2026-05-12.
// Manual revert required on 2027-05-12 — there is no auto-downgrade.
import { PrismaClient } from '@prisma/client';

const TARGET_EMAIL = 'support@imperialtrends.uk';
const PLAN = 'premium';
const EXPIRES = new Date('2027-05-12T00:00:00Z');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.authUser.findUnique({
    where: { email: TARGET_EMAIL },
    include: { teamMemberships: { include: { team: true } } },
  });

  if (!user) throw new Error(`No auth.users row for ${TARGET_EMAIL}`);
  console.log(`user.id = ${user.id}`);

  if (user.teamMemberships.length === 0) {
    throw new Error(`User has no team memberships; cannot determine team_id`);
  }

  // Pick the team they created if possible, otherwise the first membership.
  const createdTeams = await prisma.team.findMany({ where: { createdBy: user.id } });
  const team = createdTeams[0] ?? user.teamMemberships[0].team;
  console.log(`team.id = ${team.id} (${team.name})`);

  const before = await prisma.teamBilling.findUnique({ where: { teamId: team.id } });
  console.log('before team_billing:', before);
  const beforeTeams = await prisma.$queryRaw`
    SELECT plan, subscription_status FROM public.teams WHERE id = ${team.id}::uuid
  `;
  console.log('before teams.plan:', beforeTeams);

  // Write to BOTH sources of truth — team_billing (web reads) AND teams.plan
  // (mobile app reads via Supabase). Skipping either makes the tier silently
  // disagree between platforms.
  await prisma.$transaction([
    prisma.teamBilling.upsert({
      where: { teamId: team.id },
      update: { planId: PLAN, trialEndsAt: EXPIRES },
      create: { teamId: team.id, planId: PLAN, trialEndsAt: EXPIRES },
    }),
    prisma.$executeRaw`
      UPDATE public.teams
      SET plan                            = ${PLAN},
          subscription_status             = 'active',
          subscription_current_period_end = ${EXPIRES},
          subscription_cancel_at_period_end = false
      WHERE id = ${team.id}::uuid
    `,
  ]);

  const afterBilling = await prisma.teamBilling.findUnique({ where: { teamId: team.id } });
  console.log('after team_billing:', afterBilling);
  const afterTeams = await prisma.$queryRaw`
    SELECT plan, subscription_status, subscription_current_period_end
    FROM public.teams WHERE id = ${team.id}::uuid
  `;
  console.log('after teams.plan:', afterTeams);
  console.log('\nDone. App should now see Premium within the next realtime tick.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
