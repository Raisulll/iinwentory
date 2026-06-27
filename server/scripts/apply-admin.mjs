// One-off: create public.admin_audit_log in the connected database (Supabase
// prod). Mirrors init/09_admin.sql. Idempotent — safe to re-run.
//
// Does NOT grant super_admin here; that is a separate, deliberate step —
// run scripts/grant-super-admin.mjs for that.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.admin_audit_log (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      action        text NOT NULL,
      target_type   text,
      target_id     text,
      details       jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_admin_audit_admin   ON public.admin_audit_log (admin_user_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log (created_at DESC);`);

  await prisma.$executeRawUnsafe(`ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.platform_admins (
      user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      granted_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.announcements (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      message    text NOT NULL,
      type       text NOT NULL DEFAULT 'info'
                   CHECK (type = ANY (ARRAY['info','warning','success'])),
      active     boolean NOT NULL DEFAULT true,
      starts_at  timestamptz,
      ends_at    timestamptz,
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements (active);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;`);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON public.announcements
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  `);

  console.log('Done. admin_audit_log, platform_admins and announcements are ready.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
