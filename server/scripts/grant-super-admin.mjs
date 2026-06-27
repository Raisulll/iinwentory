// One-off: grant (or revoke) platform super-admin for a user.
//
//   node scripts/grant-super-admin.mjs <email>            # grant
//   node scripts/grant-super-admin.mjs <email> --revoke   # revoke
//
// Membership lives in public.platform_admins — deliberately NOT profiles.role,
// whose shared Supabase CHECK constraint only allows owner/admin/member. Being
// a super-admin is separate from a user's team role. Defaults to the platform
// operator's email when none is given.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'support@imperialtrends.uk';
const email = (process.argv[2] && !process.argv[2].startsWith('--'))
  ? process.argv[2].toLowerCase()
  : DEFAULT_EMAIL;
const revoke = process.argv.includes('--revoke');

async function main() {
  const user = await prisma.authUser.findUnique({ where: { email } });
  if (!user) throw new Error(`No auth.users row for ${email}`);
  console.log(`${email} (id ${user.id})`);

  if (revoke) {
    await prisma.platformAdmin.deleteMany({ where: { userId: user.id } });
    console.log(`\nDone. Revoked super-admin for ${email}.`);
    return;
  }

  await prisma.platformAdmin.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, grantedBy: user.id },
  });
  console.log(`\nDone. Granted super-admin for ${email}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
