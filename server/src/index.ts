import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from './services/db.js';
import {
  requireAuth,
  requireSuperAdmin,
  isPlatformAdmin,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokens,
  hashRefreshToken,
  type AuthContext,
} from './middleware/auth.js';
import { enforceItemLimit, getTeamPlanId } from './middleware/planLimits.js';
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendTeamInviteEmail,
  sendLowStockEmail,
  verifyEmailConfig,
} from './services/email.js';
import {
  stripe,
  getStripePriceId,
  planIdFromPriceId,
  createCustomer,
  createCheckoutSession,
  createPortalSession,
} from './services/stripe.js';
import { PLAN_IDS, PLANS, type PlanId } from './utils/plans.js';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = parseInt(process.env.PORT || '7745');
// Restart trigger after pool size bump.

// ── Middleware ────────────────────────────────────────────────────────────────

// Behind Vercel/any reverse proxy the client IP is in X-Forwarded-For. Trust the
// first proxy hop so req.ip is the real client (rate limiters key on it).
app.set('trust proxy', 1);

// Security headers. CSP is disabled because this process only serves JSON and
// static image uploads (no HTML app shell); the frontend host owns its own CSP.
// CORP is relaxed to cross-origin so the web app on a different domain can embed
// images served from /uploads.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .concat([
    process.env.MARKETING_URL || 'http://localhost:3001',
    'http://localhost:5174',
  ]);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) { cb(null, true); return; }
    if (allowedOrigins.includes(origin)) { cb(null, true); return; }
    if (/\.vercel\.app$/.test(new URL(origin).hostname)) { cb(null, true); return; }
    cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
// NOTE: the default store is in-memory. On Vercel serverless each instance keeps
// its own counters (and cold starts reset them), so this is best-effort defense
// in depth rather than a hard guarantee — move to a shared store (Redis) if you
// need strict limits across instances.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // brute-force / enumeration ceiling per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
// Throttle the credential- and account-sensitive endpoints specifically.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Generous global ceiling to blunt scraping / accidental request storms.
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

const UPLOAD_DIR = process.env.VERCEL
  ? '/tmp/uploads'
  : path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Plan persistence helpers ─────────────────────────────────────────────────
//
// The plan tier lives in two places that BOTH need to stay in sync, because
// each client reads from a different source:
//   * team_billing.plan_id           — web (this server reads it via Prisma)
//   * teams.plan + subscription_*    — mobile app (reads via Supabase direct)
//
// teams.* columns aren't in the Prisma schema (predate the web extension),
// so we update them via $executeRaw. Always call this helper instead of
// touching teamBilling directly — otherwise the app's tier silently drifts.

async function setTeamPlan(
  teamId: string,
  planId: string,
  opts: {
    status?: 'active' | 'trialing' | 'past_due' | 'cancelled' | null;
    currentPeriodEnd?: Date | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    cancelAtPeriodEnd?: boolean | null;
  } = {},
): Promise<void> {
  await prisma.$transaction([
    prisma.teamBilling.upsert({
      where: { teamId },
      update: {
        planId,
        ...(opts.stripeSubscriptionId !== undefined && { stripeSubscriptionId: opts.stripeSubscriptionId }),
        ...(opts.stripePriceId !== undefined && { stripePriceId: opts.stripePriceId }),
      },
      create: {
        teamId,
        planId,
        stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
        stripePriceId: opts.stripePriceId ?? null,
      },
    }),
    prisma.$executeRaw`
      UPDATE public.teams
      SET plan                            = ${planId},
          subscription_status             = ${opts.status ?? null},
          subscription_current_period_end = ${opts.currentPeriodEnd ?? null},
          subscription_cancel_at_period_end = ${opts.cancelAtPeriodEnd ?? null},
          stripe_subscription_id          = ${opts.stripeSubscriptionId ?? null}
      WHERE id = ${teamId}::uuid
    `,
  ]);
}

// ── Helpers / serializers ─────────────────────────────────────────────────────

function decimalToNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return typeof d === 'number' ? d : Number(d.toString());
}

type ItemRow = Prisma.ItemGetPayload<{ include: { itemTags: { select: { tagId: true } } } }>;

function serializeItem(item: ItemRow) {
  const cf = (item.customFields ?? {}) as Record<string, unknown>;
  const unit = typeof cf.unit === 'string' ? cf.unit : 'units';
  const sellPrice = decimalToNumber(item.sellPrice);
  return {
    id: item.id,
    name: item.name,
    parentId: item.folderId,
    sku: item.sku,
    description: item.description,
    weight: decimalToNumber(item.weight),
    location: item.location,
    quantity: item.quantity,
    unit,
    minLevel: item.minQuantity,
    minQuantity: item.minQuantity,
    price: sellPrice ?? 0,
    sellPrice,
    costPrice: decimalToNumber(item.costPrice),
    dimensions: item.dimensions ?? null,
    customFields: item.customFields ?? {},
    notes: item.notes ?? '',
    photos: item.photos,
    status: item.status,
    tags: item.itemTags?.map(it => it.tagId) ?? [],
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

type FolderRow = Prisma.FolderGetPayload<true>;
function serializeFolder(f: FolderRow) {
  return {
    id: f.id,
    name: f.name,
    parentId: f.parentFolderId,
    color: f.colour ?? '#9ca3af',
    description: f.description ?? '',
    icon: f.icon,
    sku: f.sku,
    coverImage: f.coverImage,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

function serializeTag(t: Prisma.TagGetPayload<true>) {
  return { id: t.id, name: t.name, color: t.colour ?? '#294EA7' };
}

type PickListWithItems = Prisma.PickListGetPayload<{ include: { items: true } }>;

// Normalizes pick_list.status from any source into the canonical set the web
// client expects. Historic split:
//   - mobile app writes: 'draft' | 'ready_to_pick' | 'complete'
//   - old web wrote:     'draft' | 'ready'         | 'completed'
// New web writes now match the mobile values (see DB_PL_STATUS) so both
// clients converge. The normalizer keeps reading old web-authored rows safely.
function normalizePickListStatus(raw: string): 'draft' | 'ready' | 'completed' {
  const s = (raw ?? '').toLowerCase().trim();
  if (s === 'draft' || s === 'new' || s === 'open') return 'draft';
  if (s === 'ready' || s === 'ready_to_pick' || s === 'in_progress') return 'ready';
  return 'completed';
}

// Canonical DB values written by the server. Match the mobile app's vocabulary
// so app and web write the same shape going forward.
const DB_PL_STATUS = {
  draft: 'draft',
  ready: 'ready_to_pick',
  complete: 'complete',
} as const;

// DB status values that reserve stock (not yet deducted from inventory).
// Includes the mobile app's 'ready_to_pick' so its rows count as reservations.
const ACTIVE_PL_DB_STATUSES = ['draft', 'ready', 'ready_to_pick', 'in_progress', 'new', 'open'] as const;

// Pick-list visibility scope. Owners and admins see all team lists; everyone
// else sees only lists assigned to them (members also see unassigned/Everyone
// lists, clients do not). When an assignee is removed, that user's listings
// stop including the pick list and any single-record lookups return 404.
function pickListAccessWhere(auth: AuthContext): Prisma.PickListWhereInput {
  const teamId = auth.teamId!;
  if (auth.teamRole === 'owner' || auth.teamRole === 'admin') {
    return { teamId };
  }
  if (auth.teamRole === 'client') {
    return { teamId, assignedTo: auth.userId };
  }
  return { teamId, OR: [{ assignedTo: null }, { assignedTo: auth.userId }] };
}

async function serializePickList(pl: PickListWithItems) {
  const codeRow = await prisma.webPickListCode.findUnique({ where: { pickListId: pl.id } });
  return {
    id: pl.id,
    code: codeRow?.code ?? `PL-${pl.id.slice(0, 6).toUpperCase()}`,
    name: pl.name,
    status: normalizePickListStatus(pl.status),
    assignedTo: pl.assignedTo,
    notes: pl.notes ?? '',
    createdAt: pl.createdAt.toISOString(),
    updatedAt: pl.updatedAt.toISOString(),
    readyAt: null,    // dump has no ready_at column on pick_lists; field kept for FE compat
    completedAt: null,
    items: pl.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(i => ({
        id: i.id,
        itemId: i.itemId,
        requestedQty: i.quantityRequested,
        pickedQty: i.quantityPicked,
        unitPrice: decimalToNumber(i.unitPrice),
        locationHint: i.locationHint,
        pickedAt: i.pickedAt ? i.pickedAt.toISOString() : null,
        pickedBy: i.pickedBy,
        sortOrder: i.sortOrder,
      })),
  };
}

function generatePickListCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'PL-';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function uniquePickListCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generatePickListCode();
    const existing = await prisma.webPickListCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `PL-${Date.now().toString(36).toUpperCase()}`;
}

async function logActivity(args: {
  teamId: string;
  userId: string;
  actionType: string;
  itemId?: string | null;
  pickListId?: string | null;
  details: Record<string, unknown>;
}): Promise<void> {
  await prisma.activityLog.create({
    data: {
      teamId: args.teamId,
      userId: args.userId,
      actionType: args.actionType,
      itemId: args.itemId ?? null,
      pickListId: args.pickListId ?? null,
      details: args.details as Prisma.InputJsonValue,
    },
  });
}

// Records a platform super-admin action in the global audit trail. Separate
// from logActivity (which is per-team and tenant-facing).
async function logAdmin(args: {
  adminUserId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: args.adminUserId,
      action: args.action,
      targetType: args.targetType ?? null,
      targetId: args.targetId ?? null,
      details: (args.details ?? {}) as Prisma.InputJsonValue,
    },
  });
}

async function buildAuthResponse(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      user: { select: { email: true } },
      teamMember: { include: { team: true } },
    },
  });
  if (!profile) return null;
  const teamId = profile.teamMember?.teamId ?? null;
  const billing = teamId
    ? await prisma.teamBilling.findUnique({ where: { teamId } })
    : null;
  const accessToken = signAccessToken({
    userId,
    email: profile.user.email,
    teamId,
  });
  const refreshToken = await issueRefreshToken(userId);
  return {
    accessToken,
    refreshToken,
    user: {
      id: userId,
      name: profile.fullName ?? profile.user.email ?? '',
      email: profile.user.email ?? '',
      isSuperAdmin: await isPlatformAdmin(userId),
    },
    org: profile.teamMember?.team
      ? {
          id: profile.teamMember.team.id,
          name: profile.teamMember.team.name,
          planId: await getTeamPlanId(profile.teamMember.team.id),
        }
      : null,
  };
}

// ── Auth Routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6),
    planId: z.enum(PLAN_IDS as readonly [string, ...string[]]).default('free'),
    inviteCode: z.string().trim().min(1).max(32).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }

  const { name, email, password, planId, inviteCode } = parsed.data;
  const lowerEmail = email.toLowerCase();

  // Pre-validate invite code (if provided) before creating any records.
  let pendingInvite: { id: string; teamId: string } | null = null;
  if (inviteCode) {
    const code = inviteCode.toUpperCase();
    const invite = await prisma.teamInvite.findUnique({ where: { inviteCode: code } });
    if (!invite) { res.status(400).json({ error: 'Invalid invite code' }); return; }
    if (invite.usedBy) { res.status(400).json({ error: 'Invite code already used' }); return; }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: 'Invite code expired' });
      return;
    }
    pendingInvite = { id: invite.id, teamId: invite.teamId };
  }

  const existing = await prisma.authUser.findUnique({ where: { email: lowerEmail } });
  if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

  const encryptedPassword = await bcrypt.hash(password, 10);

  const userId = crypto.randomUUID();

  // The handle_new_user trigger will auto-create a profile row when we insert
  // into auth.users. We then patch the profile name and create the team.
  await prisma.$transaction([
    prisma.authUser.create({
      data: {
        id: userId,
        email: lowerEmail,
      },
    }),
    // Trigger creates the profile; also set encrypted_password directly via raw
    // SQL so that login works without going through Supabase Auth.
    //
    // IMPORTANT: the mobile app authenticates through Supabase Auth (GoTrue),
    // which only finds a user when `aud`/`role` are set and `raw_app_meta_data`
    // lists the `email` provider. We must populate these here, otherwise an
    // account created on web cannot be logged into on mobile. The token columns
    // are forced to '' (never NULL) because GoTrue scans them into Go strings
    // and a NULL value makes login fail with a scan error.
    prisma.$executeRaw`
      UPDATE auth.users SET
        encrypted_password   = ${encryptedPassword},
        email_confirmed_at   = now(),
        aud                  = 'authenticated',
        role                 = 'authenticated',
        raw_app_meta_data    = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data   = jsonb_build_object('full_name', ${name}::text),
        confirmation_token        = COALESCE(confirmation_token, ''),
        recovery_token            = COALESCE(recovery_token, ''),
        email_change              = COALESCE(email_change, ''),
        email_change_token_new    = COALESCE(email_change_token_new, ''),
        email_change_token_current= COALESCE(email_change_token_current, '')
      WHERE id = ${userId}::uuid`,
  ]);

  // Profile may not exist yet in vanilla Postgres without trigger — upsert.
  await prisma.profile.upsert({
    where: { id: userId },
    update: { fullName: name },
    create: { id: userId, fullName: name },
  });

  if (pendingInvite) {
    // Joining an existing team via invite — skip team / billing creation.
    await prisma.$transaction([
      prisma.teamMember.create({
        data: { teamId: pendingInvite.teamId, userId, role: 'member' },
      }),
      prisma.teamInvite.update({
        where: { id: pendingInvite.id },
        data: { usedBy: userId },
      }),
    ]);
  } else {
    const team = await prisma.team.create({
      data: {
        name: `${name}'s Team`,
        createdBy: userId,
        members: { create: { userId, role: 'owner' } },
      },
    });

    // Always start on the Free plan. The `planId` from the request is just an
    // upgrade intent — the user has to complete Stripe checkout to actually get
    // a paid plan. Otherwise anyone could register with planId='premium' and
    // get paid features for free.
    void planId;
    await prisma.teamBilling.create({
      data: { teamId: team.id, planId: 'free' },
    });
    await prisma.webTeamSettings.create({
      data: { teamId: team.id },
    });
  }

  const result = await buildAuthResponse(userId);
  if (!result) { res.status(500).json({ error: 'Registration failed' }); return; }
  void sendWelcomeEmail(lowerEmail, name);
  res.status(201).json(result);
});

/**
 * Guarantee the user belongs to a team. Accounts created in the mobile app go
 * through Supabase Auth, which only creates an auth.users row + a profile (via
 * the handle_new_user trigger) — it never sets up the team/billing/settings the
 * web app needs. Without this, buildAuthResponse returns `org: null` and the web
 * client crashes dereferencing `org.planId`. Creating a personal team on first
 * web login makes such accounts fully functional. Idempotent.
 */
async function ensureTeamMembership(userId: string): Promise<void> {
  const existing = await prisma.teamMember.findUnique({ where: { userId } });
  if (existing) return;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: { user: { select: { email: true } } },
  });
  const name = profile?.fullName ?? profile?.user.email ?? 'My';

  const team = await prisma.team.create({
    data: {
      name: `${name}'s Team`,
      createdBy: userId,
      members: { create: { userId, role: 'owner' } },
    },
  });
  await prisma.teamBilling.create({ data: { teamId: team.id, planId: 'free' } });
  await prisma.webTeamSettings.create({ data: { teamId: team.id } });
}

