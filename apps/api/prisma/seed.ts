/**
 * Seed script: creates demo users for each role so the app is usable after bootstrap.
 *
 * Uses $runCommandRaw to bypass Prisma's implicit transactions (which require
 * replica-set support that some Atlas tiers may not expose to Prisma).
 *
 * Usage:  cd apps/api && npx tsx prisma/seed.ts
 */
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../src/auth/password.js';
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms';
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
    name: 'Instructor User',
    email: 'instructor@ttii.test',
    phone: '9000000003',
    role_id: 3,
    plainPassword: 'Instructor@123',
  },
  {
    name: 'Centre User',
    email: 'centre@ttii.test',
    phone: '9000000007',
    role_id: 7,
    plainPassword: 'Centre@123',
  },
  {
    name: 'Sub Admin User',
    email: 'subadmin@ttii.test',
    phone: '9000000008',
    role_id: 8,
    plainPassword: 'Subadmin@123',
  },
  {
    name: 'Counsellor User',
    email: 'counsellor@ttii.test',
    phone: '9000000009',
    role_id: 9,
    plainPassword: 'Counsellor@123',
  },
  {
    name: 'Associate User',
    email: 'associate@ttii.test',
    phone: '9000000010',
    role_id: 10,
    plainPassword: 'Associate@123',
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
    const now = new Date();

    await prisma.$runCommandRaw({
      insert: 'users',
      documents: [
        {
          _id: { $oid: randomBytes(12).toString('hex') },
          name: user.name,
          email: user.email,
          user_email: user.email,
          phone: user.phone,
          country_code: '+91',
          role_id: user.role_id,
          password: passwordHash,
          status: 1,
          deleted_at: null,
          created_at: { $date: now.toISOString() },
          updated_at: { $date: now.toISOString() },
        },
      ],
    });

    console.log(`  [created] ${user.email} (role_id: ${user.role_id})`);
  }

  console.log('\n--- Demo login credentials ---');
  console.log('Super Admin:  admin@ttii.test        / Admin@123        (role 1)');
  console.log('Student:      student@ttii.test      / Student@123      (role 2)');
  console.log('Instructor:   instructor@ttii.test   / Instructor@123   (role 3)');
  console.log('Centre:       centre@ttii.test       / Centre@123       (role 7)');
  console.log('Sub Admin:    subadmin@ttii.test      / Subadmin@123     (role 8)');
  console.log('Counsellor:   counsellor@ttii.test   / Counsellor@123   (role 9)');
  console.log('Associate:    associate@ttii.test    / Associate@123    (role 10)');
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
