#!/usr/bin/env node
// Combines the Supabase dump (../../backups/2026-04-22/schema/*) plus our
// web_* extension tables into ONE SQL file you can paste into the Supabase
// SQL Editor on a fresh project. The bundle skips 01_auth.sql because
// Supabase already owns the auth schema.
//
// Output: server/init/supabase-bundle.sql

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '..');
const DUMP_DIR = path.resolve(SERVER_DIR, '../backups/2026-04-22/schema');
const INIT_DIR = path.resolve(SERVER_DIR, 'init');
const OUT = path.join(INIT_DIR, 'supabase-bundle.sql');

const sections = [
  { title: 'Extensions',          file: path.join(INIT_DIR, '00_extensions.sql') },
  { title: 'Public tables (dump)', file: path.join(DUMP_DIR,  'tables.sql') },
  { title: 'Indexes (dump)',       file: path.join(DUMP_DIR,  'indexes.sql') },
  { title: 'Functions (dump)',     file: path.join(DUMP_DIR,  'functions.sql') },
  { title: 'Triggers (dump)',      file: path.join(DUMP_DIR,  'triggers.sql') },
  { title: 'Views (dump)',         file: path.join(DUMP_DIR,  'views.sql') },
  { title: 'Web extension tables', file: path.join(INIT_DIR, '07_web_extensions.sql') },
  { title: 'Feedback table',       file: path.join(INIT_DIR, '08_feedback.sql') },
];

function policiesJsonToSql(jsonPath) {
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const out = [];
  out.push('-- RLS policies (converted from schema/policies.json)');
  out.push('');
  for (const p of raw.policies) {
    if (p.schema === 'storage') continue; // storage policies handled separately
    const roles = p.roles
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map(r => r.trim())
      .filter(Boolean)
      .join(', ');
    const lines = [
      `CREATE POLICY "${p.name.replace(/"/g, '""')}" ON ${p.schema}.${p.table}`,
      `  FOR ${p.cmd}`,
      `  TO ${roles}`,
    ];
    if (p.using) lines.push(`  USING (${p.using})`);
    if (p.check) lines.push(`  WITH CHECK (${p.check})`);
    out.push(lines.join('\n') + ';');
    out.push('');
  }
  return out.join('\n');
}

const banner = (t) =>
  `\n-- ════════════════════════════════════════════════════════════════════\n-- ${t}\n-- ════════════════════════════════════════════════════════════════════\n`;

let bundle = '';
bundle += `-- Supabase bundle generated ${new Date().toISOString()}\n`;
bundle += `-- Apply once to a fresh Supabase project (SQL Editor → New query → paste).\n`;
bundle += `-- Source dump: backups/2026-04-22/\n`;

for (const sec of sections) {
  bundle += banner(sec.title);
  bundle += fs.readFileSync(sec.file, 'utf8');
  if (!bundle.endsWith('\n')) bundle += '\n';
}

bundle += banner('RLS policies (from policies.json)');
bundle += policiesJsonToSql(path.join(DUMP_DIR, 'policies.json'));
bundle += '\n';

fs.writeFileSync(OUT, bundle);
console.log(`Wrote ${OUT} (${bundle.length.toLocaleString()} bytes)`);
