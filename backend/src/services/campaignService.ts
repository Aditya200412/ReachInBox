import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma.js';
import { addEmailJob } from '../queues/emailQueue.js';
import { indexEmail } from '../integrations/elasticsearch/indexManager.js';
import { logger } from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export interface CreateCampaignInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export const campaignService = {
  async createCampaign(userId: string, input: CreateCampaignInput) {
    const { subject, body, recipients, startTime, delayBetweenEmails, hourlyLimit } = input;

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ValidationError('User record not found. Please log in again.');
    }

    // Validate recipients on the backend
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const validRecipients = recipients.filter((r) => emailRegex.test(r.trim().toLowerCase()));

    if (validRecipients.length === 0) {
      throw new ValidationError('No valid email recipients provided');
    }

    // Deduplicate (case-insensitive)
    const uniqueRecipients = [...new Set(validRecipients.map((r) => r.trim().toLowerCase()))];

    // Safely parse start time
    const startDateObj = startTime && !isNaN(new Date(startTime).getTime())
      ? new Date(startTime)
      : new Date(Date.now() + 60000);

    // Find default sender
    const sender = await prisma.sender.findFirst({
      where: { isDefault: true },
    });
    const senderId = sender?.id || null;

    // Create Campaign record
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        subject,
        body,
        startTime: startDateObj,
        delayBetweenEmails,
        hourlyLimit,
        totalRecipients: uniqueRecipients.length,
        senderId,
        status: 'ACTIVE',
      },
    });

    logger.info(
      { campaignId: campaign.id, userId, recipients: uniqueRecipients.length },
      'Campaign created'
    );

    const baseStartTime = startDateObj.getTime();
    const now = Date.now();

    // Prepare email records
    const emailRecords = uniqueRecipients.map((recipientEmail, index) => {
      const emailId = uuidv4();
      const scheduledAtTime = baseStartTime + index * delayBetweenEmails;

      return {
        id: emailId,
        campaignId: campaign.id,
        userId,
        recipientEmail,
        subject,
        body: body.replace(/\{\{email\}\}/g, recipientEmail),
        scheduledAt: new Date(scheduledAtTime),
        status: 'SCHEDULED' as const,
        idempotencyKey: `email:${emailId}`,
        _delayMs: Math.max(0, scheduledAtTime - now), // temp field for queue
      };
    });

    // Bulk insert emails
    await prisma.email.createMany({
      data: emailRecords.map(({ _delayMs, ...record }) => record),
      skipDuplicates: true,
    });

    logger.info(
      { campaignId: campaign.id, emailCount: emailRecords.length },
      'Email records created'
    );

    // Create BullMQ delayed jobs
    for (const record of emailRecords) {
      await addEmailJob(record.id, campaign.id, userId, record._delayMs);
    }

    logger.info(
      { campaignId: campaign.id, jobCount: emailRecords.length },
      'BullMQ jobs created'
    );

    // Best-effort ES indexing for scheduled emails
    for (const record of emailRecords) {
      indexEmail({
        emailId: record.id,
        campaignId: record.campaignId,
        userId: record.userId,
        recipientEmail: record.recipientEmail,
        subject: record.subject,
        body: record.body,
        status: record.status,
        scheduledAt: record.scheduledAt,
        createdAt: new Date(),
      }).catch((err) => {
        logger.debug({ err, emailId: record.id }, 'ES indexing deferred');
      });
    }

    return {
      ...campaign,
      totalRecipients: uniqueRecipients.length,
    };
  },

  async getUserCampaigns(userId: string) {
    return prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { emails: true } },
      },
    });
  },

  async getCampaignById(userId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        _count: { select: { emails: true } },
        emails: {
          select: {
            id: true,
            recipientEmail: true,
            status: true,
            scheduledAt: true,
            sentAt: true,
          },
          orderBy: { scheduledAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    return campaign;
  },
};
