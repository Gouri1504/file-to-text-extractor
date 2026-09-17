// app.js
// Builds the Express application: middleware stack -> routes -> error handler.
// We intentionally separate this from server.js so future tests/scripts can
// import `app` without binding a port or starting Mongo.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import env from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import comparisonRoutes from './routes/comparison.routes.js';
import chatRoutes from './routes/chat.routes.js';
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

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Liveness / database health probe.
//
// MongoDB readyState:
// 0 = disconnected
// 1 = connected
// 2 = connecting
// 3 = disconnecting
app.get('/api/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoConnected = mongoState === 1;

  const response = {
    success: mongoConnected,
    message: mongoConnected
      ? 'API and MongoDB are healthy'
      : 'API is running but MongoDB is not connected',

    uptime: process.uptime(),

    mongodb: {
      connected: mongoConnected,
      readyState: mongoState,
    },

    rag: {
      enabled: env.RAG_ENABLED,
    },
  };

  // Only expose connection details when MongoDB is actually connected.
  if (mongoConnected) {
    response.mongodb.host = mongoose.connection.host;
    response.mongodb.database = mongoose.connection.name;

    // This is the safe connection target.
    // It does NOT expose your MongoDB username/password.
    response.mongodb.url = `mongodb://${mongoose.connection.host}/${mongoose.connection.name}`;
  }

  return res.status(mongoConnected ? 200 : 503).json(response);
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/chat', chatRoutes);

// 404 for unknown /api/* routes. Anything else falls through and lets the
// platform decide (helpful when fronting a static build).
app.use('/api', (_req, res) =>
  res.status(404).json({ success: false, message: 'Not found' }),
);

// Must be last - Express treats four-arg fns as error handlers.
app.use(errorHandler);

export default app;
