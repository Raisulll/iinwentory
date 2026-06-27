// Read-only: dump every plan-related signal for an account so we can see
// where the mobile app is actually getting its tier from.
//   node scripts/diag-plan.mjs <email>

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2];
if (!email) {
  console.error('usage: node scripts/diag-plan.mjs <email>');
  process.exit(1);
}

const prisma = new PrismaClient({ log: ['error'] });

try {
  const user = await prisma.authUser.findUnique({
    where: { email },
    include: {
      profile: true,
      teamMemberships: { include: { team: true } },
      createdTeams: true,
    },
  });
  if (!user) { console.error(`No auth.users row for ${email}`); process.exit(1); }

  console.log(`\n=== ${email} ===`);
  console.log(`user.id: ${user.id}`);
  console.log(`\nprofile.permissions: ${JSON.stringify(user.profile?.permissions, null, 2)}`);
  console.log(`profile.role:        ${user.profile?.role}`);
  console.log(`profile.business:    ${user.profile?.businessName ?? '(none)'}`);

  const teams = user.createdTeams.length > 0 ? user.createdTeams : user.teamMemberships.map(m => m.team);
  for (const team of teams) {
    console.log(`\n── team ${team.id}  "${team.name}" ──`);
    const billing = await prisma.teamBilling.findUnique({ where: { teamId: team.id } });
    console.log(`  team_billing (web-only):`);
    console.log(`    planId:               ${billing?.planId ?? '(no row)'}`);
    console.log(`    stripeCustomerId:     ${billing?.stripeCustomerId ?? '(none)'}`);
    console.log(`    stripeSubscriptionId: ${billing?.stripeSubscriptionId ?? '(none)'}`);
    console.log(`    trialEndsAt:          ${billing?.trialEndsAt ?? '(none)'}`);

    const members = await prisma.teamMember.count({ where: { teamId: team.id } });
    const items = await prisma.item.count({ where: { teamId: team.id, status: { not: 'deleted' } } });
    console.log(`  members: ${members}    items: ${items}`);
  }

  // Look for any column that smells like "plan" in tables we haven't enumerated.
  console.log('\n── DB schemas containing plan-ish columns ──');
  const cols = await prisma.$queryRaw`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema IN ('public','auth')
      AND (column_name ILIKE '%plan%'
        OR column_name ILIKE '%subscription%'
        OR column_name ILIKE '%tier%'
        OR column_name ILIKE '%premium%'
        OR column_name ILIKE '%entitlement%'
        OR column_name ILIKE '%pro_until%')
    ORDER BY table_schema, table_name, column_name
  `;
  for (const c of cols) {
    console.log(`  ${c.table_schema}.${c.table_name}.${c.column_name}  (${c.data_type})`);
  }

  // Also list any tables whose name smells like subscriptions.
  console.log('\n── Tables with plan/billing/subscription-ish names ──');
  const tables = await prisma.$queryRaw`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('public','auth')
      AND (table_name ILIKE '%plan%'
        OR table_name ILIKE '%billing%'
        OR table_name ILIKE '%subscription%'
        OR table_name ILIKE '%tier%'
        OR table_name ILIKE '%entitlement%'
        OR table_name ILIKE '%purchase%')
    ORDER BY table_schema, table_name
  `;
  for (const t of tables) {
    console.log(`  ${t.table_schema}.${t.table_name}`);
  }
} catch (err) {
  console.error('diag failed:', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
