import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a default Ethereal sender
  const sender = await prisma.sender.upsert({
    where: { email: 'demo@ethereal.email' },
    create: {
      id: uuidv4(),
      email: 'demo@ethereal.email',
      displayName: 'ReachInbox Demo Sender',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: '', // Configured via env
      smtpPass: '', // Configured via env
      isDefault: true,
    },
    update: {
      isDefault: true,
    },
  });

  console.log(`✅ Default sender created: ${sender.email}`);

  // Note: Demo users/campaigns are NOT seeded because
  // Google OAuth creates real users. The seed script only
  // sets up infrastructure data (senders).

  console.log('🌱 Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
