// server.js
// Process entry point. Connects to Mongo first (so the app never starts
// serving traffic without a database) and then binds the HTTP listener.
// We also register graceful-shutdown handlers so platforms like Render,
// Railway, and Docker can stop the process cleanly.

import env from './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';
import mongoose from 'mongoose';

const start = async () => {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });

    // Common shutdown path - drain HTTP, then close Mongo. SIGINT covers
    // Ctrl-C in dev, SIGTERM is what container orchestrators send.
    const shutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down...`);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      // Hard exit if the graceful path stalls (stuck request, etc.)
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
