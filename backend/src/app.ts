import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import emailRoutes from './routes/emails.js';
import slackRoutes from './routes/slack.js';

// Integrations
import { setupGoogleOAuth } from './integrations/google/oauth.js';

// Queue (for Bull Board)
import { emailQueue } from './queues/emailQueue.js';

// ---- Express App ----
const app: express.Application = express();

// ---- Security ----
app.use(helmet({
  contentSecurityPolicy: false, // Allow Bull Board UI
}));

app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting on sensitive APIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many auth attempts' } },
});

// ---- Middleware ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- Passport ----
app.use(passport.initialize());
setupGoogleOAuth();

// ---- Bull Board (BullMQ Dashboard) ----
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});

// Protect Bull Board with auth
app.use('/admin/queues', authMiddleware as any, serverAdapter.getRouter());

// ---- API Routes ----
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/campaigns', apiLimiter, campaignRoutes);
app.use('/api/emails', apiLimiter, emailRoutes);
app.use('/api/slack', apiLimiter, slackRoutes);

// ---- Health Check ----
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ---- Error Handler ----
app.use(errorHandler);

// ---- 404 Handler ----
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

export { app };
