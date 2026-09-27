import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => {
  logger.error({ target: e.target, message: e.message }, 'Prisma error');
});

prisma.$on('warn', (e) => {
  logger.warn({ target: e.target, message: e.message }, 'Prisma warning');
});

export { prisma };

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma connection closed');
}
