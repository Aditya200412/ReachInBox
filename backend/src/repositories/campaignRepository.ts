import { prisma } from '../config/prisma.js';

export const campaignRepository = {
  /**
   * Get all campaigns for a user, ordered by creation date.
   */
  async getUserCampaigns(userId: string) {
    return prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { emails: true } },
      },
    });
  },

  /**
   * Get a campaign by ID, scoped to user.
   */
  async getCampaignById(userId: string, campaignId: string) {
    return prisma.campaign.findFirst({
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
  },
};
