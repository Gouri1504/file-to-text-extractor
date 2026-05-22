// routes/auth.routes.js
// Owns the /api/auth surface. Validation schemas live next to the routes
// (not in a separate file) because they're tiny and reading the route
// alongside its contract is convenient. Rate limiting is applied here
// because login/signup are common credential-stuffing targets.

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import passport from '../config/passport.js';
import env from '../config/env.js';
import { validate } from '../middleware/validate.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import {
  signup,
  login,
  logout,
  me,
  googleCallback,
} from '../controllers/auth.controller.js';

const router = Router();

// 10 attempts / 15 min / IP. Generous for normal users, tight for bots.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1).max(60).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', verifyJWT, me);

// Google OAuth - only registered if credentials are configured. Without
// this guard, hitting these routes in a non-OAuth deployment would 500.
if (env.GOOGLE_OAUTH_ENABLED) {
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    }),
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${env.CLIENT_URL}/login?error=oauth`,
    }),
    googleCallback,
  );
}

export default router;
