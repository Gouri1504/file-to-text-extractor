// utils/ApiError.js
// Throwable error class with an HTTP status code attached. The central
// error middleware reads `statusCode` and `message` and builds a uniform
// JSON envelope. Anywhere we want a non-500 response, we throw one of these
// instead of using res.status(...).json(...) - that keeps controllers
// linear and makes early-return validations terser.

class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
