// routes/comparison.routes.js
// Owns /api/comparisons. Schema enforces 2-5 valid Mongo ObjectIds.

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { create, list, getOne } from '../controllers/comparison.controller.js';

const router = Router();

// Same rationale as upload limiter: comparisons cost a Gemini call.
const compareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), {
  message: 'Invalid id',
});

const createSchema = z.object({
  body: z.object({
    documentIds: z.array(objectId).min(2).max(5),
  }),
});

router.use(verifyJWT);

router.get('/', list);
router.post('/', compareLimiter, validate(createSchema), create);
router.get('/:id', getOne);

export default router;