app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const { email, password } = parsed.data;
  const lowerEmail = email.toLowerCase();

  type Row = { id: string; encrypted_password: string | null };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, encrypted_password FROM auth.users WHERE email = ${lowerEmail} LIMIT 1
  `;
  const row = rows[0];
  if (!row?.encrypted_password) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, row.encrypted_password);
  if (!valid) { res.status(401).json({ error: 'Invalid email or password' }); return; }

  // Mobile-created accounts have no team yet — create one so `org` is never null.
  await ensureTeamMembership(row.id);

  const result = await buildAuthResponse(row.id);
  if (!result) { res.status(500).json({ error: 'No profile for user' }); return; }
  res.json(result);
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(401).json({ error: 'No refresh token provided' });
    return;
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) { res.status(401).json({ error: 'Invalid or expired refresh token' }); return; }

  const profile = await prisma.profile.findUnique({
    where: { id: rotated.userId },
    include: {
      user: { select: { email: true } },
      teamMember: true,
    },
  });
  if (!profile) { res.status(401).json({ error: 'User not found' }); return; }

  res.json({
    accessToken: signAccessToken({
      userId: rotated.userId,
      email: profile.user.email,
      teamId: profile.teamMember?.teamId ?? null,
    }),
    refreshToken: rotated.newRaw,
  });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await revokeAllRefreshTokens(req.auth!.userId);
  res.json({ ok: true });
});

// ── Account Deletion ──────────────────────────────────────────────────────────

app.delete('/api/account', requireAuth, async (req, res) => {
  const userId = req.auth!.userId;
  const membership = await prisma.teamMember.findUnique({ where: { userId } });

  // Owner of a team with other members must transfer ownership first —
  // otherwise the team would be orphaned.
  if (membership?.role === 'owner') {
    const otherMembers = await prisma.teamMember.count({
      where: { teamId: membership.teamId, userId: { not: userId } },
    });
    if (otherMembers > 0) {
      res.status(400).json({
        error: 'You are the owner of a team with other members. Transfer ownership before deleting your account.',
      });
      return;
    }
  }

  // Delete refresh tokens (no Prisma relation declared, so manual cleanup).
  await prisma.webRefreshToken.deleteMany({ where: { userId } });

  // If the user owns a team (sole member), tear that team down first.
  // TeamBilling and WebTeamSettings lack Prisma relations to Team, so delete
  // them manually before deleting the Team itself (which cascades to Folder,
  // Item, PickList, etc.).
  if (membership?.role === 'owner') {
    const teamId = membership.teamId;
    await prisma.teamBilling.deleteMany({ where: { teamId } });
    await prisma.webTeamSettings.deleteMany({ where: { teamId } });
    await prisma.team.delete({ where: { id: teamId } });
  }

  // Finally delete the auth user — cascades to Profile and TeamMember.
  await prisma.authUser.delete({ where: { id: userId } });

  res.json({ ok: true });
});


app.get('/api/auth/me', requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.auth!.userId },
    include: {
      user: { select: { email: true } },
      teamMember: { include: { team: true } },
    },
  });
  if (!profile) { res.status(404).json({ error: 'User not found' }); return; }

  const teamId = profile.teamMember?.teamId ?? null;
  const billing = teamId
    ? await prisma.teamBilling.findUnique({ where: { teamId } })
    : null;

  res.json({
    user: {
      id: profile.id,
      name: profile.fullName ?? profile.user.email ?? '',
      email: profile.user.email ?? '',
      isSuperAdmin: await isPlatformAdmin(profile.id),
    },
    org: profile.teamMember?.team
      ? {
          id: profile.teamMember.team.id,
          name: profile.teamMember.team.name,
          planId: await getTeamPlanId(profile.teamMember.team.id),
        }
      : null,
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) { res.status(400).json({ error: 'Email required' }); return; }

  const user = await prisma.authUser.findUnique({ where: { email: String(email).toLowerCase() } });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.webPasswordReset.upsert({
      where: { userId: user.id },
      update: { tokenHash, expiresAt },
      create: { userId: user.id, tokenHash, expiresAt },
    });
    if (user.email) await sendPasswordResetEmail(user.email, rawToken);
  }
  res.json({ ok: true });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const schema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const { token, password } = parsed.data;
  const tokenHash = hashRefreshToken(token);

  const reset = await prisma.webPasswordReset.findUnique({ where: { tokenHash } });
  if (!reset || reset.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }

  const encryptedPassword = await bcrypt.hash(password, 10);
  await prisma.$executeRaw`UPDATE auth.users SET encrypted_password = ${encryptedPassword} WHERE id = ${reset.userId}::uuid`;
  await prisma.webPasswordReset.delete({ where: { userId: reset.userId } });
  await prisma.webRefreshToken.deleteMany({ where: { userId: reset.userId } });

  const resetUser = await prisma.authUser.findUnique({ where: { id: reset.userId } });
  if (resetUser?.email) void sendPasswordChangedEmail(resetUser.email);

  res.json({ ok: true });
});

// Logged-in password change: verify the current password, then update it and
// rotate sessions (revoke all refresh tokens — logging out other devices — and
// issue fresh tokens so this client stays signed in).
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.errors }); return; }

  const { currentPassword, newPassword } = parsed.data;
  const userId = req.auth!.userId;

  type Row = { encrypted_password: string | null; email: string | null };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT encrypted_password, email FROM auth.users WHERE id = ${userId}::uuid LIMIT 1
  `;
  const row = rows[0];
  if (!row?.encrypted_password) {
    res.status(400).json({ error: 'Password sign-in is not enabled for this account' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, row.encrypted_password);
  if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

  const encryptedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.$executeRaw`UPDATE auth.users SET encrypted_password = ${encryptedPassword} WHERE id = ${userId}::uuid`;

  await revokeAllRefreshTokens(userId);
  const accessToken = signAccessToken({ userId, email: req.auth!.email, teamId: req.auth!.teamId });
  const refreshToken = await issueRefreshToken(userId);

  if (row.email) void sendPasswordChangedEmail(row.email);

  res.json({ ok: true, accessToken, refreshToken });
});

// ── FX Rates ──────────────────────────────────────────────────────────────────
// Public proxy + 24h cache for frankfurter.app. All app prices stored in GBP;
// client converts on render to user's display currency.

interface FxCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}
let fxCache: FxCache | null = null;
const FX_TTL_MS = 24 * 60 * 60 * 1000;
// Static fallback (approx mid-2025 rates) — used only if upstream fails on first load.
const FX_FALLBACK: FxCache = {
  base: 'GBP',
  rates: {
    GBP: 1, USD: 1.27, EUR: 1.17, JPY: 195.5, INR: 107.4,
    KRW: 1740, CAD: 1.74, AUD: 1.94, CNY: 9.2,
  },
  fetchedAt: 0,
};

app.get('/api/fx-rates', async (_req, res) => {
  const now = Date.now();
  if (fxCache && now - fxCache.fetchedAt < FX_TTL_MS) {
    res.json(fxCache);
    return;
  }
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=GBP');
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json() as { base: string; rates: Record<string, number> };
    fxCache = {
      base: data.base,
      rates: { ...data.rates, GBP: 1 },
      fetchedAt: now,
    };
    res.json(fxCache);
  } catch (e) {
    if (fxCache) { res.json(fxCache); return; }
    res.json(FX_FALLBACK);
  }
});

// ── Realtime config ───────────────────────────────────────────────────────────
//
// Web reads this once on bootstrap, then opens a WebSocket directly to Supabase
// Realtime using the user's existing access token (which is already a Supabase-
// shaped HS256 JWT signed with SUPABASE_JWT_SECRET — see middleware/auth.ts).
// Anon key is intentionally public; RLS does the access control.

app.get('/api/realtime/config', (_req, res) => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    res.status(503).json({ error: 'Realtime not configured on this server' });
    return;
  }
  res.json({ url, anonKey });
});

// ── Org / Settings Routes ─────────────────────────────────────────────────────

app.get('/api/org', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Team not found' }); return; }

  const [team, billing, settings, profile] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.teamBilling.findUnique({ where: { teamId } }),
    prisma.webTeamSettings.findUnique({ where: { teamId } }),
    prisma.profile.findUnique({
      where: { id: req.auth!.userId },
      include: { user: { select: { email: true } } },
    }),
  ]);
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

  res.json({
    org: { id: team.id, name: team.name, planId: await getTeamPlanId(team.id) },
    settings: {
      currency: settings?.currency ?? '£',
      defaultView: settings?.defaultView ?? 'grid',
      lowStockAlerts: settings?.lowStockAlerts ?? true,
    },
    user: profile
      ? {
          id: profile.id,
          name: profile.fullName ?? profile.user.email ?? '',
          email: profile.user.email ?? '',
        }
      : null,
  });
});

