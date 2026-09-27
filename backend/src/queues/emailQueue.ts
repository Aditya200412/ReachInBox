import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const connection = createRedisConnection();

export const emailQueue = new Queue('email-send', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

/**
 * Add an email job to the BullMQ queue with a deterministic job ID.
 * The delay is the number of milliseconds from now until the email should be processed.
 */
export async function addEmailJob(
  emailId: string,
  campaignId: string,
  userId: string,
  delayMs: number
) {
  const jobId = `email-send-${emailId}`;

  logger.debug({ emailId, jobId, delayMs }, 'Adding email job to queue');

  return emailQueue.add(
    'send',
    { emailId, campaignId, userId },
    {
      jobId,
      delay: Math.max(0, delayMs),
    }
  );
}
