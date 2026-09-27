import { prisma } from '../config/prisma.js';
import { EmailStatus } from '@prisma/client';

export const emailRepository = {
  /**
   * Get emails by status for a specific user with pagination.
   */
  async getEmailsByStatus(
    userId: string,
    statuses: string[],
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      status: { in: statuses as EmailStatus[] },
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          campaignId: true,
          recipientEmail: true,
          subject: true,
          body: true,
          scheduledAt: true,
          sentAt: true,
          status: true,
          attempts: true,
          providerMessageId: true,
          previewUrl: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
      prisma.email.count({ where }),
    ]);

    return { emails, total };
  },

  /**
   * Get a single email by ID, scoped to user.
   */
  async getEmailById(userId: string, emailId: string) {
    return prisma.email.findFirst({
      where: { id: emailId, userId },
      select: {
        id: true,
        campaignId: true,
        recipientEmail: true,
        subject: true,
        body: true,
        scheduledAt: true,
        sentAt: true,
        status: true,
        attempts: true,
        providerMessageId: true,
        previewUrl: true,
        errorMessage: true,
        idempotencyKey: true,
        createdAt: true,
        updatedAt: true,
        campaign: {
          select: {
            subject: true,
            startTime: true,
            hourlyLimit: true,
            delayBetweenEmails: true,
          },
        },
      },
    });
  },

  /**
   * Get orphaned scheduled emails (for startup reconciliation).
   * Returns emails that are SCHEDULED but scheduledAt has passed.
   */
  async getOrphanedScheduledEmails(batchSize: number = 100) {
    return prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
      },
      select: {
        id: true,
        campaignId: true,
        userId: true,
      },
      take: batchSize,
      orderBy: { scheduledAt: 'asc' },
    });
  },
};
