import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { generateToken } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Initiates Google OAuth flow — handled by Passport middleware in routes.
 */
export function googleAuth() {
  // Passport middleware handles this
}

/**
 * Google OAuth callback — creates/finds user, generates JWT, redirects to frontend.
 */
export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dbUser = req.user as any;

    if (!dbUser || !dbUser.id) {
      res.redirect(`${config.FRONTEND_URL}/login?error=auth_failed`);
      return;
    }

    // Generate JWT token
    const token = generateToken(dbUser.id, dbUser.email);

    // Set httpOnly secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.redirect(`${config.FRONTEND_URL}/dashboard`);
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.redirect(`${config.FRONTEND_URL}/login?error=auth_failed`);
  }
}

/**
 * Get current authenticated user.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: req.user,
  });
}

/**
 * Logout — clear JWT cookie.
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.json({ success: true, data: { message: 'Logged out successfully' } });
}
