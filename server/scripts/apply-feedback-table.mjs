// One-off: create public.feedback in the connected database (Supabase prod).
// Mirrors init/08_feedback.sql. Idempotent — safe to re-run. Seeds the 8 dummy
// rows only when the table is currently empty so re-runs don't pile up dupes.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.feedback (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      team_id    uuid REFERENCES public.teams(id) ON DELETE SET NULL,
      name       text,
      email      text,
      category   text    NOT NULL DEFAULT 'general'
                   CHECK (category = ANY (ARRAY['general','bug','feature','praise','other'])),
      rating     integer CHECK (rating BETWEEN 1 AND 5),
      message    text    NOT NULL,
      page       text,
      status     text    NOT NULL DEFAULT 'new'
                   CHECK (status = ANY (ARRAY['new','reviewed','resolved','archived'])),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_feedback_team_id ON public.feedback (team_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback (user_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_feedback_status  ON public.feedback (status);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback (created_at DESC);`);

  await prisma.$executeRawUnsafe(`ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;`);

  // The shared update_updated_at() trigger function already exists in this DB.
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_feedback_updated_at ON public.feedback;`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON public.feedback
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  `);

  const [{ count }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public.feedback;`);
  if (count === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.feedback (name, email, category, rating, message, page, status)
      VALUES
        ('Ava Thompson',  'ava@example.com',    'praise',  5, 'Love the new dashboard — the low-stock alerts are a lifesaver!', '/dashboard', 'new'),
        ('Marcus Lee',    'marcus@example.com', 'bug',     2, 'Editing an item quantity sometimes shows the old value until I refresh.', '/items', 'new'),
        ('Priya Nair',    'priya@example.com',  'feature', 4, 'Would be great to export reports to CSV directly from the Reports page.', '/reports', 'reviewed'),
        ('Tom Becker',    'tom@example.com',    'general', 3, 'The app is solid overall, but the search could be a bit faster on big inventories.', '/search', 'new'),
        ('Sofia Romero',  'sofia@example.com',  'feature', 5, 'Please add barcode scanning from the desktop webcam too!', '/scanner', 'new'),
        ('Daniel Okafor', 'daniel@example.com', 'bug',     1, 'Pick mode crashed once when I assigned a list to a removed teammate.', '/pick-mode', 'resolved'),
        ('Hannah Cole',   NULL,                 'praise',  5, 'Clean UI, easy onboarding. Switched our whole team over in a day.', '/onboarding', 'archived'),
        ('Liam Walsh',    'liam@example.com',   'other',   3, 'Any chance of a dark mode for the marketing site as well?', '/settings', 'new');
    `);
    console.log('Seeded 8 dummy feedback rows.');
  } else {
    console.log(`feedback table already has ${count} row(s); skipped dummy seed.`);
  }

  console.log('Done. public.feedback is ready.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
