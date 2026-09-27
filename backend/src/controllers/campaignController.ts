import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaignService.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Create a new campaign and schedule all emails.
 */
export async function createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { subject, body, recipients, startTime, delayBetweenEmails, hourlyLimit } = req.body;

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      throw new ValidationError('Subject is required');
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      throw new ValidationError('Body is required');
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new ValidationError('At least one valid recipient email is required');
    }

    const parsedDelay = Number(delayBetweenEmails) || 2000;
    const parsedHourlyLimit = Number(hourlyLimit) || 200;

    const campaign = await campaignService.createCampaign(userId, {
      subject: subject.trim(),
      body,
      recipients,
      startTime: startTime || new Date(Date.now() + 60000).toISOString(),
      delayBetweenEmails: parsedDelay,
      hourlyLimit: parsedHourlyLimit,
    });

    logger.info(
      { campaignId: campaign.id, userId, recipientCount: campaign.totalRecipients },
      'Campaign created'
    );

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List campaigns for the authenticated user.
 */
export async function getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const campaigns = await campaignService.getUserCampaigns(userId);

    res.json({
      success: true,
      data: campaigns,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a specific campaign by ID (scoped to authenticated user).
 */
export async function getCampaignById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const campaign = await campaignService.getCampaignById(userId, id);

    res.json({
      success: true,
      data: campaign,
    });
  } catch (err) {
    next(err);
  }
}
