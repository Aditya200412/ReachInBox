import { Request, Response, NextFunction } from 'express';
import { emailRepository } from '../repositories/emailRepository.js';
import { parseRecipients } from '../services/emailParsingService.js';
import { searchEmails } from '../services/searchService.js';
import { logger } from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * Parse uploaded CSV/text file and extract email addresses.
 */
export async function parseRecipientsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      throw new ValidationError('No file uploaded. Please upload a CSV or text file.');
    }

    const allowedMimeTypes = [
      'text/csv',
      'text/plain',
      'application/vnd.ms-excel',
      'application/csv',
    ];
    const allowedExtensions = ['.csv', '.txt'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(ext)) {
      throw new ValidationError('Invalid file type. Only CSV and text files are supported.');
    }

    const result = await parseRecipients(file.buffer, file.mimetype, file.originalname);

    logger.info(
      {
        userId: req.user!.id,
        validCount: result.valid.length,
        invalidCount: result.invalid.length,
        duplicateCount: result.duplicates.length,
      },
      'Recipients file parsed'
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get scheduled emails for the authenticated user.
 */
export async function getScheduledEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await emailRepository.getEmailsByStatus(
      userId,
      ['SCHEDULED', 'PROCESSING'],
      page,
      limit
    );

    res.json({
      success: true,
      data: {
        data: result.emails,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get sent/failed emails for the authenticated user.
 */
export async function getSentEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await emailRepository.getEmailsByStatus(
      userId,
      ['SENT', 'FAILED'],
      page,
      limit
    );

    res.json({
      success: true,
      data: {
        data: result.emails,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Search emails via Elasticsearch.
 */
export async function searchEmailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const q = (req.query.q as string) || '';
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!q && !status) {
      // Return all emails if no search query
      const result = await emailRepository.getEmailsByStatus(
        userId,
        ['SCHEDULED', 'PROCESSING', 'SENT', 'FAILED'],
        page,
        limit
      );
      res.json({
        success: true,
        data: {
          data: result.emails,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit) || 1,
        },
      });
      return;
    }

    const result = await searchEmails(
      userId,
      q,
      status ? { status } : undefined,
      page,
      limit
    );

    res.json({
      success: true,
      data: {
        data: result.emails,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a specific email by ID.
 */
export async function getEmailById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const email = await emailRepository.getEmailById(userId, id);
    if (!email) {
      throw new NotFoundError('Email');
    }

    res.json({
      success: true,
      data: email,
    });
  } catch (err) {
    next(err);
  }
}


