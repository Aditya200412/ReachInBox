import { getTransporter, getPreviewUrl } from '../integrations/email/transporter.js';
import { logger } from '../utils/logger.js';

/**
 * Send an email via Ethereal SMTP.
 * Returns messageId and preview URL.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string; previewUrl: string | null }> {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: '"ReachInbox Scheduler" <noreply@reachinbox.test>',
      to,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
    });

    const previewUrl = getPreviewUrl(info) || null;

    logger.info({ messageId: info.messageId, to }, 'Email sent via Ethereal');

    return {
      messageId: info.messageId,
      previewUrl,
    };
  } catch (error) {
    logger.error({ error, to }, 'Failed to send email via SMTP');
    throw error;
  }
}
