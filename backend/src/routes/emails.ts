import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import * as emailController from '../controllers/emailController.js';

const router: Router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/csv'];
    const ext = file.originalname.toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.csv') || ext.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and text files are allowed'));
    }
  },
});

// All email routes require authentication
router.use(authMiddleware);

// Parse uploaded recipients file
router.post('/parse-recipients', upload.single('file'), emailController.parseRecipientsHandler);

// Get scheduled emails
router.get('/scheduled', emailController.getScheduledEmails);

// Get sent emails
router.get('/sent', emailController.getSentEmails);

// Search emails (Elasticsearch)
router.get('/search', emailController.searchEmailsHandler);

// Get email by ID
router.get('/:id', emailController.getEmailById);

export default router;
