import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple Prisma clients in dev hot-reload (tsx watch).
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Endpoints like /api/bootstrap fan out ~13 queries in one Promise.all. A
// `connection_limit=1` URL (the default baked into some environments, incl.
// Vercel/Supabase pooler) serialises them and trips "Timed out fetching a new
// connection from the pool" on slow remote DBs. Normalise the pool params here
// so deployment doesn't depend on the exact query string in each env's
// DATABASE_URL — we only ever raise the floor, never lower an explicit setting.
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const [base, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const limit = parseInt(params.get('connection_limit') ?? '', 10);
  if (!Number.isFinite(limit) || limit < 5) params.set('connection_limit', '5');
  const timeout = parseInt(params.get('pool_timeout') ?? '', 10);
  if (!Number.isFinite(timeout) || timeout < 20) params.set('pool_timeout', '20');
  return `${base}?${params.toString()}`;
}

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
