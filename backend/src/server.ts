import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma, closePrisma } from './config/prisma.js';
import { closeRedis } from './config/redis.js';
import { checkElasticsearchHealth, closeElasticsearch } from './config/elasticsearch.js';
import { ensureEmailIndex } from './integrations/elasticsearch/indexManager.js';
import { createEmailWorker } from './workers/emailWorker.js';
import { addEmailJob } from './queues/emailQueue.js';

let workerInstance: any = null;
let syncInterval: NodeJS.Timeout | null = null;

/**
 * Queue reconciliation: find any SCHEDULED/PROCESSING emails in PostgreSQL whose BullMQ job is missing,
 * and automatically re-enqueue them into BullMQ.
 */
async function reconcileOrphanedEmails() {
  try {
    const { emailQueue } = await import('./queues/emailQueue.js');
    const now = Date.now();
    const scheduledEmails = await prisma.email.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PROCESSING'] },
      },
      select: { id: true, campaignId: true, userId: true, scheduledAt: true },
      take: 1000,
    });

    let reEnqueued = 0;
    for (const email of scheduledEmails) {
      const jobId = `email-send-${email.id}`;
      const existingJob = await emailQueue.getJob(jobId);

      if (!existingJob) {
        const delayMs = Math.max(0, new Date(email.scheduledAt).getTime() - now);
        try {
          await addEmailJob(email.id, email.campaignId, email.userId, delayMs);
          reEnqueued++;
        } catch (err) {
          logger.debug({ emailId: email.id, err }, 'Failed to re-enqueue missing job');
        }
      }
    }
    if (reEnqueued > 0) {
      logger.info({ reEnqueued }, 'Queue reconciliation complete: re-enqueued missing BullMQ jobs');
    }
  } catch (error) {
    logger.error({ error }, 'Error during queue reconciliation');
  }
}

async function startServer(): Promise<void> {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('PostgreSQL connected');

    // Check Elasticsearch (non-blocking)
    const esHealthy = await checkElasticsearchHealth();
    if (esHealthy) {
      await ensureEmailIndex();
      logger.info('Elasticsearch index ready');
    } else {
      logger.warn('Elasticsearch unavailable — search features will be limited');
    }

    // Startup reconciliation for scheduled emails
    await reconcileOrphanedEmails();

    // Start periodic queue reconciliation (every 10 seconds)
    syncInterval = setInterval(() => {
      reconcileOrphanedEmails().catch((err) => logger.debug({ err }, 'Background queue sync error'));
    }, 10000);

    // Start embedded BullMQ email worker
    workerInstance = createEmailWorker(config.WORKER_CONCURRENCY || 10);
    logger.info(`🔧 Embedded Email Worker started with concurrency=${config.WORKER_CONCURRENCY || 10}`);

    // Start HTTP server
    const server = app.listen(config.PORT, () => {
      logger.info(
        {
          port: config.PORT,
          env: config.NODE_ENV,
          frontendUrl: config.FRONTEND_URL,
          bullBoard: `http://localhost:${config.PORT}/admin/queues`,
        },
        `🚀 ReachInbox API server & worker started on port ${config.PORT}`
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      if (syncInterval) {
        clearInterval(syncInterval);
      }

      if (workerInstance) {
        await workerInstance.close();
        logger.info('Worker closed');
      }

      server.close(async () => {
        logger.info('HTTP server closed');
        await closePrisma();
        await closeRedis();
        await closeElasticsearch();
        logger.info('All connections closed. Goodbye.');
        process.exit(0);
      });


      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled promise rejection');
    });

    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'Uncaught exception — shutting down');
      process.exit(1);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
