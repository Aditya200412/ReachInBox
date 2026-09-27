import { Worker, Job, DelayedError } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { checkHourlyRateLimit, checkSendThrottle } from '../services/rateLimiterService.js';
import { notifyRateLimitReached } from '../services/slackNotificationService.js';
import { sendEmail } from '../services/emailSendService.js';
import { indexEmail } from '../integrations/elasticsearch/indexManager.js';
import { logger } from '../utils/logger.js';

export function createEmailWorker(concurrency: number = 10) {
  const connection = createRedisConnection();

  const worker = new Worker(
    'email-send',
    async (job: Job) => {
      const { emailId, campaignId, userId } = job.data;
      const jobLogger = logger.child({ emailId, campaignId, userId, jobId: job.id });

      // 1. Load Email from Prisma
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      // 2. If not found, acknowledge stale job
      if (!emailRecord) {
        jobLogger.warn('Email record not found, acknowledging stale job');
        return;
      }

      // 3. Idempotency check — already sent
      if (emailRecord.status === 'SENT') {
        jobLogger.info('Email already sent, skipping (idempotency)');
        return;
      }

      // 4. Cancelled check
      if (emailRecord.status === 'CANCELLED') {
        jobLogger.info('Email cancelled, skipping');
        return;
      }

      // 5. Get campaign for hourlyLimit and delayBetweenEmails
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        jobLogger.warn('Campaign not found for email job');
        return;
      }

      // 6. Determine senderId for rate limiting
      const sender = campaign.senderId
        ? await prisma.sender.findUnique({ where: { id: campaign.senderId } })
        : await prisma.sender.findFirst({ where: { isDefault: true } });
      const senderKey = sender?.email || 'default';

      // 7. HOURLY RATE LIMIT CHECK
      const rateLimitResult = await checkHourlyRateLimit(senderKey, campaign.hourlyLimit);

      if (!rateLimitResult.allowed) {
        const now = new Date();
        const hourWindow = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;

        // Fire-and-forget Slack notification
        notifyRateLimitReached(userId, senderKey, campaign.hourlyLimit, hourWindow).catch(
          (err) => jobLogger.error({ err }, 'Failed to send rate limit Slack notification')
        );

        const retryAfterMs = rateLimitResult.retryAfterMs || 3600000;
        const newScheduledAt = new Date(Date.now() + retryAfterMs);

        // Update scheduledAt in database so UI reflects the new scheduled send time
        await prisma.email.update({
          where: { id: emailId },
          data: { scheduledAt: newScheduledAt },
        }).catch((err) => jobLogger.error({ err }, 'Failed to update email scheduledAt in DB on rate limit'));

        jobLogger.info(
          { retryAfterMs, newScheduledAt },
          'Hourly rate limit reached, rescheduling job'
        );
        await job.moveToDelayed(
          Date.now() + retryAfterMs,
          job.token!
        );
        throw new DelayedError();
      }

      // 8. SEND THROTTLE CHECK (minimum delay between sends)
      const throttleResult = await checkSendThrottle(senderKey, campaign.delayBetweenEmails);

      if (!throttleResult.allowed) {
        const retryAfterMs = throttleResult.retryAfterMs || campaign.delayBetweenEmails;
        const newScheduledAt = new Date(Date.now() + retryAfterMs);

        // Update scheduledAt in database so UI reflects the new scheduled send time
        await prisma.email.update({
          where: { id: emailId },
          data: { scheduledAt: newScheduledAt },
        }).catch((err) => jobLogger.error({ err }, 'Failed to update email scheduledAt in DB on throttle'));

        jobLogger.info(
          { retryAfterMs, newScheduledAt },
          'Send throttle active, rescheduling job'
        );
        await job.moveToDelayed(
          Date.now() + retryAfterMs,
          job.token!
        );
        throw new DelayedError();
      }

      // 9. PHASE A — CLAIM (short DB transaction)
      const claimedEmail = await prisma.$transaction(async (tx) => {
        const email = await tx.email.findUnique({ where: { id: emailId } });
        if (!email) return null;

        // Re-check status after acquiring row
        if (email.status === 'SENT' || email.status === 'CANCELLED') {
          return null; // Already processed
        }

        if (email.status === 'PROCESSING') {
          // Recovery policy: allow retry if last update was >5 min ago (stale processing)
          const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
          if (email.updatedAt > staleThreshold) {
            return null; // Another worker is actively processing
          }
          jobLogger.info('Recovering stale PROCESSING email');
        }

        // Claim the email
        return tx.email.update({
          where: { id: emailId },
          data: {
            status: 'PROCESSING',
            attempts: { increment: 1 },
          },
        });
      });

      if (!claimedEmail) {
        jobLogger.info('Email skipped during claim phase (already processed or locked)');
        return;
      }

      // 10. SMTP SEND (outside any DB transaction — never hold locks during SMTP)
      try {
        const result = await sendEmail(
          claimedEmail.recipientEmail,
          claimedEmail.subject,
          claimedEmail.body
        );

        jobLogger.info(
          { messageId: result.messageId, previewUrl: result.previewUrl },
          'Email sent successfully via Ethereal'
        );

        // 11. PHASE B — COMPLETE (short DB transaction)
        const completedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            providerMessageId: result.messageId,
            previewUrl: result.previewUrl,
          },
        });

        // 12. INDEX TO ELASTICSEARCH (best-effort)
        try {
          await indexEmail({
            emailId: completedEmail.id,
            campaignId: completedEmail.campaignId,
            userId,
            recipientEmail: completedEmail.recipientEmail,
            subject: completedEmail.subject,
            body: completedEmail.body,
            status: completedEmail.status,
            scheduledAt: completedEmail.scheduledAt,
            sentAt: completedEmail.sentAt,
            createdAt: completedEmail.createdAt,
          });
        } catch (esError) {
          jobLogger.warn({ esError }, 'Best-effort ES indexing failed (email was sent)');
        }
      } catch (smtpError: any) {
        // SMTP failure handling
        const maxAttempts = job.opts.attempts || 3;
        const isLastAttempt = job.attemptsMade + 1 >= maxAttempts;

        jobLogger.error(
          { error: smtpError.message, isLastAttempt, attempt: job.attemptsMade + 1 },
          'SMTP send failed'
        );

        const failedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: isLastAttempt ? 'FAILED' : 'SCHEDULED',
            errorMessage: smtpError.message || 'Unknown SMTP error',
          },
        });

        if (isLastAttempt) {
          try {
            await indexEmail({
              emailId: failedEmail.id,
              campaignId: failedEmail.campaignId,
              userId,
              recipientEmail: failedEmail.recipientEmail,
              subject: failedEmail.subject,
              body: failedEmail.body,
              status: failedEmail.status,
              scheduledAt: failedEmail.scheduledAt,
              createdAt: failedEmail.createdAt,
            });
          } catch (esError) {
            jobLogger.warn({ esError }, 'ES indexing failed on final failure');
          }
        }

        // Re-throw so BullMQ handles retry (if not last attempt)
        throw smtpError;
      }
    },
    {
      connection,
      concurrency,
    }
  );

  return worker;
}
