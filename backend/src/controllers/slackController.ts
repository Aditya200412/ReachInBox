import { Request, Response, NextFunction } from 'express';
import { WebClient } from '@slack/web-api';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

/**
 * Initiate Slack OAuth flow.
 */
export async function connectSlack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!config.SLACK_CLIENT_ID || !config.SLACK_CLIENT_SECRET) {
      throw new AppError('Slack integration is not configured', 503, 'SLACK_NOT_CONFIGURED');
    }

    const state = Buffer.from(JSON.stringify({ userId: req.user!.id })).toString('base64');

    const params = new URLSearchParams({
      client_id: config.SLACK_CLIENT_ID,
      scope: 'chat:write,chat:write.public,channels:read,channels:join',
      redirect_uri: config.SLACK_REDIRECT_URI,
      state,
    });

    res.redirect(`${SLACK_OAUTH_URL}?${params.toString()}`);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Slack OAuth callback.
 */
export async function slackCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      res.redirect(`${config.FRONTEND_URL}/dashboard?slack=error&message=no_code`);
      return;
    }

    // Decode state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      userId = stateData.userId;
    } catch {
      res.redirect(`${config.FRONTEND_URL}/dashboard?slack=error&message=invalid_state`);
      return;
    }

    // Exchange code for token
    const tokenResponse = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.SLACK_CLIENT_ID,
        client_secret: config.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: config.SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenData.ok) {
      logger.error({ error: tokenData.error }, 'Slack OAuth token exchange failed');
      res.redirect(`${config.FRONTEND_URL}/dashboard?slack=error&message=token_exchange_failed`);
      return;
    }

    // Resolve the correct channel ID using the Slack Web API
    // (incoming_webhook is only present with webhook scopes, not chat:write)
    const slack = new WebClient(tokenData.access_token);
    let channelId = '';
    let channelName = '';

    try {
      const channelsResp = await slack.conversations.list({ limit: 200 });
      const channels = channelsResp.channels || [];

      // Prefer #general, fall back to first available channel
      const generalChannel = channels.find((c) => c.name === 'general');
      const firstChannel = channels[0];
      const chosen = generalChannel || firstChannel;

      if (chosen) {
        // Try to join the channel (requires channels:join scope)
        if (!chosen.is_member) {
          try {
            await slack.conversations.join({ channel: chosen.id! });
            logger.info({ channel: chosen.name }, 'Bot joined Slack channel');
          } catch {
            // channels:join not in scope — user needs to invite bot manually
            logger.info({ channel: chosen.name }, 'Could not auto-join channel (missing channels:join scope)');
          }
        }
        channelId = chosen.id || '';
        channelName = chosen.name || '';
      }
    } catch (chErr) {
      logger.warn({ chErr }, 'Could not list Slack channels, using fallback');
      channelId = tokenData.incoming_webhook?.channel_id || '';
      channelName = tokenData.incoming_webhook?.channel || '';
    }

    logger.info({ channelId, channelName }, 'Resolved Slack channel');


    // Upsert Slack connection
    await prisma.slackConnection.upsert({
      where: { userId },
      create: {
        userId,
        teamId: tokenData.team?.id || '',
        teamName: tokenData.team?.name || 'Unknown Team',
        accessToken: tokenData.access_token,
        channelId,
        channelName,
      },
      update: {
        teamId: tokenData.team?.id || '',
        teamName: tokenData.team?.name || 'Unknown Team',
        accessToken: tokenData.access_token,
        channelId,
        channelName,
      },
    });

    logger.info({ userId, teamName: tokenData.team?.name }, 'Slack connected');
    res.redirect(`${config.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err) {
    logger.error({ err }, 'Slack callback error');
    res.redirect(`${config.FRONTEND_URL}/dashboard?slack=error`);
  }
}

/**
 * Get Slack connection status.
 */
export async function getSlackStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
      select: { teamName: true, channelName: true, createdAt: true },
    });

    res.json({
      success: true,
      data: {
        connected: !!connection,
        teamName: connection?.teamName,
        channelName: connection?.channelName,
        connectedAt: connection?.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Disconnect Slack.
 */
export async function disconnectSlack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    await prisma.slackConnection.deleteMany({
      where: { userId },
    });

    logger.info({ userId }, 'Slack disconnected');

    res.json({
      success: true,
      data: { message: 'Slack disconnected successfully' },
    });
  } catch (err) {
    next(err);
  }
}
