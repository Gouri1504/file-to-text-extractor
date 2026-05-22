// routes/document.routes.js
// Owns /api/documents. All routes require auth - the dashboard cannot
// function for an anonymous user. Upload is rate-limited because Gemini
// calls aren't free and a runaway client could burn through the quota.

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  downloadFile,
} from '../controllers/document.controller.js';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(verifyJWT);

router.get('/', listDocuments);
router.post('/', uploadLimiter, uploadSingle, uploadDocument);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);
router.get('/:id/file', downloadFile);

export default router;
