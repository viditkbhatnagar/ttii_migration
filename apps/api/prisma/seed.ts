/**
 * Seed script: creates demo users for each role so the app is usable after bootstrap.
 *
 * Usage:  cd apps/api && npx tsx prisma/seed.ts
 */
import { hashPassword } from '../src/auth/password.js';
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const prisma = createPrismaClient(DATABASE_URL);

interface SeedUser {
  name: string;
  email: string;
  phone: string;
  role_id: number;
  plainPassword: string;
}

const seedUsers: SeedUser[] = [
  {
    name: 'Admin User',
    email: 'admin@ttii.test',
    phone: '9000000001',
    role_id: 1,
    plainPassword: 'Admin@123',
  },
  {
    name: 'Student User',
    email: 'student@ttii.test',
    phone: '9000000002',
    role_id: 2,
    plainPassword: 'Student@123',
  },
  {
    name: 'Centre User',
    email: 'centre@ttii.test',
    phone: '9000000007',
    role_id: 7,
    plainPassword: 'Centre@123',
  },
];

async function seed(): Promise<void> {
  console.log('Seeding demo users...\n');

  for (const user of seedUsers) {
    const existing = await prisma.users.findFirst({ where: { email: user.email } });
    if (existing) {
      console.log(`  [skip] ${user.email} (already exists)`);
      continue;
    }

    const passwordHash = await hashPassword(user.plainPassword);

    await prisma.users.create({
      data: {
        name: user.name,
        email: user.email,
        user_email: user.email,
        phone: user.phone,
        country_code: '+91',
        role_id: user.role_id,
        password: passwordHash,
        status: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`  [created] ${user.email} (role_id: ${user.role_id})`);
  }

  console.log('\n--- Demo login credentials ---');
  console.log('Admin:   admin@ttii.test   / Admin@123     (role 1)');
  console.log('Student: student@ttii.test / Student@123   (role 2)');
  console.log('Centre:  centre@ttii.test  / Centre@123    (role 7)');
  console.log('');
}

seed()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
