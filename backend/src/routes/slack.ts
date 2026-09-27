import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as slackController from '../controllers/slackController.js';

const router: Router = Router();

// Connect Slack (initiates OAuth) — requires auth
router.get('/connect', authMiddleware, slackController.connectSlack);

// Slack OAuth callback — no auth middleware (state contains userId)
router.get('/callback', slackController.slackCallback);

// Get Slack connection status — requires auth
router.get('/status', authMiddleware, slackController.getSlackStatus);

// Disconnect Slack — requires auth
router.post('/disconnect', authMiddleware, slackController.disconnectSlack);

export default router;
