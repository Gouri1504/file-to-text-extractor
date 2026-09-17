// routes/chat.routes.js
// Owns /api/chat - question answering over the user's indexed documents.

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { askQuestion } from '../controllers/chat.controller.js';

const router = Router();

// Each question costs an embedding + an LLM call.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), {
  message: 'Invalid id',
});

const askSchema = z.object({
  body: z.object({
    question: z.string().trim().min(1, 'Question is required').max(1000),
    // Optional scope; omitted or empty = search all of the user's documents.
    documentIds: z.array(objectId).max(20).optional(),
  }),
});

router.use(verifyJWT);

router.post('/', chatLimiter, validate(askSchema), askQuestion);

export default router;
