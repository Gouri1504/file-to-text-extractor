// routes/auth.routes.js
// Owns the /api/auth surface. Validation schemas live next to the routes
// (not in a separate file) because they're tiny and reading the route
// alongside its contract is convenient. Rate limiting is applied here
// because login/signup are common credential-stuffing targets.

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { validate } from '../middleware/validate.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import {
  signup,
  login,
  logout,
  me,
  firebaseLogin,
  authConfig,
} from '../controllers/auth.controller.js';

const router = Router();

// 10 attempts / 15 min / IP. Generous for normal users, tight for bots.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Token exchange is cheap for us but still worth bounding per IP.
const firebaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
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

const firebaseSchema = z.object({
  body: z.object({
    // Firebase ID tokens are ~1KB JWTs.
    idToken: z.string().min(1).max(4096),
  }),
});

// Login CSRF guard: a cross-site <form> can POST urlencoded bodies without
// a CORS preflight, which would let another site log a victim into the
// attacker's account. JSON bodies always trigger a preflight, which our
// CORS allow-list rejects for foreign origins.
const requireJson = (req, _res, next) =>
  req.is('application/json')
    ? next()
    : next(new ApiError(415, 'Content-Type must be application/json'));

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', verifyJWT, me);
router.get('/config', authConfig);

// Google sign-in via Firebase - only registered when configured. The SPA
// checks /config and hides the button when this is off.
if (env.FIREBASE_AUTH_ENABLED) {
  router.post('/firebase', firebaseLimiter, requireJson, validate(firebaseSchema), firebaseLogin);
}

export default router;
