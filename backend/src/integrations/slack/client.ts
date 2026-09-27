import { WebClient } from '@slack/web-api';
import { logger } from '../../utils/logger.js';

/**
 * Send a message to a Slack channel using the Web API.
 */
export async function sendSlackMessage(
  accessToken: string,
  channelId: string,
  text: string
): Promise<boolean> {
  try {
    const slack = new WebClient(accessToken);
    await slack.chat.postMessage({
      channel: channelId,
      text,
    });
    return true;
  } catch (error) {
    logger.error({ error, channelId }, 'Failed to send Slack message');
    return false;
  }
}

/**
 * Format a rate limit notification message for Slack.
 */
export function formatRateLimitNotification(
  senderEmail: string,
  hourlyLimit: number
): string {
  return [
    '⚠️ *ReachInbox Scheduler — Rate Limit Reached*',
    '',
    `Sender \`${senderEmail}\` has reached the configured hourly email limit of *${hourlyLimit}*.`,
    'Additional emails have been delayed until the next available sending window.',
  ].join('\n');
}
