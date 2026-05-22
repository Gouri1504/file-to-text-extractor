// app.js
// Builds the Express application: middleware stack -> routes -> error handler.
// We intentionally separate this from server.js so future tests/scripts can
// import `app` without binding a port or starting Mongo.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import env from './config/env.js';
import passport from './config/passport.js';

import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import comparisonRoutes from './routes/comparison.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Trust the first proxy hop in production deployments (Render, Railway etc.)
// so secure cookies and rate-limit IP detection work behind a load balancer.
app.set('trust proxy', 1);

app.use(helmet());

// CORS must allow credentials so the browser sends our auth cookie. The
// origin is pinned to the configured frontend URL - we never allow "*"
// alongside credentials (the browser would reject it anyway).
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport is initialized for the OAuth handshake only (no sessions).
app.use(passport.initialize());

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Liveness probe - useful for uptime monitors and platform health checks.
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'ok', uptime: process.uptime() }),
);

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/comparisons', comparisonRoutes);

// 404 for unknown /api/* routes. Anything else falls through and lets the
// platform decide (helpful when fronting a static build).
app.use('/api', (_req, res) =>
  res.status(404).json({ success: false, message: 'Not found' }),
);

// Must be last - Express treats four-arg fns as error handlers.
app.use(errorHandler);

export default app;
