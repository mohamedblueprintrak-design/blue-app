import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Clean Production Database Initialization...');

  // Create primary system organization
  const primaryOrg = await prisma.organization.upsert({
    where: { id: 'org_primary_blueprint' },
    update: {
      name: 'BluePrint Engineering Consultancy',
      slug: 'blueprint-primary',
      taxNumber: '100020304000003',
      currency: 'AED',
    },
    create: {
      id: 'org_primary_blueprint',
      name: 'BluePrint Engineering Consultancy',
      slug: 'blueprint-primary',
      taxNumber: '100020304000003',
      currency: 'AED',
    },
  });

  console.log(`✅ Created/Verified Organization: ${primaryOrg.name} (${primaryOrg.id})`);

  // Create super admin user with password from environment — no fallback.
  // A hardcoded default here would leave a known-password ADMIN account in production.
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!rawAdminPassword || rawAdminPassword.length < 12) {
    console.error('❌ INITIAL_ADMIN_PASSWORD environment variable is required (min 12 characters).');
    console.error('   Refusing to create an admin account with a missing/default password.');
    console.error('   Example: INITIAL_ADMIN_PASSWORD="<strong-random-password>" npx tsx prisma/clean-init.ts');
    process.exit(1);
  }
  const adminPasswordHash = await bcrypt.hash(rawAdminPassword, 12);
  const adminUser = await prisma.user.upsert({
    where: {
      email_organizationId: {
        email: 'admin@blueprint.ae',
        organizationId: primaryOrg.id,
      },
    },
    update: {
      password: adminPasswordHash,
      role: 'ADMIN',
      organizationId: primaryOrg.id,
      name: 'BluePrint Administrator',
      emailVerified: new Date(),
    },
    create: {
      id: 'user_admin_super',
      email: 'admin@blueprint.ae',
      password: adminPasswordHash,
      role: 'ADMIN',
      organizationId: primaryOrg.id,
      name: 'مدير النظام',
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Created/Verified Production Admin: ${adminUser.email}`);
  console.log('🚀 Production Database Initialization Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during clean init:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