app.put('/api/org', requireAuth, async (req, res) => {
  const schema = z.object({
    orgName: z.string().min(1).max(200).optional(),
    userName: z.string().min(1).max(100).optional(),
    currency: z.string().max(10).optional(),
    defaultView: z.enum(['grid', 'list']).optional(),
    lowStockAlerts: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Team not found' }); return; }

  const { orgName, userName, currency, defaultView, lowStockAlerts } = parsed.data;

  await Promise.all([
    orgName !== undefined
      ? prisma.team.update({ where: { id: teamId }, data: { name: orgName } })
      : null,
    userName !== undefined
      ? prisma.profile.update({ where: { id: req.auth!.userId }, data: { fullName: userName } })
      : null,
    currency !== undefined || defaultView !== undefined || lowStockAlerts !== undefined
      ? prisma.webTeamSettings.upsert({
          where: { teamId },
          update: {
            ...(currency !== undefined && { currency }),
            ...(defaultView !== undefined && { defaultView }),
            ...(lowStockAlerts !== undefined && { lowStockAlerts }),
          },
          create: {
            teamId,
            currency: currency ?? '£',
            defaultView: defaultView ?? 'grid',
            lowStockAlerts: lowStockAlerts ?? true,
          },
        })
      : null,
  ]);

  res.json({ ok: true });
});

// ── Items Routes ──────────────────────────────────────────────────────────────

async function clientAccessibleFolderIds(userId: string): Promise<Set<string>> {
  type Row = { id: string };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id FROM public.get_client_accessible_folder_ids(${userId}::uuid) AS id
  `;
  return new Set(rows.map(r => r.id));
}

app.get('/api/items', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const isClient = req.auth!.teamRole === 'client';
  // Only `active` items count toward totals or appear in lists — this matches
  // the mobile app and the DB's own `folder_stats`/`folder_thumbnails` views,
  // which both filter `status = 'active'`. Using `status != 'deleted'` here let
  // archived/inactive rows leak in, which inflated the web's item count, total
  // value and low-stock figures relative to mobile.
  const baseWhere: Prisma.ItemWhereInput = {
    teamId,
    status: 'active',
  };
  if (isClient) {
    const allowed = await clientAccessibleFolderIds(req.auth!.userId);
    if (allowed.size === 0) { res.json([]); return; }
    baseWhere.folderId = { in: [...allowed] };
  }
  const items = await prisma.item.findMany({
    where: baseWhere,
    include: { itemTags: { select: { tagId: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(items.map(serializeItem));
});

app.post('/api/items', requireAuth, enforceItemLimit, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200),
    parentId: z.string().uuid().nullable().default(null),
    sku: z.string().max(100).nullable().default(null),
    description: z.string().max(2000).nullable().default(null),
    weight: z.number().nullable().default(null),
    location: z.string().max(200).nullable().default(null),
    quantity: z.number().int().min(0).default(1),
    unit: z.string().max(50).default('units'),
    minLevel: z.number().int().nullable().default(null),
    minQuantity: z.number().int().min(0).optional(),
    price: z.number().min(0).default(0),
    sellPrice: z.number().min(0).nullable().optional(),
    costPrice: z.number().min(0).nullable().optional(),
    dimensions: z.record(z.unknown()).nullable().optional(),
    customFields: z.record(z.unknown()).optional(),
    notes: z.string().max(2000).default(''),
    status: z.string().max(20).default('active'),
    tags: z.array(z.string().uuid()).default([]),
    photos: z.array(z.string()).default([]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }

  const teamId = req.auth!.teamId!;
  const data = parsed.data;
  const customFields = { ...(data.customFields ?? {}), unit: data.unit };
  const minQuantity = data.minQuantity ?? data.minLevel ?? 0;
  const sellPrice = data.sellPrice ?? data.price;

  const item = await prisma.item.create({
    data: {
      name: data.name,
      folderId: data.parentId,
      sku: data.sku,
      description: data.description,
      weight: data.weight !== null ? new Prisma.Decimal(data.weight) : null,
      location: data.location,
      quantity: data.quantity,
      minQuantity,
      sellPrice: sellPrice !== null && sellPrice !== undefined ? new Prisma.Decimal(sellPrice) : null,
      costPrice: data.costPrice !== null && data.costPrice !== undefined ? new Prisma.Decimal(data.costPrice) : null,
      dimensions: (data.dimensions ?? null) as Prisma.InputJsonValue,
      customFields: customFields as Prisma.InputJsonValue,
      photos: data.photos,
      notes: data.notes,
      status: data.status,
      teamId,
      createdBy: req.auth!.userId,
      ...(data.tags.length > 0 && {
        itemTags: { create: data.tags.map(tagId => ({ tagId, teamId })) },
      }),
    },
    include: { itemTags: { select: { tagId: true } } },
  });

  await prisma.transaction.create({
    data: {
      itemId: item.id,
      transactionType: 'create',
      quantityBefore: 0,
      quantityAfter: item.quantity,
      quantityChange: item.quantity,
      performedBy: req.auth!.userId,
      itemName: item.name,
      notes: 'Item created',
      teamId,
    },
  });

  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'item.created',
    itemId: item.id,
    details: { name: item.name, quantity: item.quantity },
  });

  res.status(201).json(serializeItem(item));
});

app.put('/api/items/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Item not found' }); return; }
  const item = await prisma.item.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    parentId: z.string().uuid().nullable().optional(),
    sku: z.string().max(100).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    weight: z.number().nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    quantity: z.number().int().min(0).optional(),
    unit: z.string().max(50).optional(),
    minLevel: z.number().int().nullable().optional(),
    minQuantity: z.number().int().min(0).optional(),
    price: z.number().min(0).optional(),
    sellPrice: z.number().min(0).nullable().optional(),
    costPrice: z.number().min(0).nullable().optional(),
    dimensions: z.record(z.unknown()).nullable().optional(),
    customFields: z.record(z.unknown()).optional(),
    notes: z.string().max(2000).optional(),
    status: z.string().max(20).optional(),
    tags: z.array(z.string().uuid()).optional(),
    photos: z.array(z.string()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const d = parsed.data;

  const existingCf = (item.customFields ?? {}) as Record<string, unknown>;
  const nextCf =
    d.unit !== undefined || d.customFields !== undefined
      ? { ...existingCf, ...(d.customFields ?? {}), ...(d.unit !== undefined ? { unit: d.unit } : {}) }
      : undefined;

  const sellPriceInput = d.sellPrice !== undefined ? d.sellPrice : d.price;

  const updated = await prisma.item.update({
    where: { id: item.id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.parentId !== undefined && { folderId: d.parentId }),
      ...(d.sku !== undefined && { sku: d.sku }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.weight !== undefined && { weight: d.weight !== null ? new Prisma.Decimal(d.weight) : null }),
      ...(d.location !== undefined && { location: d.location }),
      ...(d.quantity !== undefined && { quantity: d.quantity }),
      ...(d.minQuantity !== undefined && { minQuantity: d.minQuantity }),
      ...(d.minLevel !== undefined && d.minLevel !== null && { minQuantity: d.minLevel }),
      ...(sellPriceInput !== undefined && {
        sellPrice: sellPriceInput !== null ? new Prisma.Decimal(sellPriceInput) : null,
      }),
      ...(d.costPrice !== undefined && {
        costPrice: d.costPrice !== null ? new Prisma.Decimal(d.costPrice) : null,
      }),
      ...(d.dimensions !== undefined && { dimensions: (d.dimensions ?? null) as Prisma.InputJsonValue }),
      ...(nextCf !== undefined && { customFields: nextCf as Prisma.InputJsonValue }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(d.status !== undefined && { status: d.status }),
      ...(d.photos !== undefined && { photos: d.photos }),
      ...(d.tags !== undefined && {
        itemTags: { deleteMany: {}, create: d.tags.map(tagId => ({ tagId, teamId })) },
      }),
    },
    include: { itemTags: { select: { tagId: true } } },
  });

  let actionType = 'item.updated';
  let details: Record<string, unknown> = { name: updated.name };
  if (d.quantity !== undefined && d.quantity !== item.quantity) {
    actionType = 'item.qty_changed';
    details = { name: updated.name, before: item.quantity, after: d.quantity };
  } else if (d.parentId !== undefined && d.parentId !== item.folderId) {
    actionType = 'item.moved';
    details = { name: updated.name, from: item.folderId, to: d.parentId };
  }

  // Record every item edit in the immutable transaction audit trail, matching
  // picks / stock counts / receipts. Quantity edits carry the before/after
  // delta; moves and field edits are logged with a zero delta so the full
  // lifecycle is visible in the Transactions report.
  {
    const qtyChanged = d.quantity !== undefined && d.quantity !== item.quantity;
    const txType = actionType === 'item.qty_changed'
      ? 'adjustment'
      : actionType === 'item.moved'
        ? 'move'
        : 'update';
    const change = qtyChanged ? d.quantity! - item.quantity : 0;
    const notes = qtyChanged
      ? (change > 0 ? 'Manual restock' : 'Manual adjustment')
      : actionType === 'item.moved'
        ? 'Moved to another folder'
        : 'Item updated';
    await prisma.transaction.create({
      data: {
        itemId: item.id,
        transactionType: txType,
        quantityBefore: item.quantity,
        quantityAfter: qtyChanged ? d.quantity! : item.quantity,
        quantityChange: change,
        performedBy: req.auth!.userId,
        itemName: updated.name,
        notes,
        teamId,
      },
    });
  }

  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType,
    itemId: item.id,
    details,
  });

  res.json(serializeItem(updated));
});

app.delete('/api/items/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Item not found' }); return; }
  const item = await prisma.item.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

  // Record the deletion before removing the item. The transaction's itemId is
  // SetNull on delete, but itemName is preserved so the audit row survives.
  await prisma.transaction.create({
    data: {
      itemId: item.id,
      transactionType: 'delete',
      quantityBefore: item.quantity,
      quantityAfter: 0,
      quantityChange: -item.quantity,
      performedBy: req.auth!.userId,
      itemName: item.name,
      notes: 'Item deleted',
      teamId,
    },
  });

  await prisma.item.delete({ where: { id: item.id } });

  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'item.deleted',
    itemId: item.id,
    details: { name: item.name },
  });

  res.json({ ok: true });
});

// ── Folders Routes ────────────────────────────────────────────────────────────

app.get('/api/folders', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const isClient = req.auth!.teamRole === 'client';
  const baseWhere: Prisma.FolderWhereInput = { teamId };
  if (isClient) {
    const allowed = await clientAccessibleFolderIds(req.auth!.userId);
    if (allowed.size === 0) { res.json([]); return; }
    baseWhere.id = { in: [...allowed] };
  }
  const folders = await prisma.folder.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'asc' },
  });
  res.json(folders.map(serializeFolder));
});

app.post('/api/folders', requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200),
    parentId: z.string().uuid().nullable().default(null),
    color: z.string().default('#9ca3af'),
    description: z.string().max(1000).default(''),
    icon: z.string().max(100).nullable().optional(),
    sku: z.string().max(100).nullable().optional(),
    coverImage: z.string().max(500).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const teamId = req.auth!.teamId!;
  const folder = await prisma.folder.create({
    data: {
      name: parsed.data.name,
      parentFolderId: parsed.data.parentId,
      colour: parsed.data.color,
      description: parsed.data.description,
      icon: parsed.data.icon ?? null,
      sku: parsed.data.sku ?? null,
      coverImage: parsed.data.coverImage ?? null,
      teamId,
      createdBy: req.auth!.userId,
    },
  });

  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'folder.created',
    details: { id: folder.id, name: folder.name },
  });

  res.status(201).json(serializeFolder(folder));
});

app.put('/api/folders/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Folder not found' }); return; }
  const folder = await prisma.folder.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!folder) { res.status(404).json({ error: 'Folder not found' }); return; }

  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    parentId: z.string().uuid().nullable().optional(),
    color: z.string().optional(),
    description: z.string().max(1000).optional(),
    icon: z.string().max(100).nullable().optional(),
    sku: z.string().max(100).nullable().optional(),
    coverImage: z.string().max(500).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const d = parsed.data;

  const updated = await prisma.folder.update({
    where: { id: folder.id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.parentId !== undefined && { parentFolderId: d.parentId }),
      ...(d.color !== undefined && { colour: d.color }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.icon !== undefined && { icon: d.icon }),
      ...(d.sku !== undefined && { sku: d.sku }),
      ...(d.coverImage !== undefined && { coverImage: d.coverImage }),
    },
  });

  const isMove = d.parentId !== undefined && d.parentId !== folder.parentFolderId;
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: isMove ? 'folder.moved' : 'folder.updated',
    details: { id: folder.id, name: updated.name, ...(isMove ? { from: folder.parentFolderId, to: d.parentId } : {}) },
  });

  res.json(serializeFolder(updated));
});

app.delete('/api/folders/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Folder not found' }); return; }
  const folder = await prisma.folder.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!folder) { res.status(404).json({ error: 'Folder not found' }); return; }

  const allIds = new Set<string>();
  const collect = async (parentId: string) => {
    allIds.add(parentId);
    const children = await prisma.folder.findMany({ where: { parentFolderId: parentId, teamId } });
    for (const child of children) await collect(child.id);
  };
  await collect(folder.id);

  await prisma.item.deleteMany({ where: { teamId, folderId: { in: [...allIds] } } });
  await prisma.folder.deleteMany({ where: { id: { in: [...allIds] } } });

  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'folder.deleted',
    details: { id: folder.id, name: folder.name, cascadeIds: [...allIds] },
  });

  res.json({ ok: true });
});

// ── Tags Routes ───────────────────────────────────────────────────────────────

app.get('/api/tags', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const tags = await prisma.tag.findMany({ where: { teamId }, orderBy: { name: 'asc' } });
  res.json(tags.map(serializeTag));
});

app.post('/api/tags', requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    color: z.string().default('#294EA7'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const teamId = req.auth!.teamId!;
  const exists = await prisma.tag.findFirst({ where: { teamId, name: parsed.data.name } });
  if (exists) { res.status(409).json({ error: 'Tag with this name already exists' }); return; }

  const tag = await prisma.tag.create({
    data: {
      name: parsed.data.name,
      colour: parsed.data.color,
      teamId,
      createdBy: req.auth!.userId,
    },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'tag.created',
    details: { id: tag.id, name: tag.name },
  });
  res.status(201).json(serializeTag(tag));
});

app.put('/api/tags/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Tag not found' }); return; }
  const tag = await prisma.tag.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!tag) { res.status(404).json({ error: 'Tag not found' }); return; }

  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    color: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const updated = await prisma.tag.update({
    where: { id: tag.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.color !== undefined && { colour: parsed.data.color }),
    },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'tag.updated',
    details: { id: updated.id, name: updated.name },
  });
  res.json(serializeTag(updated));
});

app.delete('/api/tags/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Tag not found' }); return; }
  const tag = await prisma.tag.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!tag) { res.status(404).json({ error: 'Tag not found' }); return; }

  await prisma.tag.delete({ where: { id: tag.id } });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'tag.deleted',
    details: { id: tag.id, name: tag.name },
  });
  res.json({ ok: true });
});

// ── Activity Log ──────────────────────────────────────────────────────────────

app.get('/api/activity', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json({ items: [], nextCursor: null }); return; }
  const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : undefined;
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? '1000'), 10) || 1000, 1),
    2000,
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const rows = await prisma.activityLog.findMany({
    where: { teamId, ...(itemId ? { itemId } : {}) },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({
    items: items.map(l => {
      const det = (l.details ?? {}) as Record<string, unknown>;
      return {
        id: l.id,
        action: l.actionType,
        entityType: l.actionType.split('.')[0] ?? '',
        entityId: l.itemId ?? l.pickListId ?? '',
        entityName: typeof det.name === 'string' ? det.name : '',
        details: typeof det === 'object' ? det : {},
        userId: l.userId ?? null,
        timestamp: l.timestamp.toISOString(),
      };
    }),
    nextCursor,
  });
});

// ── Feedback Routes ───────────────────────────────────────────────────────────
//
// Users submit feedback from the "Send feedback" button in the sidebar. The
// row captures who/which team sent it (when known) plus a category, optional
// 1–5 rating and free-text message. See init/08_feedback.sql for the table.

app.post('/api/feedback', requireAuth, async (req, res) => {
  const schema = z.object({
    category: z.enum(['general', 'bug', 'feature', 'praise', 'other']).default('general'),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    message: z.string().trim().min(1).max(4000),
    page: z.string().max(200).nullable().optional(),
    // Display name from the client (it already knows it). Optional — purely a
    // readability label; we don't query the DB for it so the insert stays a
    // single round-trip.
    name: z.string().max(200).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }

  const { category, rating, message, page, name } = parsed.data;

  // Email comes free from the verified auth token, so no profile lookup needed.
  const feedback = await prisma.feedback.create({
    data: {
      userId: req.auth!.userId,
      teamId: req.auth!.teamId ?? null,
      name: name ?? null,
      email: req.auth!.email ?? null,
      category,
      rating: rating ?? null,
      message,
      page: page ?? null,
    },
  });

  res.status(201).json({
    id: feedback.id,
    category: feedback.category,
    rating: feedback.rating,
    message: feedback.message,
    createdAt: feedback.createdAt.toISOString(),
  });
});

// List feedback for the current team (owners/admins only). Useful for an
// internal review screen; clients/members don't see other people's feedback.
app.get('/api/feedback', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json({ items: [] }); return; }
  if (req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Only owners and admins can view team feedback' });
    return;
  }

  const rows = await prisma.feedback.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json({
    items: rows.map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      category: f.category,
      rating: f.rating,
      message: f.message,
      page: f.page,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
    })),
  });
});

// ── Platform Admin Routes (super-admin only) ──────────────────────────────────
//
// Operator-facing and cross-tenant — these intentionally are NOT team-scoped.
// Every route is gated by requireSuperAdmin and every mutation is recorded via
// logAdmin. Phase 1 ships the feedback inbox: the feedback table is written by
// /api/feedback but until now had no read/triage surface.

const FEEDBACK_STATUSES = ['new', 'reviewed', 'resolved', 'archived'] as const;

app.get('/api/admin/feedback', requireAuth, requireSuperAdmin, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'all';
  const category = typeof req.query.category === 'string' ? req.query.category : 'all';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '100'), 10) || 100, 1), 500);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const where: Prisma.FeedbackWhereInput = {};
  if ((FEEDBACK_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (category !== 'all' && category) where.category = category;
  if (q) {
    where.OR = [
      { message: { contains: q, mode: 'insensitive' } },
      { email:   { contains: q, mode: 'insensitive' } },
      { name:    { contains: q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.feedback.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // Resolve team names in one batch — Feedback has no Prisma relation to Team.
  const teamIds = [...new Set(items.map(f => f.teamId).filter((x): x is string => !!x))];
  const teams = teamIds.length
    ? await prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } })
    : [];
  const teamName = new Map(teams.map(t => [t.id, t.name]));

  // Status counts across the whole table (filter-independent) for the inbox tabs.
  const grouped = await prisma.feedback.groupBy({ by: ['status'], _count: { _all: true } });
  const counts: Record<string, number> = { new: 0, reviewed: 0, resolved: 0, archived: 0 };
  let total = 0;
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    total += g._count._all;
  }

  res.json({
    items: items.map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      category: f.category,
      rating: f.rating,
      message: f.message,
      page: f.page,
      status: f.status,
      teamId: f.teamId,
      teamName: f.teamId ? (teamName.get(f.teamId) ?? null) : null,
      createdAt: f.createdAt.toISOString(),
    })),
    nextCursor,
    counts: { ...counts, all: total },
  });
});

app.patch('/api/admin/feedback/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const schema = z.object({ status: z.enum(FEEDBACK_STATUSES) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const existing = await prisma.feedback.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) { res.status(404).json({ error: 'Feedback not found' }); return; }

  const updated = await prisma.feedback.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });

  await logAdmin({
    adminUserId: req.auth!.userId,
    action: 'feedback.status_changed',
    targetType: 'feedback',
    targetId: existing.id,
    details: { from: existing.status, to: updated.status },
  });

  res.json({ id: updated.id, status: updated.status });
});

// Cross-tenant team directory. Aggregates per-team counts in batched groupBy
// queries (not per-row) so a page of teams costs a fixed handful of queries.
app.get('/api/admin/teams', requireAuth, requireSuperAdmin, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const where: Prisma.TeamWhereInput = q ? { name: { contains: q, mode: 'insensitive' } } : {};
  const teams = await prisma.team.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = teams.length > limit;
  const page = hasMore ? teams.slice(0, limit) : teams;
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  const ids = page.map(t => t.id);

  if (ids.length === 0) { res.json({ items: [], nextCursor: null }); return; }

  const [owners, memberCounts, itemCounts, billings, lastActive] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: { in: ids }, role: 'owner' },
      include: { user: { select: { email: true } }, profile: { select: { fullName: true } } },
    }),
    prisma.teamMember.groupBy({ by: ['teamId'], where: { teamId: { in: ids } }, _count: { _all: true } }),
    prisma.item.groupBy({ by: ['teamId'], where: { teamId: { in: ids }, status: 'active' }, _count: { _all: true } }),
    prisma.teamBilling.findMany({ where: { teamId: { in: ids } } }),
    prisma.activityLog.groupBy({ by: ['teamId'], where: { teamId: { in: ids } }, _max: { timestamp: true } }),
  ]);

  const ownerMap = new Map(owners.map(o => [o.teamId, o]));
  const memberMap = new Map(memberCounts.map(m => [m.teamId as string, m._count._all]));
  const itemMap = new Map(itemCounts.map(i => [i.teamId as string, i._count._all]));
  const billingMap = new Map(billings.map(b => [b.teamId, b.planId]));
  const activeMap = new Map(lastActive.map(a => [a.teamId as string, a._max.timestamp]));

  res.json({
    items: page.map(t => ({
      id: t.id,
      name: t.name,
      plan: billingMap.get(t.id) ?? 'free',
      memberCount: memberMap.get(t.id) ?? 0,
      itemCount: itemMap.get(t.id) ?? 0,
      ownerEmail: ownerMap.get(t.id)?.user?.email ?? null,
      ownerName: ownerMap.get(t.id)?.profile?.fullName ?? null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
      lastActiveAt: activeMap.get(t.id)?.toISOString() ?? null,
    })),
    nextCursor,
  });
});

// Single team drill-in: members, billing, usage counts, recent activity.
app.get('/api/admin/teams/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

  const [members, itemCount, folderCount, pickListCount, billing, recentActivity, planId] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: id },
      include: { user: { select: { email: true } }, profile: { select: { fullName: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.item.count({ where: { teamId: id, status: 'active' } }),
    prisma.folder.count({ where: { teamId: id } }),
    prisma.pickList.count({ where: { teamId: id } }),
    prisma.teamBilling.findUnique({ where: { teamId: id } }),
    prisma.activityLog.findMany({
      where: { teamId: id },
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: 20,
    }),
    getTeamPlanId(id),
  ]);

  res.json({
    team: { id: team.id, name: team.name, createdAt: team.createdAt ? team.createdAt.toISOString() : null },
    plan: planId,
    billing: billing
      ? {
          planId: billing.planId,
          stripeCustomerId: billing.stripeCustomerId,
          stripeSubscriptionId: billing.stripeSubscriptionId,
          trialEndsAt: billing.trialEndsAt ? billing.trialEndsAt.toISOString() : null,
        }
      : null,
    counts: { members: members.length, items: itemCount, folders: folderCount, pickLists: pickListCount },
    members: members.map(m => ({
      id: m.userId,
      name: m.profile?.fullName ?? null,
      email: m.user?.email ?? null,
      role: m.role,
      joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
    })),
    recentActivity: recentActivity.map(l => {
      const det = (l.details ?? {}) as Record<string, unknown>;
      return {
        id: l.id,
        action: l.actionType,
        entityName: typeof det.name === 'string' ? det.name : '',
        userId: l.userId ?? null,
        timestamp: l.timestamp.toISOString(),
      };
    }),
  });
});

// Cross-tenant user directory. Profile id == auth.users id, so we paginate on
// profiles and join email/team in the same query.
app.get('/api/admin/users', requireAuth, requireSuperAdmin, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const where: Prisma.ProfileWhereInput = q
    ? { OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ] }
    : {};

  const profiles = await prisma.profile.findMany({
    where,
    include: {
      user: { select: { email: true } },
      teamMember: { include: { team: { select: { name: true } } } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = profiles.length > limit;
  const pageRows = hasMore ? profiles.slice(0, limit) : profiles;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1].id : null;

  const adminIds = new Set(
    (await prisma.platformAdmin.findMany({ select: { userId: true } })).map(a => a.userId),
  );

  res.json({
    items: pageRows.map(p => ({
      id: p.id,
      name: p.fullName ?? null,
      email: p.user?.email ?? null,
      teamId: p.teamMember?.teamId ?? null,
      teamName: p.teamMember?.team?.name ?? null,
      teamRole: p.teamMember?.role ?? null,
      isSuperAdmin: adminIds.has(p.id),
      createdAt: p.createdAt.toISOString(),
    })),
    nextCursor,
  });
});

// ── Platform Admin · Support actions ──────────────────────────────────────────
//
// Mutating operator tools. Each is super-admin gated and writes to the admin
// audit trail.

app.post('/api/admin/users/:id/send-password-reset', requireAuth, requireSuperAdmin, async (req, res) => {
  const targetId = String(req.params.id);
  const user = await prisma.authUser.findUnique({ where: { id: targetId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!user.email) { res.status(400).json({ error: 'User has no email on file' }); return; }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.webPasswordReset.upsert({
    where: { userId: user.id },
    update: { tokenHash, expiresAt },
    create: { userId: user.id, tokenHash, expiresAt },
  });
  // sendPasswordResetEmail returns false if SMTP is unconfigured or the send
  // was rejected (e.g. Resend won't deliver to non-account addresses until the
  // domain is verified). Surface that so the admin isn't misled.
  const emailed = await sendPasswordResetEmail(user.email, rawToken);

  await logAdmin({
    adminUserId: req.auth!.userId,
    action: 'user.password_reset_sent',
    targetType: 'user',
    targetId,
    details: { email: user.email, emailed },
  });
  res.json({ ok: true, emailed });
});

app.post('/api/admin/users/:id/ensure-team', requireAuth, requireSuperAdmin, async (req, res) => {
  const targetId = String(req.params.id);
  const user = await prisma.authUser.findUnique({ where: { id: targetId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const before = await prisma.teamMember.findUnique({ where: { userId: targetId } });
  await ensureTeamMembership(targetId);
  const after = await prisma.teamMember.findUnique({ where: { userId: targetId } });

  await logAdmin({
    adminUserId: req.auth!.userId,
    action: 'user.team_ensured',
    targetType: 'user',
    targetId,
    details: { created: !before, teamId: after?.teamId ?? null },
  });
  res.json({ ok: true, created: !before, teamId: after?.teamId ?? null });
});

// ── Platform Admin · Billing ops ──────────────────────────────────────────────
//
// The plan tier lives in TWO sources that must agree (see setTeamPlan):
//   team_billing.plan_id  — read by web        teams.plan — read by mobile
// These endpoints surface drift between them and route every write through
// setTeamPlan so a fix can never introduce new drift.

interface AdminBillingRow {
  id: string;
  name: string;
  created_at: Date | null;
  teams_plan: string | null;
  teams_status: string | null;
  teams_period_end: Date | null;
  teams_cancel: boolean | null;
  teams_sub: string | null;
  billing_plan: string | null;
  billing_customer: string | null;
  billing_sub: string | null;
  trial_ends_at: Date | null;
}

app.get('/api/admin/billing', requireAuth, requireSuperAdmin, async (req, res) => {
  const driftOnly = req.query.drift === '1' || req.query.drift === 'true';
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : 'all';

  const rows = await prisma.$queryRaw<AdminBillingRow[]>`
    SELECT
      t.id, t.name, t.created_at,
      t.plan                              AS teams_plan,
      t.subscription_status               AS teams_status,
      t.subscription_current_period_end   AS teams_period_end,
      t.subscription_cancel_at_period_end AS teams_cancel,
      t.stripe_subscription_id            AS teams_sub,
      tb.plan_id                          AS billing_plan,
      tb.stripe_customer_id               AS billing_customer,
      tb.stripe_subscription_id           AS billing_sub,
      tb.trial_ends_at                    AS trial_ends_at
    FROM public.teams t
    LEFT JOIN public.team_billing tb ON tb.team_id = t.id
    ORDER BY t.created_at DESC
    LIMIT 1000
  `;

  const mapped = rows.map(r => {
    const billingPlan = r.billing_plan ?? 'free';
    const teamsPlan = r.teams_plan ?? 'free';
    return {
      teamId: r.id,
      teamName: r.name,
      billingPlan,
      teamsPlan,
      drift: billingPlan !== teamsPlan,
      status: r.teams_status ?? null,
      currentPeriodEnd: r.teams_period_end ? r.teams_period_end.toISOString() : null,
      cancelAtPeriodEnd: r.teams_cancel ?? false,
      trialEndsAt: r.trial_ends_at ? r.trial_ends_at.toISOString() : null,
      stripeCustomerId: r.billing_customer ?? null,
      stripeSubscriptionId: r.billing_sub ?? r.teams_sub ?? null,
      createdAt: r.created_at ? r.created_at.toISOString() : null,
    };
  });

  // Summary computed over the full set, before row filters, so the badges are
  // stable regardless of which filter is active.
  const summary = {
    total: mapped.length,
    drift: mapped.filter(m => m.drift).length,
    byStatus: mapped.reduce<Record<string, number>>((acc, m) => {
      const key = m.status ?? 'none';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  };

  let items = mapped;
  if (driftOnly) items = items.filter(m => m.drift);
  if (statusFilter !== 'all') items = items.filter(m => (m.status ?? 'none') === statusFilter);

  res.json({ items, summary });
});

// Manually set a team's plan (comp / fix). Routes through setTeamPlan so both
// sources of truth are written together. Preserves the existing Stripe linkage.
app.post('/api/admin/teams/:id/plan', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  const schema = z.object({
    planId: z.enum(PLAN_IDS as readonly [string, ...string[]]),
    trialDays: z.number().int().min(0).max(3650).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

  const { planId, trialDays } = parsed.data;
  const billing = await prisma.teamBilling.findUnique({ where: { teamId: id } });
  const trialEndsAt = trialDays ? new Date(Date.now() + trialDays * 86_400_000) : null;

  await setTeamPlan(id, planId, {
    status: trialEndsAt ? 'trialing' : 'active',
    currentPeriodEnd: trialEndsAt,
    stripeSubscriptionId: billing?.stripeSubscriptionId ?? null,
    stripePriceId: billing?.stripePriceId ?? null,
    cancelAtPeriodEnd: false,
  });
  // setTeamPlan doesn't touch team_billing.trial_ends_at — set it explicitly.
  if (trialEndsAt) {
    await prisma.teamBilling.update({ where: { teamId: id }, data: { trialEndsAt } });
  }

  await logAdmin({
    adminUserId: req.auth!.userId,
    action: 'team.plan_changed',
    targetType: 'team',
    targetId: id,
    details: { from: billing?.planId ?? null, to: planId, trialDays: trialDays ?? 0 },
  });
  res.json({ ok: true, planId, trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null });
});

// Reconcile plan drift by re-applying the chosen source's plan to BOTH sources.
app.post('/api/admin/teams/:id/reconcile', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  const schema = z.object({ source: z.enum(['billing', 'teams']).default('billing') });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

  const billing = await prisma.teamBilling.findUnique({ where: { teamId: id } });
  const teamsRows = await prisma.$queryRaw<{
    plan: string | null;
    subscription_status: string | null;
    subscription_current_period_end: Date | null;
    subscription_cancel_at_period_end: boolean | null;
  }[]>`
    SELECT plan, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end
    FROM public.teams WHERE id = ${id}::uuid
  `;
  const teamsRow = teamsRows[0];
  const billingPlan = billing?.planId ?? 'free';
  const teamsPlan = teamsRow?.plan ?? 'free';
  const target = parsed.data.source === 'teams' ? teamsPlan : billingPlan;

  await setTeamPlan(id, target, {
    status: (teamsRow?.subscription_status ?? 'active') as 'active' | 'trialing' | 'past_due' | 'cancelled',
    currentPeriodEnd: teamsRow?.subscription_current_period_end ?? null,
    stripeSubscriptionId: billing?.stripeSubscriptionId ?? null,
    stripePriceId: billing?.stripePriceId ?? null,
    cancelAtPeriodEnd: teamsRow?.subscription_cancel_at_period_end ?? null,
  });

  await logAdmin({
    adminUserId: req.auth!.userId,
    action: 'team.billing_reconciled',
    targetType: 'team',
    targetId: id,
    details: { source: parsed.data.source, target, billingPlan, teamsPlan },
  });
  res.json({ ok: true, plan: target });
});

// ── Platform Admin · KPI dashboard ────────────────────────────────────────────
//
// One round-trip of aggregate queries powering the operator Overview. Counts
// are cast to ::int in SQL so they arrive as numbers, not BigInt.

app.get('/api/admin/stats', requireAuth, requireSuperAdmin, async (_req, res) => {
  const [
    userCount, teamCount, itemCount, folderCount,
    photoRows, signupRows, signupDaily, activeRows, planRows, statusRows, topItemGroups,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.team.count(),
    prisma.item.count({ where: { status: 'active' } }),
    prisma.folder.count(),
    prisma.$queryRaw<{ photos: number }[]>`
      SELECT COALESCE(SUM(COALESCE(array_length(photos, 1), 0)), 0)::int AS photos
      FROM public.items WHERE status = 'active'`,
    prisma.$queryRaw<{ d7: number; d30: number; total: number }[]>`
      SELECT
        count(*) FILTER (WHERE created_at > now() - interval '7 days')::int  AS d7,
        count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS d30,
        count(*)::int AS total
      FROM public.profiles`,
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count
      FROM public.profiles
      WHERE created_at > now() - interval '30 days'
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ dau: number; wau: number; mau: number }[]>`
      SELECT
        count(DISTINCT user_id) FILTER (WHERE timestamp > now() - interval '1 day')::int   AS dau,
        count(DISTINCT user_id) FILTER (WHERE timestamp > now() - interval '7 days')::int  AS wau,
        count(DISTINCT user_id) FILTER (WHERE timestamp > now() - interval '30 days')::int AS mau
      FROM public.activity_log
      WHERE timestamp > now() - interval '30 days'`,
    prisma.$queryRaw<{ plan: string; count: number }[]>`
      SELECT COALESCE(tb.plan_id, 'free') AS plan, count(*)::int AS count
      FROM public.teams t LEFT JOIN public.team_billing tb ON tb.team_id = t.id
      GROUP BY 1`,
    prisma.$queryRaw<{ status: string; count: number; cancelling: number }[]>`
      SELECT
        COALESCE(subscription_status, 'none') AS status,
        count(*)::int AS count,
        count(*) FILTER (WHERE subscription_cancel_at_period_end = true)::int AS cancelling
      FROM public.teams GROUP BY 1`,
    prisma.item.groupBy({
      by: ['teamId'],
      where: { status: 'active', teamId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  // Order the plan distribution by tier and estimate MRR from list prices.
  const planMap = new Map(planRows.map(p => [p.plan, p.count]));
  const plans = PLAN_IDS.map(id => ({ planId: id, count: planMap.get(id) ?? 0 }));
  const mrr = plans.reduce((sum, p) => sum + (PLANS[p.planId].monthlyPrice ?? 0) * p.count, 0);

  const statusByKey = new Map(statusRows.map(s => [s.status, s.count]));
  const cancelling = statusRows.reduce((acc, s) => acc + s.cancelling, 0);

  // Resolve names for the top teams.
  const topIds = topItemGroups.map(g => g.teamId).filter((x): x is string => !!x);
  const topTeams = topIds.length
    ? await prisma.team.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true } })
    : [];
  const nameMap = new Map(topTeams.map(t => [t.id, t.name]));

  res.json({
    totals: {
      users: userCount,
      teams: teamCount,
      items: itemCount,
      folders: folderCount,
      photos: photoRows[0]?.photos ?? 0,
    },
    signups: {
      last7d: signupRows[0]?.d7 ?? 0,
      last30d: signupRows[0]?.d30 ?? 0,
      total: signupRows[0]?.total ?? 0,
      daily: signupDaily.map(d => ({ date: d.day.toISOString().slice(0, 10), count: d.count })),
    },
    active: {
      dau: activeRows[0]?.dau ?? 0,
      wau: activeRows[0]?.wau ?? 0,
      mau: activeRows[0]?.mau ?? 0,
    },
    plans,
    mrr,
    arr: mrr * 12,
    subscriptions: {
      trialing: statusByKey.get('trialing') ?? 0,
      active: statusByKey.get('active') ?? 0,
      pastDue: statusByKey.get('past_due') ?? 0,
      cancelled: statusByKey.get('cancelled') ?? 0,
      cancelling,
    },
    topTeams: topItemGroups.map(g => ({
      teamId: g.teamId,
      name: g.teamId ? (nameMap.get(g.teamId) ?? 'Unknown') : 'Unknown',
      items: g._count._all,
    })),
  });
});

// ── Announcements ─────────────────────────────────────────────────────────────

// User-facing: the single active announcement to show in the app banner.
app.get('/api/announcement', requireAuth, async (_req, res) => {
  const now = new Date();
  const a = await prisma.announcement.findFirst({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ announcement: a ? { id: a.id, message: a.message, type: a.type } : null });
});

app.get('/api/admin/announcements', requireAuth, requireSuperAdmin, async (_req, res) => {
  const rows = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({
    items: rows.map(a => ({
      id: a.id, message: a.message, type: a.type, active: a.active,
      startsAt: a.startsAt ? a.startsAt.toISOString() : null,
      endsAt: a.endsAt ? a.endsAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

const announcementSchema = z.object({
  message: z.string().trim().min(1).max(500),
  type: z.enum(['info', 'warning', 'success']).default('info'),
  active: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

app.post('/api/admin/announcements', requireAuth, requireSuperAdmin, async (req, res) => {
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const d = parsed.data;
  const created = await prisma.announcement.create({
    data: {
      message: d.message,
      type: d.type,
      active: d.active,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
      createdBy: req.auth!.userId,
    },
  });
  await logAdmin({ adminUserId: req.auth!.userId, action: 'announcement.created', targetType: 'announcement', targetId: created.id, details: { type: d.type, active: d.active } });
  res.status(201).json({ id: created.id });
});

app.patch('/api/admin/announcements/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'Announcement not found' }); return; }

  const schema = announcementSchema.partial();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const d = parsed.data;

  await prisma.announcement.update({
    where: { id },
    data: {
      ...(d.message !== undefined && { message: d.message }),
      ...(d.type !== undefined && { type: d.type }),
      ...(d.active !== undefined && { active: d.active }),
      ...(d.startsAt !== undefined && { startsAt: d.startsAt ? new Date(d.startsAt) : null }),
      ...(d.endsAt !== undefined && { endsAt: d.endsAt ? new Date(d.endsAt) : null }),
    },
  });
  await logAdmin({ adminUserId: req.auth!.userId, action: 'announcement.updated', targetType: 'announcement', targetId: id, details: d });
  res.json({ ok: true });
});

app.delete('/api/admin/announcements/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'Announcement not found' }); return; }
  await prisma.announcement.delete({ where: { id } });
  await logAdmin({ adminUserId: req.auth!.userId, action: 'announcement.deleted', targetType: 'announcement', targetId: id, details: {} });
  res.json({ ok: true });
});

// ── Platform Admin · System health ────────────────────────────────────────────

app.get('/api/admin/health', requireAuth, requireSuperAdmin, async (_req, res) => {
  const t0 = Date.now();
  let dbOk = true;
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbOk = false; }
  const dbLatencyMs = Date.now() - t0;

  const [auditTotal, recent, smtpStatus] = await Promise.all([
    prisma.adminAuditLog.count(),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    verifyEmailConfig(),
  ]);
  const adminIds = [...new Set(recent.map(r => r.adminUserId).filter((x): x is string => !!x))];
  const admins = adminIds.length
    ? await prisma.profile.findMany({ where: { id: { in: adminIds } }, include: { user: { select: { email: true } } } })
    : [];
  const emailMap = new Map(admins.map(a => [a.id, a.user?.email ?? null]));

  res.json({
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    config: {
      stripe: !!stripe,
      // Real connection check (transporter.verify), not just env presence.
      smtp: smtpStatus.ok,
      smtpConfigured: smtpStatus.configured,
      smtpError: smtpStatus.error ?? null,
      supabaseRealtime: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      frontendUrl: process.env.FRONTEND_URL ?? null,
    },
    fx: fxCache
      ? { cached: true, ageMinutes: Math.round((Date.now() - fxCache.fetchedAt) / 60000), base: fxCache.base }
      : { cached: false, ageMinutes: null, base: null },
    uptimeSeconds: Math.round(process.uptime()),
    audit: {
      total: auditTotal,
      recent: recent.map(r => ({
        id: r.id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        adminEmail: r.adminUserId ? (emailMap.get(r.adminUserId) ?? null) : null,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  });
});

// ── Platform Admin · GDPR (export / delete) ───────────────────────────────────

app.get('/api/admin/users/:id/export', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { user: { select: { email: true } }, teamMember: { include: { team: true } } },
  });
  if (!profile) { res.status(404).json({ error: 'User not found' }); return; }

  const [ownedTeams, itemsCreated, foldersCreated, activity] = await Promise.all([
    prisma.team.findMany({ where: { createdBy: id }, select: { id: true, name: true, createdAt: true } }),
    prisma.item.findMany({ where: { createdBy: id }, select: { id: true, name: true, createdAt: true }, take: 2000 }),
    prisma.folder.findMany({ where: { createdBy: id }, select: { id: true, name: true, createdAt: true }, take: 2000 }),
    prisma.activityLog.findMany({ where: { userId: id }, orderBy: { timestamp: 'desc' }, take: 1000 }),
  ]);

  await logAdmin({ adminUserId: req.auth!.userId, action: 'user.data_exported', targetType: 'user', targetId: id, details: { email: profile.user.email } });

  res.json({
    exportedAt: new Date().toISOString(),
    user: {
      id: profile.id,
      email: profile.user.email,
      name: profile.fullName,
      role: profile.role,
      createdAt: profile.createdAt.toISOString(),
    },
    team: profile.teamMember?.team
      ? { id: profile.teamMember.team.id, name: profile.teamMember.team.name, role: profile.teamMember.role }
      : null,
    ownedTeams: ownedTeams.map(t => ({ id: t.id, name: t.name, createdAt: t.createdAt ? t.createdAt.toISOString() : null })),
    itemsCreated: itemsCreated.map(i => ({ id: i.id, name: i.name, createdAt: i.createdAt.toISOString() })),
    foldersCreated: foldersCreated.map(f => ({ id: f.id, name: f.name, createdAt: f.createdAt.toISOString() })),
    activity: activity.map(a => ({ action: a.actionType, timestamp: a.timestamp.toISOString() })),
  });
});

app.delete('/api/admin/users/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  if (id === req.auth!.userId) { res.status(400).json({ error: 'Use account settings to delete your own account' }); return; }
  if (await isPlatformAdmin(id)) { res.status(403).json({ error: 'Revoke super-admin before deleting this account' }); return; }

  const user = await prisma.authUser.findUnique({ where: { id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const membership = await prisma.teamMember.findUnique({ where: { userId: id } });
  if (membership?.role === 'owner') {
    const others = await prisma.teamMember.count({ where: { teamId: membership.teamId, userId: { not: id } } });
    if (others > 0) {
      res.status(400).json({ error: 'User owns a team with other members. Transfer ownership before deleting.' });
      return;
    }
  }

  // Audit before the delete so the record survives even if a later step fails.
  await logAdmin({ adminUserId: req.auth!.userId, action: 'user.deleted', targetType: 'user', targetId: id, details: { email: user.email } });

  await prisma.webRefreshToken.deleteMany({ where: { userId: id } });
  await prisma.webPasswordReset.deleteMany({ where: { userId: id } });

  if (membership?.role === 'owner') {
    const teamId = membership.teamId;
    await prisma.teamBilling.deleteMany({ where: { teamId } });
    await prisma.webTeamSettings.deleteMany({ where: { teamId } });
    await prisma.team.delete({ where: { id: teamId } });
  }

  // Cascades to Profile and TeamMember.
  await prisma.authUser.delete({ where: { id } });
  res.json({ ok: true });
});

// ── Platform Admin · Jobs (low-stock alert emails) ────────────────────────────
//
// Authorised by EITHER a matching CRON_SECRET (so a scheduler — e.g. Vercel
// Cron — can call it headlessly) OR an authenticated super-admin (the "Run now"
// button in the System tab).
function requireSuperAdminOrCron(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const secret = process.env.CRON_SECRET;
  const provided = req.get('x-cron-secret') || (typeof req.query.secret === 'string' ? req.query.secret : '');
  if (secret && provided && provided === secret) { next(); return; }
  void requireAuth(req, res, () => { void requireSuperAdmin(req, res, next); });
}

app.post('/api/admin/jobs/low-stock-alerts', requireSuperAdminOrCron, async (req, res) => {
  // Only teams that have opted in via their settings.
  const optedIn = await prisma.webTeamSettings.findMany({ where: { lowStockAlerts: true } });

  let teamsWithLowStock = 0;
  let emailsSent = 0;

  for (const s of optedIn) {
    // Column-vs-column comparison isn't expressible in the Prisma query API, so
    // use raw SQL for the low-stock predicate.
    const low = await prisma.$queryRaw<{ name: string; quantity: number; minQuantity: number }[]>`
      SELECT name, quantity, min_quantity AS "minQuantity"
      FROM public.items
      WHERE team_id = ${s.teamId}::uuid AND status = 'active'
        AND min_quantity > 0 AND quantity <= min_quantity
      ORDER BY quantity ASC
      LIMIT 200
    `;
    if (low.length === 0) continue;
    teamsWithLowStock++;

    const [recipients, team] = await Promise.all([
      prisma.teamMember.findMany({
        where: { teamId: s.teamId, role: { in: ['owner', 'admin'] } },
        include: { user: { select: { email: true } } },
      }),
      prisma.team.findUnique({ where: { id: s.teamId } }),
    ]);

    for (const r of recipients) {
      if (!r.user?.email) continue;
      const ok = await sendLowStockEmail(r.user.email, { orgName: team?.name ?? 'your team', items: low });
      if (ok) emailsSent++;
    }
  }

  if (req.auth) {
    await logAdmin({
      adminUserId: req.auth.userId,
      action: 'job.low_stock_alerts',
      details: { teamsScanned: optedIn.length, teamsWithLowStock, emailsSent },
    });
  }

  res.json({ teamsScanned: optedIn.length, teamsWithLowStock, emailsSent });
});

// ── Billing Routes ────────────────────────────────────────────────────────────

app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }

  const schema = z.object({
    planId: z.enum(['advanced', 'ultra', 'premium']),
    billing: z.enum(['monthly', 'yearly']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Team not found' }); return; }

  const priceId = getStripePriceId(parsed.data.planId as PlanId, parsed.data.billing);
  if (!priceId) { res.status(400).json({ error: 'Price not configured for this plan' }); return; }

  const [billing, profile] = await Promise.all([
    prisma.teamBilling.findUnique({ where: { teamId } }),
    prisma.profile.findUnique({
      where: { id: req.auth!.userId },
      include: { user: { select: { email: true } } },
    }),
  ]);
  if (!profile?.user.email) { res.status(404).json({ error: 'Billing email not found' }); return; }

  let customerId = billing?.stripeCustomerId ?? null;
  if (!customerId) {
    customerId = await createCustomer(profile.user.email, profile.fullName ?? profile.user.email);
    if (customerId) {
      await prisma.teamBilling.upsert({
        where: { teamId },
        update: { stripeCustomerId: customerId },
        create: { teamId, stripeCustomerId: customerId },
      });
    }
  }
  if (!customerId) { res.status(500).json({ error: 'Failed to create Stripe customer' }); return; }

  const url = await createCheckoutSession(customerId, priceId, teamId);
  if (!url) { res.status(500).json({ error: 'Failed to create checkout session' }); return; }
  res.json({ url });
});

app.post('/api/billing/portal', requireAuth, async (req, res) => {
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }

  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Team not found' }); return; }
  const billing = await prisma.teamBilling.findUnique({ where: { teamId } });
  if (!billing?.stripeCustomerId) { res.status(400).json({ error: 'No billing account found' }); return; }

  const url = await createPortalSession(billing.stripeCustomerId);
  if (!url) { res.status(500).json({ error: 'Failed to create portal session' }); return; }
  res.json({ url });
});

app.post('/api/billing/webhook', async (req, res) => {
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    res.status(400).json({ error: 'Missing Stripe signature or webhook secret' });
    return;
  }

  let event: import('stripe').Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch {
    res.status(400).json({ error: 'Invalid Stripe signature' });
    return;
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      const teamId = sub.metadata?.teamId;
      if (!teamId) break;
      const priceId = sub.items.data[0]?.price.id;
      const planId = (planIdFromPriceId(priceId) ?? 'free') as PlanId;
      // Stripe subscription status values match the strings the app expects.
      const statusMap: Record<string, 'active' | 'trialing' | 'past_due' | 'cancelled'> = {
        active: 'active', trialing: 'trialing', past_due: 'past_due',
        canceled: 'cancelled', unpaid: 'past_due', incomplete: 'past_due',
        incomplete_expired: 'cancelled', paused: 'past_due',
      };
      const periodEndSec = (sub as unknown as { current_period_end?: number }).current_period_end;
      await setTeamPlan(teamId, planId, {
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        status: statusMap[sub.status] ?? 'active',
        currentPeriodEnd: periodEndSec ? new Date(periodEndSec * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? null,
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      const teamId = sub.metadata?.teamId;
      if (!teamId) break;
      await setTeamPlan(teamId, 'free', {
        stripeSubscriptionId: null,
        stripePriceId: null,
        status: 'cancelled',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
      break;
    }
  }

  res.json({ received: true });
});

// ── Data Management Routes ────────────────────────────────────────────────────

app.delete('/api/data', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Team not found' }); return; }

  await prisma.$transaction([
    prisma.pickList.deleteMany({ where: { teamId } }),
    prisma.purchaseOrder.deleteMany({ where: { teamId } }),
    prisma.stockCount.deleteMany({ where: { teamId } }),
    prisma.item.deleteMany({ where: { teamId } }),
    prisma.folder.deleteMany({ where: { teamId } }),
    prisma.tag.deleteMany({ where: { teamId } }),
    prisma.activityLog.deleteMany({ where: { teamId } }),
  ]);
  res.json({ ok: true });
});

app.post('/api/data/import', requireAuth, async (req, res) => {
  const schema = z.object({
    folders: z.array(z.object({
      id: z.string(),
      name: z.string().min(1).max(200),
      parentId: z.string().nullable().default(null),
      color: z.string().default('#9ca3af'),
    })),
    tags: z.array(z.object({
      id: z.string(),
      name: z.string().min(1).max(100),
      color: z.string().default('#294EA7'),
    })),
    items: z.array(z.object({
      id: z.string(),
      name: z.string().min(1).max(200),
      parentId: z.string().nullable().default(null),
      quantity: z.number().int().min(0).default(1),
      unit: z.string().max(50).default('units'),
      minLevel: z.number().int().nullable().default(null),
      price: z.number().min(0).default(0),
      notes: z.string().max(2000).default(''),
      tags: z.array(z.string()).default([]),
      photos: z.array(z.string()).default([]),
    })),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid import data', details: parsed.error.errors });
    return;
  }

  const { folders, tags, items } = parsed.data;
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Team not found' }); return; }
  const userId = req.auth!.userId;

  await prisma.$transaction(async (tx) => {
    await tx.pickList.deleteMany({ where: { teamId } });
    await tx.purchaseOrder.deleteMany({ where: { teamId } });
    await tx.stockCount.deleteMany({ where: { teamId } });
    await tx.item.deleteMany({ where: { teamId } });
    await tx.folder.deleteMany({ where: { teamId } });
    await tx.tag.deleteMany({ where: { teamId } });
    await tx.activityLog.deleteMany({ where: { teamId } });

    const tagIdMap = new Map<string, string>();
    for (const tag of tags) {
      const created = await tx.tag.create({
        data: { name: tag.name, colour: tag.color, teamId, createdBy: userId },
      });
      tagIdMap.set(tag.id, created.id);
    }

    const folderIdMap = new Map<string, string>();
    const folderQueue = [...folders];
    const maxPasses = folders.length + 1;
    let pass = 0;
    while (folderQueue.length > 0 && pass < maxPasses) {
      pass++;
      const remaining: typeof folderQueue = [];
      for (const folder of folderQueue) {
        const mappedParentId = folder.parentId
          ? (folderIdMap.get(folder.parentId) ?? null)
          : null;
        if (folder.parentId && !folderIdMap.has(folder.parentId)) {
          remaining.push(folder);
          continue;
        }
        const created = await tx.folder.create({
          data: {
            name: folder.name,
            parentFolderId: mappedParentId,
            colour: folder.color,
            teamId,
            createdBy: userId,
          },
        });
        folderIdMap.set(folder.id, created.id);
      }
      folderQueue.splice(0, folderQueue.length, ...remaining);
    }

    for (const item of items) {
      const mappedFolderId = item.parentId ? (folderIdMap.get(item.parentId) ?? null) : null;
      const mappedTagIds = item.tags.map(tid => tagIdMap.get(tid)).filter(Boolean) as string[];

      await tx.item.create({
        data: {
          name: item.name,
          folderId: mappedFolderId,
          quantity: item.quantity,
          minQuantity: item.minLevel ?? 0,
          sellPrice: new Prisma.Decimal(item.price),
          customFields: { unit: item.unit } as Prisma.InputJsonValue,
          notes: item.notes,
          photos: item.photos,
          status: 'active',
          teamId,
          createdBy: userId,
          ...(mappedTagIds.length > 0 && {
            itemTags: { create: mappedTagIds.map(tagId => ({ tagId, teamId })) },
          }),
        },
      });
    }
  });

  res.json({ ok: true });
});

// ── Uploads ───────────────────────────────────────────────────────────────────

const supabaseStorage = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const STORAGE_BUCKET = 'item-photos';

const upload = multer({
  storage: supabaseStorage
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).slice(0, 10).toLowerCase();
          const safe = crypto.randomBytes(12).toString('hex') + ext;
          cb(null, safe);
        },
      }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpe?g|png|gif|webp)$/i.test(file.mimetype)) {
      cb(new Error('Only JPEG/PNG/GIF/WebP images allowed'));
      return;
    }
    cb(null, true);
  },
});

app.post('/api/uploads', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  if (supabaseStorage) {
    const ext = (path.extname(req.file.originalname).slice(0, 10).toLowerCase() || '.jpg');
    const objectName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const { error } = await supabaseStorage.storage
      .from(STORAGE_BUCKET)
      .upload(objectName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });
    if (error) {
      res.status(500).json({ error: 'Upload to Supabase storage failed', details: error.message });
      return;
    }
    const { data: pub } = supabaseStorage.storage.from(STORAGE_BUCKET).getPublicUrl(objectName);
    res.status(201).json({
      url: pub.publicUrl,
      filename: objectName,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
    return;
  }

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
});

app.delete('/api/uploads', requireAuth, async (req, res) => {
  if (!supabaseStorage) { res.status(503).json({ error: 'Supabase storage not configured' }); return; }
  const filename = typeof req.body?.filename === 'string' ? req.body.filename : null;
  if (!filename) { res.status(400).json({ error: 'filename required' }); return; }
  const { error } = await supabaseStorage.storage.from(STORAGE_BUCKET).remove([filename]);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// ── Team members ──────────────────────────────────────────────────────────────

app.get('/api/team', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      profile: true,
      user: { select: { email: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });
  res.json(members.map(m => ({
    id: m.userId,
    memberId: m.id,
    name: m.profile.fullName ?? m.user.email ?? '',
    email: m.user.email ?? '',
    role: m.role,
    createdAt: (m.joinedAt ?? new Date()).toISOString(),
  })));
});

// ── Pick Lists ────────────────────────────────────────────────────────────────

app.get('/api/pick-lists', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const lists = await prisma.pickList.findMany({
    where: pickListAccessWhere(req.auth!),
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(await Promise.all(lists.map(serializePickList)));
});

app.post('/api/pick-lists', requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200),
    notes: z.string().max(2000).default(''),
    assignedTo: z.string().uuid().nullable().default(null),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.errors }); return; }

  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Team not found' }); return; }

  const existing = await prisma.pickList.findFirst({ where: { teamId, name: parsed.data.name } });
  if (existing) { res.status(409).json({ error: 'Pick list name already used' }); return; }

  const code = await uniquePickListCode();

  const pl = await prisma.pickList.create({
    data: {
      name: parsed.data.name,
      notes: parsed.data.notes,
      assignedTo: parsed.data.assignedTo,
      status: 'draft',
      teamId,
      createdBy: req.auth!.userId,
    },
    include: { items: true },
  });
  await prisma.webPickListCode.create({ data: { pickListId: pl.id, code } });

  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'pick_list.created',
    pickListId: pl.id,
    details: { name: pl.name, code },
  });

  res.status(201).json(await serializePickList(pl));
});

app.put('/api/pick-lists/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({ where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) } });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  if (normalizePickListStatus(pl.status) === 'completed') {
    res.status(400).json({ error: 'Completed pick lists cannot be edited' });
    return;
  }

  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    notes: z.string().max(2000).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  if (parsed.data.name && parsed.data.name !== pl.name) {
    const dup = await prisma.pickList.findFirst({
      where: { teamId, name: parsed.data.name, id: { not: pl.id } },
    });
    if (dup) { res.status(409).json({ error: 'Pick list name already used' }); return; }
  }

  const updated = await prisma.pickList.update({
    where: { id: pl.id },
    data: parsed.data,
    include: { items: true },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'pick_list.updated',
    pickListId: pl.id,
    details: { name: updated.name },
  });
  res.json(await serializePickList(updated));
});

app.delete('/api/pick-lists/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({ where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) } });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  if (normalizePickListStatus(pl.status) === 'completed') {
    res.status(400).json({ error: 'Completed pick lists cannot be deleted' });
    return;
  }

  await prisma.pickList.delete({ where: { id: pl.id } });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'pick_list.deleted',
    pickListId: pl.id,
    details: { name: pl.name },
  });
  res.json({ ok: true });
});

app.post('/api/pick-lists/:id/ready', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({
    where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) },
    include: { items: true },
  });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  if (normalizePickListStatus(pl.status) !== 'draft') { res.status(400).json({ error: 'Only draft pick lists can be marked ready' }); return; }
  if (pl.items.length === 0) { res.status(400).json({ error: 'Add items before marking ready' }); return; }

  const updated = await prisma.pickList.update({
    where: { id: pl.id },
    data: { status: DB_PL_STATUS.ready },
    include: { items: true },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'pick_list.status_changed',
    pickListId: pl.id,
    details: { name: pl.name, status: DB_PL_STATUS.ready },
  });
  res.json(await serializePickList(updated));
});

// Revert a ready pick list back to draft. Only allowed if no picks have started
// — once any item has been partially picked, reverting would leave inventory in
// an ambiguous state, so we block it.
app.post('/api/pick-lists/:id/draft', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({
    where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) },
    include: { items: true },
  });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const canonical = normalizePickListStatus(pl.status);
  if (canonical === 'completed') {
    res.status(400).json({ error: 'Completed pick lists cannot be reverted' });
    return;
  }
  if (canonical !== 'ready') {
    res.status(400).json({ error: 'Only ready pick lists can be moved back to draft' });
    return;
  }
  if (pl.items.some(i => i.quantityPicked > 0)) {
    res.status(400).json({ error: 'Cannot revert to draft — items have already been picked' });
    return;
  }

  const updated = await prisma.pickList.update({
    where: { id: pl.id },
    data: { status: DB_PL_STATUS.draft },
    include: { items: true },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'pick_list.status_changed',
    pickListId: pl.id,
    details: { name: pl.name, status: DB_PL_STATUS.draft },
  });
  res.json(await serializePickList(updated));
});

app.post('/api/pick-lists/:id/complete', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({
    where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) },
    include: { items: true },
  });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  if (normalizePickListStatus(pl.status) === 'completed') { res.status(400).json({ error: 'Already completed' }); return; }

  const updated = await prisma.pickList.update({
    where: { id: pl.id },
    data: { status: DB_PL_STATUS.complete },
    include: { items: true },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'pick_list.status_changed',
    pickListId: pl.id,
    details: { name: pl.name, status: DB_PL_STATUS.complete },
  });
  res.json(await serializePickList(updated));
});

app.post('/api/pick-lists/:id/items', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({
    where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) },
    include: { items: true },
  });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  if (normalizePickListStatus(pl.status) === 'completed') { res.status(400).json({ error: 'Cannot modify completed pick list' }); return; }

  const schema = z.object({
    itemId: z.string().uuid(),
    requestedQty: z.number().int().min(1).default(1),
    locationHint: z.string().max(200).nullable().default(null),
    unitPrice: z.number().min(0).nullable().default(null),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const item = await prisma.item.findFirst({ where: { id: parsed.data.itemId, teamId } });
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

  const active = await prisma.pickListItem.aggregate({
    _sum: { quantityRequested: true, quantityPicked: true },
    where: {
      itemId: item.id,
      pickList: { teamId, status: { in: [...ACTIVE_PL_DB_STATUSES] }, id: { not: pl.id } },
    },
  });
  const reserved = (active._sum.quantityRequested ?? 0) - (active._sum.quantityPicked ?? 0);
  const available = item.quantity - reserved;
  if (parsed.data.requestedQty > available) {
    res.status(400).json({ error: `Only ${available} available (reserved by other active pick lists)` });
    return;
  }

  const maxOrder = pl.items.reduce((m, i) => Math.max(m, i.sortOrder), -1);
  const fallbackPrice = decimalToNumber(item.sellPrice) ?? 0;
  const created = await prisma.pickListItem.create({
    data: {
      pickListId: pl.id,
      itemId: item.id,
      quantityRequested: parsed.data.requestedQty,
      locationHint: parsed.data.locationHint,
      unitPrice: new Prisma.Decimal(parsed.data.unitPrice ?? fallbackPrice),
      sortOrder: maxOrder + 1,
      teamId,
    },
  });

  const updated = await prisma.pickList.findUnique({
    where: { id: pl.id }, include: { items: true },
  });
  res.status(201).json({ picked: await serializePickList(updated!), added: created.id });
});

app.put('/api/pick-lists/:id/items/:itemId', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({
    where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) },
    include: { items: true },
  });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  if (normalizePickListStatus(pl.status) === 'completed') { res.status(400).json({ error: 'Cannot modify completed pick list' }); return; }

  const pli = pl.items.find(i => i.itemId === String(req.params.itemId));
  if (!pli) { res.status(404).json({ error: 'Pick list item not found' }); return; }

  const schema = z.object({
    requestedQty: z.number().int().min(1).optional(),
    locationHint: z.string().max(200).nullable().optional(),
    unitPrice: z.number().min(0).nullable().optional(),
    sortOrder: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const d = parsed.data;

  if (d.requestedQty !== undefined) {
    if (d.requestedQty < pli.quantityPicked) {
      res.status(400).json({ error: `Cannot reduce below already picked quantity (${pli.quantityPicked})` });
      return;
    }
    const item = await prisma.item.findFirst({ where: { id: pli.itemId, teamId } });
    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
    const others = await prisma.pickListItem.aggregate({
      _sum: { quantityRequested: true, quantityPicked: true },
      where: {
        itemId: item.id,
        pickList: { teamId, status: { in: [...ACTIVE_PL_DB_STATUSES] }, id: { not: pl.id } },
      },
    });
    const reservedElsewhere = (others._sum.quantityRequested ?? 0) - (others._sum.quantityPicked ?? 0);
    const available = item.quantity - reservedElsewhere;
    if (d.requestedQty > available) {
      res.status(400).json({ error: `Only ${available} available (reserved by other active pick lists)` });
      return;
    }
  }

  await prisma.pickListItem.update({
    where: { id: pli.id },
    data: {
      ...(d.requestedQty !== undefined && { quantityRequested: d.requestedQty }),
      ...(d.locationHint !== undefined && { locationHint: d.locationHint }),
      ...(d.unitPrice !== undefined && {
        unitPrice: d.unitPrice !== null ? new Prisma.Decimal(d.unitPrice) : null,
      }),
      ...(d.sortOrder !== undefined && { sortOrder: d.sortOrder }),
    },
  });

  const updated = await prisma.pickList.findUnique({
    where: { id: pl.id }, include: { items: true },
  });
  res.json(await serializePickList(updated!));
});

app.delete('/api/pick-lists/:id/items/:itemId', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({
    where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) },
    include: { items: true },
  });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  if (normalizePickListStatus(pl.status) === 'completed') { res.status(400).json({ error: 'Cannot modify completed pick list' }); return; }

  const pli = pl.items.find(i => i.itemId === String(req.params.itemId));
  if (!pli) { res.status(404).json({ error: 'Pick list item not found' }); return; }

  await prisma.pickListItem.delete({ where: { id: pli.id } });
  const updated = await prisma.pickList.findUnique({
    where: { id: pl.id }, include: { items: true },
  });
  res.json(await serializePickList(updated!));
});

app.post('/api/pick-lists/:id/items/:itemId/pick', requireAuth, async (req, res) => {
  const schema = z.object({ quantity: z.number().int().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }

  if (req.auth!.teamRole === 'client') {
    res.status(403).json({ error: 'Clients cannot pick items' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pl = await tx.pickList.findFirst({
        where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) },
        include: { items: true },
      });
      if (!pl) throw new Error('Pick list not found');
      if (pl.status !== 'ready') throw new Error('Pick list must be marked ready before picking');

      const pli = pl.items.find(i => i.itemId === String(req.params.itemId));
      if (!pli) throw new Error('Pick list item not found');

      const remaining = pli.quantityRequested - pli.quantityPicked;
      if (parsed.data.quantity > remaining) {
        throw new Error(`Only ${remaining} remaining to pick for this line`);
      }

      const item = await tx.item.findFirst({ where: { id: pli.itemId, teamId } });
      if (!item) throw new Error('Item not found');
      if (item.quantity < parsed.data.quantity) throw new Error('Insufficient stock');

      const before = item.quantity;

      await tx.$executeRaw`SELECT public.pick_item(${pli.id}::uuid, ${parsed.data.quantity}::integer, ${req.auth!.userId}::uuid)`;

      const refreshedItem = await tx.item.findUnique({ where: { id: item.id } });
      const after = refreshedItem?.quantity ?? before - parsed.data.quantity;

      await tx.transaction.create({
        data: {
          itemId: item.id,
          transactionType: 'pick',
          quantityBefore: before,
          quantityAfter: after,
          quantityChange: -parsed.data.quantity,
          referenceId: pl.id,
          referenceType: 'pick_list',
          performedBy: req.auth!.userId,
          itemName: item.name,
          teamId,
        },
      });

      await tx.activityLog.create({
        data: {
          teamId,
          userId: req.auth!.userId,
          actionType: 'item.qty_changed',
          itemId: item.id,
          pickListId: pl.id,
          details: {
            name: item.name,
            change: -parsed.data.quantity,
            reason: `Picked for pick list "${pl.name}"`,
          } as Prisma.InputJsonValue,
        },
      });

      const fresh = await tx.pickList.findUnique({
        where: { id: pl.id }, include: { items: true },
      });
      return fresh!;
    });

    res.json(await serializePickList(result));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pick failed';
    res.status(400).json({ error: msg });
  }
});

// ── Pick List Comments ────────────────────────────────────────────────────────

app.get('/api/pick-lists/:id/comments', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const pl = await prisma.pickList.findFirst({ where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) } });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const rows = await prisma.pickListComment.findMany({
    where: { pickListId: pl.id },
    orderBy: { createdAt: 'asc' },
  });
  const userIds = [...new Set(rows.map(r => r.userId).filter((v): v is string => !!v))];
  const profiles = userIds.length > 0
    ? await prisma.profile.findMany({ where: { id: { in: userIds } }, include: { user: { select: { email: true } } } })
    : [];
  const nameMap = new Map(profiles.map(p => [p.id, p.fullName ?? p.user.email ?? 'Member']));
  res.json(rows.map(r => ({
    id: r.id,
    pickListId: r.pickListId,
    userId: r.userId,
    userName: r.userId ? (nameMap.get(r.userId) ?? 'Member') : 'System',
    content: r.content,
    createdAt: r.createdAt.toISOString(),
  })));
});

app.post('/api/pick-lists/:id/comments', requireAuth, async (req, res) => {
  const schema = z.object({ content: z.string().trim().min(1).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({ where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) } });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }

  const created = await prisma.pickListComment.create({
    data: {
      pickListId: pl.id,
      userId: req.auth!.userId,
      content: parsed.data.content,
      teamId,
    },
  });
  res.status(201).json({
    id: created.id,
    pickListId: created.pickListId,
    userId: created.userId,
    content: created.content,
    createdAt: created.createdAt.toISOString(),
  });
});

app.delete('/api/pick-lists/:id/comments/:commentId', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Comment not found' }); return; }
  const c = await prisma.pickListComment.findFirst({
    where: { id: String(req.params.commentId), pickListId: String(req.params.id), teamId },
  });
  if (!c) { res.status(404).json({ error: 'Comment not found' }); return; }
  if (c.userId !== req.auth!.userId && req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Cannot delete others\' comments' });
    return;
  }
  await prisma.pickListComment.delete({ where: { id: c.id } });
  res.json({ ok: true });
});

// ── Pick List Issues ──────────────────────────────────────────────────────────

const ISSUE_TYPES = ['damaged_stock', 'missing_unit', 'wrong_stock_at_location', 'barcode_mismatch', 'other'] as const;

app.get('/api/pick-lists/:id/issues', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const pl = await prisma.pickList.findFirst({ where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) } });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const rows = await prisma.pickListIssue.findMany({
    where: { pickListId: pl.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows.map(r => ({
    id: r.id,
    pickListId: r.pickListId,
    pickListItemId: r.pickListItemId,
    issueType: r.issueType,
    quantityAffected: r.quantityAffected,
    quantityActuallyPicked: r.quantityActuallyPicked,
    notes: r.notes,
    reportedBy: r.reportedBy,
    createdAt: r.createdAt.toISOString(),
  })));
});

app.post('/api/pick-lists/:id/items/:plItemId/issues', requireAuth, async (req, res) => {
  const schema = z.object({
    issueType: z.enum(ISSUE_TYPES),
    quantityAffected: z.number().int().min(0).default(0),
    quantityActuallyPicked: z.number().int().min(0).default(0),
    notes: z.string().max(2000).nullable().default(null),
    adjustItemQuantity: z.boolean().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.errors }); return; }

  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({ where: { id: String(req.params.id), ...pickListAccessWhere(req.auth!) } });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pli = await prisma.pickListItem.findFirst({
    where: { id: String(req.params.plItemId), pickListId: pl.id },
  });
  if (!pli) { res.status(404).json({ error: 'Pick list item not found' }); return; }

  const issue = await prisma.$transaction(async (tx) => {
    const created = await tx.pickListIssue.create({
      data: {
        pickListId: pl.id,
        pickListItemId: pli.id,
        issueType: parsed.data.issueType,
        quantityAffected: parsed.data.quantityAffected,
        quantityActuallyPicked: parsed.data.quantityActuallyPicked,
        notes: parsed.data.notes,
        reportedBy: req.auth!.userId,
        teamId,
      },
    });

    if (parsed.data.adjustItemQuantity && parsed.data.quantityAffected > 0) {
      const item = await tx.item.findUnique({ where: { id: pli.itemId } });
      if (item) {
        const newQty = Math.max(0, item.quantity - parsed.data.quantityAffected);
        await tx.item.update({ where: { id: item.id }, data: { quantity: newQty } });
        await tx.transaction.create({
          data: {
            itemId: item.id,
            transactionType: 'adjustment',
            quantityBefore: item.quantity,
            quantityAfter: newQty,
            quantityChange: newQty - item.quantity,
            referenceId: created.id,
            referenceType: 'pick_list_issue',
            performedBy: req.auth!.userId,
            notes: `Issue: ${parsed.data.issueType}`,
            itemName: item.name,
            teamId,
          },
        });
        await tx.activityLog.create({
          data: {
            teamId,
            userId: req.auth!.userId,
            actionType: 'item.qty_changed',
            itemId: item.id,
            pickListId: pl.id,
            details: {
              name: item.name,
              change: newQty - item.quantity,
              reason: `Pick issue (${parsed.data.issueType}) on "${pl.name}"`,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    await tx.activityLog.create({
      data: {
        teamId,
        userId: req.auth!.userId,
        actionType: 'pick_list.issue_reported',
        pickListId: pl.id,
        itemId: pli.itemId,
        details: {
          issueType: parsed.data.issueType,
          qtyAffected: parsed.data.quantityAffected,
          notes: parsed.data.notes,
        } as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  res.status(201).json({
    id: issue.id,
    pickListId: issue.pickListId,
    pickListItemId: issue.pickListItemId,
    issueType: issue.issueType,
    quantityAffected: issue.quantityAffected,
    quantityActuallyPicked: issue.quantityActuallyPicked,
    notes: issue.notes,
    createdAt: issue.createdAt.toISOString(),
  });
});

app.delete('/api/pick-lists/:id/issues/:issueId', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Issue not found' }); return; }
  const issue = await prisma.pickListIssue.findFirst({
    where: { id: String(req.params.issueId), pickListId: String(req.params.id), teamId },
  });
  if (!issue) { res.status(404).json({ error: 'Issue not found' }); return; }
  if (issue.reportedBy !== req.auth!.userId && req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Cannot delete others\' issues' });
    return;
  }
  await prisma.pickListIssue.delete({ where: { id: issue.id } });
  res.json({ ok: true });
});

// ── Pick by code (Pick Mode entry) ────────────────────────────────────────────

app.get('/api/pick-lists/by-code/:code', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const codeRow = await prisma.webPickListCode.findUnique({ where: { code: String(req.params.code).toUpperCase() } });
  if (!codeRow) { res.status(404).json({ error: 'Pick list not found' }); return; }
  const pl = await prisma.pickList.findFirst({
    where: { id: codeRow.pickListId, ...pickListAccessWhere(req.auth!) },
    include: { items: true },
  });
  if (!pl) { res.status(404).json({ error: 'Pick list not found' }); return; }
  res.json(await serializePickList(pl));
});

app.get('/api/pick-lists/history', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const userId = typeof req.query.userId === 'string' ? req.query.userId : req.auth!.userId;
  const picked = await prisma.pickListItem.findMany({
    where: {
      pickedBy: userId,
      pickList: { teamId },
    },
    include: {
      item: { select: { id: true, name: true, customFields: true } },
      pickList: { select: { id: true, name: true } },
    },
    orderBy: { pickedAt: 'desc' },
    take: 200,
  });

  const codes = await prisma.webPickListCode.findMany({
    where: { pickListId: { in: picked.map(p => p.pickListId) } },
  });
  const codeMap = new Map(codes.map(c => [c.pickListId, c.code]));

  res.json(picked.map(p => {
    const cf = (p.item.customFields ?? {}) as Record<string, unknown>;
    const unit = typeof cf.unit === 'string' ? cf.unit : 'units';
    return {
      pickListId: p.pickListId,
      pickListName: p.pickList.name,
      pickListCode: codeMap.get(p.pickListId) ?? `PL-${p.pickListId.slice(0, 6).toUpperCase()}`,
      itemId: p.itemId,
      itemName: p.item.name,
      unit,
      pickedQty: p.quantityPicked,
      pickedAt: p.pickedAt ? p.pickedAt.toISOString() : null,
    };
  }));
});

app.get('/api/items/reservations', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json({}); return; }
  const rows = await prisma.pickListItem.groupBy({
    by: ['itemId'],
    where: { pickList: { teamId, status: { in: [...ACTIVE_PL_DB_STATUSES] } } },
    _sum: { quantityRequested: true, quantityPicked: true },
  });
  const result: Record<string, number> = {};
  for (const r of rows) {
    const reserved = (r._sum.quantityRequested ?? 0) - (r._sum.quantityPicked ?? 0);
    if (reserved > 0) result[r.itemId] = reserved;
  }
  res.json(result);
});

// ── Notifications ─────────────────────────────────────────────────────────────

app.get('/api/notifications', requireAuth, async (req, res) => {
  const rows = await prisma.notification.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(rows.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    relatedItemId: n.relatedItemId,
    relatedPickListId: n.relatedPickListId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  })));
});

app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId: req.auth!.userId },
  });
  if (!n) { res.status(404).json({ error: 'Notification not found' }); return; }
  await prisma.notification.update({ where: { id: n.id }, data: { isRead: true } });
  res.json({ ok: true });
});

app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.auth!.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId: req.auth!.userId },
  });
  if (!n) { res.status(404).json({ error: 'Notification not found' }); return; }
  await prisma.notification.delete({ where: { id: n.id } });
  res.json({ ok: true });
});

// ── Transactions (read-only audit trail) ──────────────────────────────────────

app.get('/api/transactions', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json({ items: [], nextCursor: null }); return; }
  const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : null;
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? '1000'), 10) || 1000, 1),
    2000,
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const where: Prisma.TransactionWhereInput = { teamId };
  if (itemId) where.itemId = itemId;

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? slice[slice.length - 1].id : null;

  res.json({
    items: slice.map(t => ({
      id: t.id,
      itemId: t.itemId,
      itemName: t.itemName,
      folderName: t.folderName,
      transactionType: t.transactionType,
      quantityBefore: t.quantityBefore,
      quantityAfter: t.quantityAfter,
      quantityChange: t.quantityChange,
      referenceId: t.referenceId,
      referenceType: t.referenceType,
      performedBy: t.performedBy,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
    })),
    nextCursor,
  });
});

// ── Folder stats (uses public.folder_stats + folder_thumbnails views) ─────────

app.get('/api/folders/stats', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  type Row = {
    folder_id: string;
    subfolder_count: number | bigint;
    unit_count: number | bigint;
    total_value: string | number | null;
    thumbnails: string[] | null;
  };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT fs.folder_id, fs.subfolder_count, fs.unit_count, fs.total_value, ft.thumbnails
    FROM public.folder_stats fs
    LEFT JOIN public.folder_thumbnails ft ON ft.folder_id = fs.folder_id
    WHERE fs.team_id = ${teamId}::uuid
  `;
  res.json(rows.map(r => ({
    folderId: r.folder_id,
    subfolderCount: Number(r.subfolder_count ?? 0),
    unitCount: Number(r.unit_count ?? 0),
    totalValue: r.total_value === null ? 0 : Number(r.total_value),
    thumbnails: r.thumbnails ?? [],
  })));
});

// ── Stock Counts (server-backed) ──────────────────────────────────────────────

app.get('/api/stock-counts', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const rows = await prisma.stockCount.findMany({
    where: { teamId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows.map(sc => ({
    id: sc.id,
    name: sc.name,
    status: sc.status,
    notes: sc.notes,
    createdAt: sc.createdAt.toISOString(),
    updatedAt: sc.updatedAt.toISOString(),
    completedAt: sc.completedAt ? sc.completedAt.toISOString() : null,
    items: sc.items.map(i => ({
      id: i.id,
      itemId: i.itemId,
      expectedQuantity: i.expectedQuantity,
      countedQuantity: i.countedQuantity,
      difference: i.difference,
      countedBy: i.countedBy,
      countedAt: i.countedAt ? i.countedAt.toISOString() : null,
      notes: i.notes,
    })),
  })));
});

app.post('/api/stock-counts', requireAuth, async (req, res) => {
  const schema = z.object({ name: z.string().min(1).max(200), notes: z.string().max(2000).default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(403).json({ error: 'Team membership required' }); return; }
  const sc = await prisma.stockCount.create({
    data: { name: parsed.data.name, notes: parsed.data.notes, status: 'draft', teamId, createdBy: req.auth!.userId },
    include: { items: true },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'stock_count.created',
    details: { id: sc.id, name: sc.name },
  });
  res.status(201).json(sc);
});

app.put('/api/stock-counts/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Stock count not found' }); return; }
  const sc = await prisma.stockCount.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!sc) { res.status(404).json({ error: 'Stock count not found' }); return; }
  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    notes: z.string().max(2000).optional(),
    status: z.enum(['draft', 'in_progress', 'completed']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const updated = await prisma.stockCount.update({
    where: { id: sc.id },
    data: {
      ...parsed.data,
      ...(parsed.data.status === 'completed' && !sc.completedAt && { completedAt: new Date() }),
    },
    include: { items: true },
  });
  res.json(updated);
});

