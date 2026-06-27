import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../services/db.js';

const ACCESS_TTL_SECONDS = 60 * 60;             // 1 hour
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;  // 30 days

function jwtSecret(): string {
  const s = process.env.SUPABASE_JWT_SECRET;
  if (!s) throw new Error('SUPABASE_JWT_SECRET is not set');
  return s;
}

/**
 * Claims that match Supabase Auth's access tokens (HS256). Server-issued
 * tokens use the exact same shape so a real Supabase JWT is a drop-in
 * replacement once the project is wired up.
 */
export interface AuthClaims {
  iss: string;
  sub: string;       // auth.users.id (uuid)
  aud: string;       // "authenticated"
  role: string;      // "authenticated" | "service_role"
  email?: string;
  exp: number;
  iat: number;
  // Custom (non-Supabase) claim — convenience pointer to the user's primary team.
  team_id?: string | null;
}

export interface AuthContext {
  userId: string;
  email: string | null;
  teamId: string | null;
  teamRole: string | null;     // owner | admin | member | client (from team_members)
  profileRole: string | null;  // role on profiles row
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function signAccessToken(args: { userId: string; email?: string | null; teamId?: string | null }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthClaims = {
    iss: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/auth/v1` : 'iinwentory-local',
    sub: args.userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: args.email ?? undefined,
    exp: now + ACCESS_TTL_SECONDS,
    iat: now,
    team_id: args.teamId ?? null,
  };
  return jwt.sign(payload, jwtSecret(), { algorithm: 'HS256' });
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  await prisma.webRefreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return raw;
}

export async function rotateRefreshToken(raw: string): Promise<{ userId: string; newRaw: string } | null> {
  const tokenHash = hashRefreshToken(raw);
  const row = await prisma.webRefreshToken.findUnique({ where: { tokenHash } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.webRefreshToken.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  await prisma.webRefreshToken.delete({ where: { id: row.id } });
  const newRaw = await issueRefreshToken(row.userId);
  return { userId: row.userId, newRaw };
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.webRefreshToken.deleteMany({ where: { userId } });
}

async function loadAuthContext(claims: AuthClaims): Promise<AuthContext | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: claims.sub },
    include: { teamMember: true },
  });
  if (!profile) return null;
  return {
    userId: claims.sub,
    email: claims.email ?? null,
    teamId: profile.teamMember?.teamId ?? claims.team_id ?? null,
    teamRole: profile.teamMember?.role ?? null,
    profileRole: profile.role,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  let claims: AuthClaims;
  try {
    claims = jwt.verify(header.slice(7), jwtSecret(), { algorithms: ['HS256'] }) as AuthClaims;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const ctx = await loadAuthContext(claims);
  if (!ctx) {
    res.status(401).json({ error: 'User profile not found' });
    return;
  }
  req.auth = ctx;
  next();
}

/**
 * Middleware that requires the caller to be a member of a team and not a
 * read-only `client` or `viewer`. Use for endpoints that mutate state.
 */
export function requireTeamWrite(req: Request, res: Response, next: NextFunction): void {
  const ctx = req.auth;
  if (!ctx?.teamId) {
    res.status(403).json({ error: 'Team membership required' });
    return;
  }
  if (ctx.teamRole === 'client') {
    res.status(403).json({ error: 'Client role is read-only and cannot perform this action' });
    return;
  }
  next();
}

export function requireTeamAdmin(req: Request, res: Response, next: NextFunction): void {
  const ctx = req.auth;
  if (!ctx?.teamId) {
    res.status(403).json({ error: 'Team membership required' });
    return;
  }
  if (ctx.teamRole !== 'owner' && ctx.teamRole !== 'admin') {
    res.status(403).json({ error: 'Admin or owner role required' });
    return;
  }
  next();
}

/**
 * Whether a user is a platform super-admin (operator of the whole product).
 * Membership lives in public.platform_admins — deliberately NOT profiles.role,
 * whose shared Supabase CHECK constraint only allows owner/admin/member.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const row = await prisma.platformAdmin.findUnique({ where: { userId } });
  return row !== null;
}

/**
 * Platform super-admin gate. Distinct from team roles. Always mount AFTER
 * requireAuth.
 */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ctx = req.auth;
  if (!ctx) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!(await isPlatformAdmin(ctx.userId))) {
    res.status(403).json({ error: 'Super-admin access required' });
    return;
  }
  next();
}
