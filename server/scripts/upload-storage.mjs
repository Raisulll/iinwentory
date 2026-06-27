// Restore storage objects to Supabase from local backup dir.
// Usage: node scripts/upload-storage.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const STORAGE_DIR = path.join(ROOT, 'backups', '2026-04-22', 'storage');

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://ovahczsudvwcuwvmapyi.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YWhjenN1ZHZ3Y3V3dm1hcHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDU3ODYsImV4cCI6MjA4NjQyMTc4Nn0.4lnMjqZ1EjZ2zqjonlW_AijqMknH6qNrO-PtoMfZNZQ';
const BUCKET = 'item-photos';

const FILES = [
  { local: '1774451068905-lh866ftlayo.jpg', remote: '1774451068905-lh866ftlayo.jpg', mime: 'image/jpeg' },
  { local: '1774451079735-fnqjoivjiw.png',  remote: '1774451079735-fnqjoivjiw.png',  mime: 'image/png' },
  { local: '1774457391489-xv9jydhds58.jpg', remote: '1774457391489-xv9jydhds58.jpg', mime: 'image/jpeg' },
  { local: 'folders/1774453667399-v7tjckyrtr.jpg',  remote: 'folders/1774453667399-v7tjckyrtr.jpg',  mime: 'image/jpeg' },
  { local: 'folders/1774453680719-91kr1w8zfft.png', remote: 'folders/1774453680719-91kr1w8zfft.png', mime: 'image/png' },
];

async function uploadOne({ local, remote, mime }) {
  const fp = path.join(STORAGE_DIR, local);
  if (!fs.existsSync(fp)) {
    console.log(`SKIP missing ${fp}`);
    return;
  }
  const body = fs.readFileSync(fp);
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remote}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
      'Content-Type': mime,
      'x-upsert': 'true',
    },
    body,
  });
  const txt = await res.text();
  console.log(`${res.status} ${remote} → ${txt.slice(0, 200)}`);
}

for (const f of FILES) {
  await uploadOne(f);
}
console.log('Done.');
