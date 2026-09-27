import { isRateLimitNotified, markRateLimitNotified } from './rateLimiterService.js';
import { sendSlackMessage, formatRateLimitNotification } from '../integrations/slack/client.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Send a Slack notification when a rate limit is reached.
 * Deduplicates via Redis — only one notification per sender per hour window.
 * If Slack is not connected, silently returns.
 */
export async function notifyRateLimitReached(
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
  hourWindow: string
): Promise<void> {
  try {
    // Check if already notified for this sender/window
    const alreadyNotified = await isRateLimitNotified(senderEmail, hourWindow);
    if (alreadyNotified) {
      return;
    }

    // Find user's Slack connection
    const slackConnection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!slackConnection) {
      return; // No Slack connection — don't crash
    }

    // Send notification
    const text = formatRateLimitNotification(senderEmail, hourlyLimit);
    const success = await sendSlackMessage(
      slackConnection.accessToken,
      slackConnection.channelId,
      text
    );

    if (success) {
      await markRateLimitNotified(senderEmail, hourWindow);
      logger.info({ userId, senderEmail, hourWindow }, 'Slack rate limit notification sent');
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to send rate limit Slack notification');
    // Never crash the worker due to a notification failure
  }
}

