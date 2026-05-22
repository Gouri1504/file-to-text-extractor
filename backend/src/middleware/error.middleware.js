// middleware/error.middleware.js
// The single place errors turn into HTTP responses. Handles three buckets:
//   1. ApiError - we threw it on purpose, use its statusCode/message.
//   2. Multer errors - file too big, wrong field, etc - map to 400.
//   3. Anything else - log it, return a generic 500 (don't leak internals).

import multer from 'multer';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 10 MB limit' : err.message,
    });
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    // Stack only in dev to aid debugging without leaking in prod.
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
