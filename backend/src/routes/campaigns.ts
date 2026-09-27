import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as campaignController from '../controllers/campaignController.js';

const router: Router = Router();

// All campaign routes require authentication
router.use(authMiddleware);

// Create campaign and schedule emails
router.post('/', campaignController.createCampaign);

// List user's campaigns
router.get('/', campaignController.getCampaigns);

// Get campaign by ID
router.get('/:id', campaignController.getCampaignById);

export default router;
