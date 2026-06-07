// middleware/auth.middleware.js
// Extracts the JWT from the httpOnly "token" cookie, verifies it, and
// attaches the resolved User document to req.user. Routes that need the
// caller's identity simply mount this middleware - they don't have to
// repeat the verification logic.

import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler(async (req, _res, next) => {
  // We deliberately accept the token from a cookie only (not a header) for
  // session-style auth between our own SPA and API. CSRF risk is mitigated
  // by sameSite=strict on the cookie.
  const token = req.cookies?.token;
  if (!token) {
    throw new ApiError(401, 'Authentication required (JWT verification failed)');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired session');
  }

  // Re-fetch the user on every request so deleted/disabled accounts are
  // immediately locked out, even with a still-valid JWT.
  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  req.user = user;
  next();
});
