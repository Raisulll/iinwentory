// Read-only diagnostic: compares all plausible item aggregations against the
// shared Supabase Postgres. Run from the server/ directory:
//   node scripts/diag-totals.mjs [teamId]
//
// If teamId is omitted, you'll see a per-team breakdown for the WHOLE database
// (use this when you suspect items live under a different team_id than the
// account the app is viewing). With teamId, you get the precise rollups the
// web/app should agree on for that workspace.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });
const filterTeamId = process.argv[2] ?? null;

const num = (d) => d == null ? 0 : (typeof d === 'number' ? d : Number(d.toString()));
const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const pct = (a, b) => b === 0 ? '—' : `${((a / b) * 100).toFixed(1)}%`;

try {
  const where = filterTeamId ? { teamId: filterTeamId } : {};
  const items = await prisma.item.findMany({
    where,
    select: {
      id: true, name: true, quantity: true,
      sellPrice: true, costPrice: true,
      teamId: true, status: true, folderId: true,
      customFields: true, updatedAt: true,
    },
  });

  // Per-team rollups for ACTIVE items only — the app and the (now fixed) web
  // both hide deleted rows, so this is the apples-to-apples view.
  if (!filterTeamId) {
    console.log('=== PER-TEAM rollups (status != "deleted") ===');
    const active = items.filter(i => i.status !== 'deleted');
    const teams = new Map();
    for (const i of active) {
      const k = i.teamId ?? 'NULL';
      const row = teams.get(k) ?? { count: 0, qty: 0, sell: 0, cost: 0, coalesce: 0 };
      row.count += 1;
      row.qty += i.quantity;
      row.sell += num(i.sellPrice) * i.quantity;
      row.cost += num(i.costPrice) * i.quantity;
      const p = i.costPrice != null ? num(i.costPrice) : num(i.sellPrice);
      row.coalesce += p * i.quantity;
      teams.set(k, row);
    }
    const teamRows = await prisma.team.findMany({
      where: { id: { in: [...teams.keys()].filter(k => k !== 'NULL') } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(teamRows.map(t => [t.id, t.name]));
    for (const [k, r] of [...teams].sort((a, b) => b[1].count - a[1].count)) {
      const label = (nameOf.get(k) ?? '—') + '  (' + k.slice(0, 8) + ')';
      console.log(`\n  ${label}`);
      console.log(`    items: ${r.count}   qty: ${r.qty}`);
      console.log(`    Σ sell×qty: ${fmt(r.sell)}`);
      console.log(`    Σ cost×qty: ${fmt(r.cost)}`);
      console.log(`    Σ (cost ?? sell)×qty: ${fmt(r.coalesce)}`);
    }
    console.log('\n=== ORIGINAL ALL-TEAMS DUMP BELOW ===');
  }

  console.log(`\n=== diag-totals  (filter teamId = ${filterTeamId ?? 'ALL TEAMS'}) ===`);
  console.log(`Total rows returned: ${items.length}\n`);

  // 1) Team breakdown — orphan items (team_id NULL) are the #1 cause of
  //    "app shows N but web shows N-K" because the server scopes by teamId.
  const byTeam = new Map();
  for (const i of items) {
    const k = i.teamId ?? 'NULL';
    byTeam.set(k, (byTeam.get(k) ?? 0) + 1);
  }
  console.log('── Items grouped by team_id ──');
  for (const [k, v] of [...byTeam].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(40)}  ${v}  rows`);
  }
  console.log();

  // 2) Status breakdown — server's GET /api/items does NOT filter by status,
  //    so any 'archived'/'deleted' rows show up on web. App may filter them.
  const byStatus = new Map();
  for (const i of items) {
    const k = i.status ?? 'NULL';
    byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
  }
  console.log('── Items grouped by status ──');
  for (const [k, v] of [...byStatus].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)}  ${v}  rows`);
  }
  console.log();

  // 3) Aggregations — three competing formulas for "Total Value".
  //    Web currently uses formula A (sell_price). App most likely uses B or C.
  const sumQty = items.reduce((s, i) => s + i.quantity, 0);
  const sumValSell = items.reduce((s, i) => s + (num(i.sellPrice) * i.quantity), 0);
  const sumValCost = items.reduce((s, i) => s + (num(i.costPrice) * i.quantity), 0);
  const sumValCostElseSell = items.reduce((s, i) => {
    const p = i.costPrice != null ? num(i.costPrice) : num(i.sellPrice);
    return s + (p * i.quantity);
  }, 0);

  console.log('── Aggregations across returned items ──');
  console.log(`  Items (rows):                                  ${items.length}`);
  console.log(`  Total Quantity (Σ quantity):                   ${sumQty}`);
  console.log(`  Value A: Σ (sell_price × qty)   [web current]: ${fmt(sumValSell)}`);
  console.log(`  Value B: Σ (cost_price × qty)                : ${fmt(sumValCost)}`);
  console.log(`  Value C: Σ (cost_price ?? sell_price) × qty  : ${fmt(sumValCostElseSell)}`);
  console.log();

  // 4) Price-field coverage — explains why A/B/C diverge.
  const nullSell = items.filter(i => i.sellPrice == null).length;
  const nullCost = items.filter(i => i.costPrice == null).length;
  const bothNull = items.filter(i => i.sellPrice == null && i.costPrice == null).length;
  const bothSet  = items.filter(i => i.sellPrice != null && i.costPrice != null).length;
  const onlySell = items.filter(i => i.sellPrice != null && i.costPrice == null).length;
  const onlyCost = items.filter(i => i.sellPrice == null && i.costPrice != null).length;
  console.log('── Price-field coverage ──');
  console.log(`  Rows with sell_price NULL: ${nullSell}  (${pct(nullSell, items.length)})`);
  console.log(`  Rows with cost_price NULL: ${nullCost}  (${pct(nullCost, items.length)})`);
  console.log(`  Both NULL:                 ${bothNull}`);
  console.log(`  Both set:                  ${bothSet}`);
  console.log(`  Only sell:                 ${onlySell}`);
  console.log(`  Only cost:                 ${onlyCost}`);
  console.log();

  // 5) custom_fields.unit usage (the server stores unit inside JSON)
  let withUnit = 0;
  for (const i of items) {
    const cf = i.customFields ?? {};
    if (cf && typeof cf === 'object' && typeof cf.unit === 'string' && cf.unit) withUnit++;
  }
  console.log('── Misc ──');
  console.log(`  Rows with customFields.unit set:  ${withUnit}/${items.length}`);
  console.log();

  // 6) Sample first 3 rows for sanity
  console.log('── First 3 rows (sample) ──');
  for (const i of items.slice(0, 3)) {
    console.log({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      sell_price: num(i.sellPrice),
      cost_price: num(i.costPrice),
      status: i.status,
      team_id: i.teamId,
    });
  }
} catch (err) {
  console.error('diag failed:', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
