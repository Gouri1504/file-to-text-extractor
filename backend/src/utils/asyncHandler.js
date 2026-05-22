// utils/asyncHandler.js
// Wraps an async route handler so any thrown/rejected error is forwarded to
// Express's `next` (and therefore to our error middleware), instead of
// becoming an unhandled promise rejection. This lets us write controllers
// as plain async functions with no try/catch boilerplate.

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
