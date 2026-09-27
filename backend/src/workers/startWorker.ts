import dotenv from 'dotenv';
dotenv.config();

import { createEmailWorker } from './emailWorker.js';
import { addEmailJob } from '../queues/emailQueue.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { checkElasticsearchHealth } from '../config/elasticsearch.js';
import { ensureEmailIndex } from '../integrations/elasticsearch/indexManager.js';

/**
 * Startup reconciliation: find orphaned SCHEDULED emails whose scheduledAt has passed
 * and re-enqueue them. This handles the edge case where Redis lost data.
 */
async function reconcileOrphanedEmails() {
  logger.info('Starting startup reconciliation for orphaned emails...');
  try {
    const now = new Date();

    const orphanedEmails = await prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lt: now },
      },
      select: {
        id: true,
        campaignId: true,
        userId: true,
      },
      take: 500, // Process in batches
    });

    let reEnqueued = 0;
    for (const email of orphanedEmails) {
      try {
        await addEmailJob(email.id, email.campaignId, email.userId, 0);
        reEnqueued++;
      } catch (err) {
        // Deterministic job ID prevents duplicates — if job already exists, this is fine
        logger.debug({ emailId: email.id, err }, 'Job may already exist in queue');
      }
    }

    logger.info(
      { reEnqueued, totalFound: orphanedEmails.length },
      'Startup reconciliation complete'
    );
  } catch (error) {
    logger.error({ error }, 'Error during startup reconciliation');
  }
}

async function startWorker() {
  logger.info('=== ReachInbox Email Worker Starting ===');

  // Connect to database
  await prisma.$connect();
  logger.info('PostgreSQL connected');

  // Check Elasticsearch
  const esHealthy = await checkElasticsearchHealth();
  if (esHealthy) {
    await ensureEmailIndex();
    logger.info('Elasticsearch index ready');
  }

  // Run startup reconciliation
  await reconcileOrphanedEmails();

  // Start worker with configured concurrency
  const concurrency = config.WORKER_CONCURRENCY;
  const worker = createEmailWorker(concurrency);

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, emailId: job.data.emailId }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, emailId: job?.data?.emailId, error: err.message },
      'Job failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Job stalled');
  });

  logger.info(
    { concurrency, queue: 'email-send' },
    `🔧 Email Worker started with concurrency=${concurrency}`
  );

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Worker shutdown signal received');
    await worker.close();
    await prisma.$disconnect();
    logger.info('Worker shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection in worker');
  });
}

startWorker().catch((err) => {
  logger.fatal({ err }, 'Fatal error starting worker');
  process.exit(1);
});
