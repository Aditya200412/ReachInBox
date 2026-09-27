import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}


/**
 * Authentication middleware.
 * Extracts JWT from httpOnly cookie, verifies it, and loads the user from the database.
 * The authenticated user is attached to req.user.
 * Never trusts frontend-supplied user IDs.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AuthenticationError) {
      next(err);
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid authentication token'));
    } else if (err instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Authentication token expired'));
    } else {
      logger.error({ err }, 'Auth middleware error');
      next(new AuthenticationError());
    }
  }
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email } satisfies JwtPayload, config.JWT_SECRET, {
    expiresIn: '7d',
  });
}
