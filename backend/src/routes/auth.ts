import { Router } from 'express';
import passport from 'passport';
import { authMiddleware } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';

const router: Router = Router();

// Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=auth_failed',
  }),
  authController.googleCallback
);

// Get current user
router.get('/me', authMiddleware, authController.getMe);

// Logout
router.post('/logout', authController.logout);

export default router;