app.delete('/api/stock-counts/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Stock count not found' }); return; }
  const sc = await prisma.stockCount.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!sc) { res.status(404).json({ error: 'Stock count not found' }); return; }
  await prisma.stockCount.delete({ where: { id: sc.id } });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'stock_count.deleted',
    details: { id: sc.id, name: sc.name },
  });
  res.json({ ok: true });
});

app.post('/api/stock-counts/:id/items', requireAuth, async (req, res) => {
  const schema = z.object({ itemId: z.string().uuid(), expectedQuantity: z.number().int().min(0) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Stock count not found' }); return; }
  const sc = await prisma.stockCount.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!sc) { res.status(404).json({ error: 'Stock count not found' }); return; }
  const item = await prisma.item.findFirst({ where: { id: parsed.data.itemId, teamId } });
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
  const sci = await prisma.stockCountItem.create({
    data: {
      stockCountId: sc.id,
      itemId: item.id,
      expectedQuantity: parsed.data.expectedQuantity,
    },
  });
  res.status(201).json(sci);
});

app.put('/api/stock-counts/:id/items/:itemId', requireAuth, async (req, res) => {
  const schema = z.object({ countedQuantity: z.number().int().min(0).nullable(), notes: z.string().max(1000).nullable().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Item not found' }); return; }
  const sci = await prisma.stockCountItem.findFirst({
    where: { id: String(req.params.itemId), stockCount: { id: String(req.params.id), teamId } },
  });
  if (!sci) { res.status(404).json({ error: 'Stock count item not found' }); return; }
  const counted = parsed.data.countedQuantity;
  const difference = counted === null ? null : counted - sci.expectedQuantity;
  const updated = await prisma.stockCountItem.update({
    where: { id: sci.id },
    data: {
      countedQuantity: counted,
      difference,
      countedBy: counted !== null ? req.auth!.userId : null,
      countedAt: counted !== null ? new Date() : null,
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
    },
  });
  res.json(updated);
});

app.delete('/api/stock-counts/:id/items/:itemId', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Item not found' }); return; }
  const sci = await prisma.stockCountItem.findFirst({
    where: { id: String(req.params.itemId), stockCount: { id: String(req.params.id), teamId } },
  });
  if (!sci) { res.status(404).json({ error: 'Stock count item not found' }); return; }
  await prisma.stockCountItem.delete({ where: { id: sci.id } });
  res.json({ ok: true });
});

app.post('/api/stock-counts/:id/apply', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Stock count not found' }); return; }
  const sc = await prisma.stockCount.findFirst({
    where: { id: String(req.params.id), teamId },
    include: { items: true },
  });
  if (!sc) { res.status(404).json({ error: 'Stock count not found' }); return; }
  if (sc.status === 'completed') { res.status(400).json({ error: 'Already applied' }); return; }

  await prisma.$transaction(async (tx) => {
    for (const sci of sc.items) {
      if (sci.countedQuantity === null) continue;
      const item = await tx.item.findUnique({ where: { id: sci.itemId } });
      if (!item) continue;
      const before = item.quantity;
      const after = sci.countedQuantity;
      if (before === after) continue;
      await tx.item.update({ where: { id: item.id }, data: { quantity: after } });
      await tx.transaction.create({
        data: {
          itemId: item.id,
          transactionType: 'stock_count',
          quantityBefore: before,
          quantityAfter: after,
          quantityChange: after - before,
          referenceId: sc.id,
          referenceType: 'stock_count',
          performedBy: req.auth!.userId,
          itemName: item.name,
          teamId,
        },
      });
      await tx.activityLog.create({
        data: {
          teamId,
          userId: req.auth!.userId,
          actionType: 'item.qty_changed',
          itemId: item.id,
          details: {
            name: item.name,
            change: after - before,
            reason: `Stock count "${sc.name}" applied`,
          } as Prisma.InputJsonValue,
        },
      });
    }
    await tx.stockCount.update({
      where: { id: sc.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    await tx.activityLog.create({
      data: {
        teamId,
        userId: req.auth!.userId,
        actionType: 'stock_count.completed',
        details: { id: sc.id, name: sc.name } as Prisma.InputJsonValue,
      },
    });
  });

  const fresh = await prisma.stockCount.findUnique({ where: { id: sc.id }, include: { items: true } });
  res.json(fresh);
});

// ── Purchase Orders (server-backed) ───────────────────────────────────────────

function generatePoNumber(): string {
  const yr = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PO-${yr}-${rand}`;
}

app.get('/api/purchase-orders', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const rows = await prisma.purchaseOrder.findMany({
    where: { teamId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows.map(po => ({
    id: po.id,
    poNumber: po.poNumber,
    name: po.poNumber,
    supplier: po.supplierName,
    status: po.status,
    notes: po.notes,
    orderDate: po.orderDate ? po.orderDate.toISOString() : null,
    expectedDate: po.expectedDate ? po.expectedDate.toISOString() : null,
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
    items: po.items.map(i => ({
      id: i.id,
      itemId: i.itemId,
      orderedQty: i.quantityOrdered,
      receivedQty: i.quantityReceived,
      unitPrice: decimalToNumber(i.unitCost) ?? 0,
      receivedAt: i.receivedAt ? i.receivedAt.toISOString() : null,
    })),
  })));
});

app.post('/api/purchase-orders', requireAuth, async (req, res) => {
  const schema = z.object({
    supplier: z.string().min(1).max(200),
    notes: z.string().max(2000).default(''),
    expectedDate: z.string().datetime().nullable().default(null),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(403).json({ error: 'Team membership required' }); return; }
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: generatePoNumber(),
      supplierName: parsed.data.supplier,
      notes: parsed.data.notes,
      expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null,
      status: 'draft',
      createdBy: req.auth!.userId,
      teamId,
    },
    include: { items: true },
  });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'purchase_order.created',
    details: { id: po.id, name: po.poNumber, supplier: po.supplierName },
  });
  res.status(201).json(po);
});

app.put('/api/purchase-orders/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'PO not found' }); return; }
  const po = await prisma.purchaseOrder.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!po) { res.status(404).json({ error: 'PO not found' }); return; }
  const schema = z.object({
    supplier: z.string().min(1).max(200).optional(),
    notes: z.string().max(2000).optional(),
    status: z.enum(['draft', 'ordered', 'received', 'cancelled']).optional(),
    expectedDate: z.string().datetime().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: {
      ...(parsed.data.supplier !== undefined && { supplierName: parsed.data.supplier }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.expectedDate !== undefined && {
        expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null,
      }),
    },
    include: { items: true },
  });
  res.json(updated);
});

app.delete('/api/purchase-orders/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'PO not found' }); return; }
  const po = await prisma.purchaseOrder.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!po) { res.status(404).json({ error: 'PO not found' }); return; }
  await prisma.purchaseOrder.delete({ where: { id: po.id } });
  await logActivity({
    teamId,
    userId: req.auth!.userId,
    actionType: 'purchase_order.deleted',
    details: { id: po.id, name: po.poNumber, supplier: po.supplierName },
  });
  res.json({ ok: true });
});

app.post('/api/purchase-orders/:id/items', requireAuth, async (req, res) => {
  const schema = z.object({
    itemId: z.string().uuid(),
    orderedQty: z.number().int().min(1),
    unitPrice: z.number().min(0).default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'PO not found' }); return; }
  const po = await prisma.purchaseOrder.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!po) { res.status(404).json({ error: 'PO not found' }); return; }
  const item = await prisma.item.findFirst({ where: { id: parsed.data.itemId, teamId } });
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
  const poi = await prisma.purchaseOrderItem.create({
    data: {
      poId: po.id,
      itemId: item.id,
      quantityOrdered: parsed.data.orderedQty,
      unitCost: new Prisma.Decimal(parsed.data.unitPrice),
    },
  });
  res.status(201).json(poi);
});

app.put('/api/purchase-orders/:id/items/:itemId', requireAuth, async (req, res) => {
  const schema = z.object({
    orderedQty: z.number().int().min(1).optional(),
    unitPrice: z.number().min(0).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'PO item not found' }); return; }
  const poi = await prisma.purchaseOrderItem.findFirst({
    where: { id: String(req.params.itemId), purchaseOrder: { id: String(req.params.id), teamId } },
  });
  if (!poi) { res.status(404).json({ error: 'PO item not found' }); return; }
  const updated = await prisma.purchaseOrderItem.update({
    where: { id: poi.id },
    data: {
      ...(parsed.data.orderedQty !== undefined && { quantityOrdered: parsed.data.orderedQty }),
      ...(parsed.data.unitPrice !== undefined && { unitCost: new Prisma.Decimal(parsed.data.unitPrice) }),
    },
  });
  res.json(updated);
});

app.delete('/api/purchase-orders/:id/items/:itemId', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'PO item not found' }); return; }
  const poi = await prisma.purchaseOrderItem.findFirst({
    where: { id: String(req.params.itemId), purchaseOrder: { id: String(req.params.id), teamId } },
  });
  if (!poi) { res.status(404).json({ error: 'PO item not found' }); return; }
  await prisma.purchaseOrderItem.delete({ where: { id: poi.id } });
  res.json({ ok: true });
});

app.post('/api/purchase-orders/:id/receive', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'PO not found' }); return; }
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: String(req.params.id), teamId },
    include: { items: true },
  });
  if (!po) { res.status(404).json({ error: 'PO not found' }); return; }
  if (po.status === 'received') { res.status(400).json({ error: 'Already received' }); return; }

  await prisma.$transaction(async (tx) => {
    for (const poi of po.items) {
      const incoming = poi.quantityOrdered - poi.quantityReceived;
      if (incoming <= 0) continue;
      const item = await tx.item.findUnique({ where: { id: poi.itemId } });
      if (!item) continue;
      const before = item.quantity;
      const after = before + incoming;
      await tx.item.update({ where: { id: item.id }, data: { quantity: after } });
      await tx.purchaseOrderItem.update({
        where: { id: poi.id },
        data: { quantityReceived: poi.quantityOrdered, receivedAt: new Date(), receivedBy: req.auth!.userId },
      });
      await tx.transaction.create({
        data: {
          itemId: item.id,
          transactionType: 'receive',
          quantityBefore: before,
          quantityAfter: after,
          quantityChange: incoming,
          referenceId: po.id,
          referenceType: 'purchase_order',
          performedBy: req.auth!.userId,
          itemName: item.name,
          teamId,
        },
      });
      await tx.activityLog.create({
        data: {
          teamId,
          userId: req.auth!.userId,
          actionType: 'item.qty_changed',
          itemId: item.id,
          details: {
            name: item.name,
            change: incoming,
            reason: `Received PO ${po.poNumber}`,
          } as Prisma.InputJsonValue,
        },
      });
    }
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'received' } });
    await tx.activityLog.create({
      data: {
        teamId,
        userId: req.auth!.userId,
        actionType: 'purchase_order.received',
        details: { id: po.id, name: po.poNumber, supplier: po.supplierName } as Prisma.InputJsonValue,
      },
    });
  });

  const fresh = await prisma.purchaseOrder.findUnique({ where: { id: po.id }, include: { items: true } });
  res.json(fresh);
});

// ── Team Invites ──────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

app.get('/api/team/invites', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const rows = await prisma.teamInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows.map(i => ({
    id: i.id,
    inviteCode: i.inviteCode,
    expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
    usedBy: i.usedBy,
    createdAt: i.createdAt ? i.createdAt.toISOString() : null,
  })));
});

app.post('/api/team/invites', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(403).json({ error: 'Team membership required' }); return; }
  if (req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Only owners/admins can create invites' });
    return;
  }
  // Optional recipient email — when present we email the invite link/code.
  const parsed = z.object({ email: z.string().email().optional() }).safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: 'Invalid email' }); return; }
  const recipientEmail = parsed.data.email?.toLowerCase();

  let code = '';
  for (let i = 0; i < 10; i++) {
    code = generateInviteCode();
    const exists = await prisma.teamInvite.findUnique({ where: { inviteCode: code } });
    if (!exists) break;
  }
  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      inviteCode: code,
      createdBy: req.auth!.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  let emailed = false;
  if (recipientEmail) {
    const [inviter, team] = await Promise.all([
      prisma.profile.findUnique({ where: { id: req.auth!.userId }, include: { user: { select: { email: true } } } }),
      prisma.team.findUnique({ where: { id: teamId } }),
    ]);
    emailed = await sendTeamInviteEmail(recipientEmail, {
      inviterName: inviter?.fullName ?? inviter?.user.email ?? 'A teammate',
      orgName: team?.name ?? 'a team',
      code: invite.inviteCode,
    });
  }

  res.status(201).json({
    id: invite.id,
    inviteCode: invite.inviteCode,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    emailed,
  });
});

app.delete('/api/team/invites/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Invite not found' }); return; }
  if (req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Only owners/admins can delete invites' });
    return;
  }
  const invite = await prisma.teamInvite.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }
  await prisma.teamInvite.delete({ where: { id: invite.id } });
  res.json({ ok: true });
});

app.post('/api/team/invites/:code/accept', requireAuth, async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const invite = await prisma.teamInvite.findUnique({ where: { inviteCode: code } });
  if (!invite) { res.status(404).json({ error: 'Invalid invite code' }); return; }
  if (invite.usedBy) { res.status(400).json({ error: 'Invite already used' }); return; }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: 'Invite expired' });
    return;
  }

  const userId = req.auth!.userId;

  if (invite.teamId === req.auth!.teamId) {
    res.status(400).json({ error: 'You are already a member of this team.' });
    return;
  }

  const existingMembership = await prisma.teamMember.findUnique({ where: { userId } });

  // If the user already belongs to a team, we need to remove them from it first
  // since TeamMember.userId is unique (one team per user). Owners of a team that
  // still has other members would orphan that team, so we block that case.
  if (existingMembership) {
    if (existingMembership.role === 'owner') {
      const otherMembers = await prisma.teamMember.count({
        where: { teamId: existingMembership.teamId, userId: { not: userId } },
      });
      if (otherMembers > 0) {
        res.status(400).json({
          error: 'You are the owner of a team with other members. Transfer ownership before joining another team.',
        });
        return;
      }
    }

    await prisma.$transaction([
      prisma.teamMember.delete({ where: { id: existingMembership.id } }),
      prisma.teamMember.create({
        data: { teamId: invite.teamId, userId, role: 'member' },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { usedBy: userId },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.teamMember.create({
        data: { teamId: invite.teamId, userId, role: 'member' },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { usedBy: userId },
      }),
    ]);
  }

  res.json({ ok: true, teamId: invite.teamId });
});

app.delete('/api/team/members/:userId', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Member not found' }); return; }
  const targetId = String(req.params.userId);
  const isSelf = targetId === req.auth!.userId;
  if (!isSelf && req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Only owners/admins can remove other members' });
    return;
  }
  const member = await prisma.teamMember.findFirst({ where: { teamId, userId: targetId } });
  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
  if (member.role === 'owner') { res.status(400).json({ error: 'Cannot remove team owner' }); return; }
  await prisma.teamMember.delete({ where: { id: member.id } });
  res.json({ ok: true });
});

app.put('/api/team/members/:userId/role', requireAuth, async (req, res) => {
  const schema = z.object({ role: z.enum(['admin', 'member', 'client']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid role' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Member not found' }); return; }
  if (req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Only owners/admins can change roles' });
    return;
  }
  const targetId = String(req.params.userId);
  const member = await prisma.teamMember.findFirst({ where: { teamId, userId: targetId } });
  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
  if (member.role === 'owner') { res.status(400).json({ error: 'Cannot demote owner' }); return; }
  const updated = await prisma.teamMember.update({ where: { id: member.id }, data: { role: parsed.data.role } });
  res.json(updated);
});

// ── Client folder access management ───────────────────────────────────────────

app.get('/api/client-folder-access', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.json([]); return; }
  const targetUserId = typeof req.query.userId === 'string' ? req.query.userId : null;
  const where: Prisma.ClientFolderAccessWhereInput = { teamId };
  if (targetUserId) where.userId = targetUserId;
  const rows = await prisma.clientFolderAccess.findMany({ where });
  res.json(rows.map(r => ({
    id: r.id,
    userId: r.userId,
    folderId: r.folderId,
    grantedBy: r.grantedBy,
    grantedAt: r.grantedAt ? r.grantedAt.toISOString() : null,
  })));
});

app.post('/api/client-folder-access', requireAuth, async (req, res) => {
  const schema = z.object({ userId: z.string().uuid(), folderId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(403).json({ error: 'Team membership required' }); return; }
  if (req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Only owners/admins can manage client access' });
    return;
  }
  const created = await prisma.clientFolderAccess.upsert({
    where: { userId_folderId: { userId: parsed.data.userId, folderId: parsed.data.folderId } },
    update: { grantedBy: req.auth!.userId, teamId },
    create: {
      teamId,
      userId: parsed.data.userId,
      folderId: parsed.data.folderId,
      grantedBy: req.auth!.userId,
    },
  });
  res.status(201).json(created);
});

app.delete('/api/client-folder-access/:id', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  if (!teamId) { res.status(404).json({ error: 'Grant not found' }); return; }
  if (req.auth!.teamRole !== 'owner' && req.auth!.teamRole !== 'admin') {
    res.status(403).json({ error: 'Only owners/admins can revoke client access' });
    return;
  }
  const grant = await prisma.clientFolderAccess.findFirst({ where: { id: String(req.params.id), teamId } });
  if (!grant) { res.status(404).json({ error: 'Grant not found' }); return; }
  await prisma.clientFolderAccess.delete({ where: { id: grant.id } });
  res.json({ ok: true });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Single round-trip endpoint that returns every dataset the web app needs on
// initial load. Replaces ~10 separate GETs to cut total network/DB latency.

app.get('/api/bootstrap', requireAuth, async (req, res) => {
  const teamId = req.auth!.teamId;
  const userId = req.auth!.userId;
  const isClient = req.auth!.teamRole === 'client';

  if (!teamId) {
    res.json({
      org: null, settings: null, user: null,
      team: [], items: [], folders: [], tags: [],
      pickLists: [], reservations: {}, pickHistory: [],
      purchaseOrders: [], stockCounts: [],
    });
    return;
  }

  const allowedFolderIds: Set<string> | null = isClient
    ? await clientAccessibleFolderIds(userId)
    : null;
  // Only `active` items count — matches the mobile app and the DB's own
  // `folder_stats` view. Without this, archived/inactive rows leaked into the
  // web's item count, total value and low-stock figures. This is the payload
  // the web dashboard actually reads (via /api/bootstrap), so the filter must
  // live here, not just on /api/items.
  const itemWhere: Prisma.ItemWhereInput = { teamId, status: 'active' };
  const folderWhere: Prisma.FolderWhereInput = { teamId };
  if (allowedFolderIds) {
    if (allowedFolderIds.size === 0) {
      itemWhere.folderId = { in: [] };
      folderWhere.id = { in: [] };
    } else {
      const ids = [...allowedFolderIds];
      itemWhere.folderId = { in: ids };
      folderWhere.id = { in: ids };
    }
  }

  const [
    team, billing, settings, profile,
    teamMembers,
    items, folders, tags,
    pickLists,
    reservationRows,
    pickedHistory,
    purchaseOrders,
    stockCounts,
  ] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.teamBilling.findUnique({ where: { teamId } }),
    prisma.webTeamSettings.findUnique({ where: { teamId } }),
    prisma.profile.findUnique({
      where: { id: userId },
      include: { user: { select: { email: true } } },
    }),
    prisma.teamMember.findMany({
      where: { teamId },
      include: { profile: true, user: { select: { email: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.item.findMany({
      where: itemWhere,
      include: { itemTags: { select: { tagId: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.folder.findMany({ where: folderWhere, orderBy: { createdAt: 'asc' } }),
    prisma.tag.findMany({ where: { teamId }, orderBy: { name: 'asc' } }),
    prisma.pickList.findMany({
      where: pickListAccessWhere(req.auth!),
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pickListItem.groupBy({
      by: ['itemId'],
      where: { pickList: { teamId, status: { in: [...ACTIVE_PL_DB_STATUSES] } } },
      _sum: { quantityRequested: true, quantityPicked: true },
    }),
    prisma.pickListItem.findMany({
      where: { pickedBy: userId, pickList: { teamId } },
      include: {
        item: { select: { id: true, name: true, customFields: true } },
        pickList: { select: { id: true, name: true } },
      },
      orderBy: { pickedAt: 'desc' },
      take: 200,
    }),
    prisma.purchaseOrder.findMany({
      where: { teamId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockCount.findMany({
      where: { teamId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const reservations: Record<string, number> = {};
  for (const r of reservationRows) {
    const reserved = (r._sum.quantityRequested ?? 0) - (r._sum.quantityPicked ?? 0);
    if (reserved > 0) reservations[r.itemId] = reserved;
  }

  const historyCodes = pickedHistory.length > 0
    ? await prisma.webPickListCode.findMany({
        where: { pickListId: { in: pickedHistory.map(p => p.pickListId) } },
      })
    : [];
  const codeMap = new Map(historyCodes.map(c => [c.pickListId, c.code]));

  const orgPayload = team
    ? { id: team.id, name: team.name, planId: await getTeamPlanId(team.id) }
    : null;
  const settingsPayload = {
    currency: settings?.currency ?? '£',
    defaultView: settings?.defaultView ?? 'grid',
    lowStockAlerts: settings?.lowStockAlerts ?? true,
  };
  const userPayload = profile
    ? {
        id: profile.id,
        name: profile.fullName ?? profile.user.email ?? '',
        email: profile.user.email ?? '',
      }
    : null;

  const teamMembersPayload = teamMembers.map(m => ({
    id: m.userId,
    memberId: m.id,
    name: m.profile.fullName ?? m.user.email ?? '',
    email: m.user.email ?? '',
    role: m.role,
    createdAt: (m.joinedAt ?? new Date()).toISOString(),
  }));

  const pickListsPayload = await Promise.all(pickLists.map(serializePickList));

  const purchaseOrdersPayload = purchaseOrders.map(po => ({
    id: po.id,
    poNumber: po.poNumber,
    name: po.poNumber,
    supplier: po.supplierName,
    status: po.status,
    notes: po.notes,
    orderDate: po.orderDate ? po.orderDate.toISOString() : null,
    expectedDate: po.expectedDate ? po.expectedDate.toISOString() : null,
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
    items: po.items.map(i => ({
      id: i.id,
      itemId: i.itemId,
      orderedQty: i.quantityOrdered,
      receivedQty: i.quantityReceived,
      unitPrice: decimalToNumber(i.unitCost) ?? 0,
    })),
  }));

  const stockCountsPayload = stockCounts.map(sc => ({
    id: sc.id,
    name: sc.name,
    status: sc.status,
    notes: sc.notes,
    createdAt: sc.createdAt.toISOString(),
    updatedAt: sc.updatedAt.toISOString(),
    completedAt: sc.completedAt ? sc.completedAt.toISOString() : null,
    items: sc.items.map(i => ({
      id: i.id,
      itemId: i.itemId,
      expectedQuantity: i.expectedQuantity,
      countedQuantity: i.countedQuantity,
      difference: i.difference,
      countedBy: i.countedBy,
      countedAt: i.countedAt ? i.countedAt.toISOString() : null,
      notes: i.notes,
    })),
  }));

  const pickHistoryPayload = pickedHistory.map(p => {
    const cf = (p.item.customFields ?? {}) as Record<string, unknown>;
    const unit = typeof cf.unit === 'string' ? cf.unit : 'units';
    return {
      pickListId: p.pickListId,
      pickListName: p.pickList.name,
      pickListCode: codeMap.get(p.pickListId) ?? `PL-${p.pickListId.slice(0, 6).toUpperCase()}`,
      itemId: p.itemId,
      itemName: p.item.name,
      unit,
      pickedQty: p.quantityPicked,
      pickedAt: p.pickedAt ? p.pickedAt.toISOString() : null,
    };
  });

  res.json({
    org: orgPayload,
    settings: settingsPayload,
    user: userPayload,
    team: teamMembersPayload,
    items: items.map(serializeItem),
    folders: folders.map(serializeFolder),
    tags: tags.map(serializeTag),
    pickLists: pickListsPayload,
    reservations,
    pickHistory: pickHistoryPayload,
    purchaseOrders: purchaseOrdersPayload,
    stockCounts: stockCountsPayload,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

if (!process.env.VERCEL) {
  // Preconnect to the database in parallel with the listener spinning up so
  // the first request does not pay the TCP/TLS handshake cost.
  prisma.$connect().catch(err => {
    console.warn('Prisma preconnect failed (will retry on first query):', err);
  });
  app.listen(PORT, () => {
    console.log(`iinwentory server → http://localhost:${PORT}`);
  });
}

export default app;
