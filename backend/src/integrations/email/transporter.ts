import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create the Nodemailer transporter for Ethereal Email.
 * If ETHEREAL_USER is empty, auto-creates a test account.
 */
export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) {
    return transporter;
  }

  let user = config.ETHEREAL_USER;
  let pass = config.ETHEREAL_PASSWORD;

  if (!user) {
    logger.info('ETHEREAL_USER not set, creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    logger.info({ user }, 'Ethereal test account created (password in server logs only)');
  }

  transporter = nodemailer.createTransport({
    host: config.ETHEREAL_HOST,
    port: config.ETHEREAL_PORT,
    secure: config.ETHEREAL_PORT === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

/**
 * Get the Ethereal preview URL for a sent message.
 */
export function getPreviewUrl(info: any): string | false {
  return nodemailer.getTestMessageUrl(info);
}
