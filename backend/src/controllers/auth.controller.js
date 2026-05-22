// controllers/auth.controller.js
// Translates HTTP <-> auth.service. Each handler is a thin wrapper:
// parse req, call service, set cookie, send JSON. Validation happens
// in middleware via Zod schemas declared in routes.

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  signupWithEmail,
  loginWithEmail,
  setAuthCookie,
  clearAuthCookie,
  findOrCreateGoogleUser,
} from '../services/auth.service.js';
import env from '../config/env.js';

export const signup = asyncHandler(async (req, res) => {
  const user = await signupWithEmail(req.body);
  setAuthCookie(res, user._id);
  return new ApiResponse(201, { user }, 'Account created').send(res);
});

export const login = asyncHandler(async (req, res) => {
  const user = await loginWithEmail(req.body);
  setAuthCookie(res, user._id);
  return new ApiResponse(200, { user }, 'Logged in').send(res);
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  return new ApiResponse(200, null, 'Logged out').send(res);
});

export const me = asyncHandler(async (req, res) =>
  new ApiResponse(200, { user: req.user }, 'OK').send(res),
);

// Google OAuth: passport hands us the profile via req.user (NOT the User
// document - that's our own model). We upsert, mint a cookie, and bounce
// the browser back to the frontend.
export const googleCallback = asyncHandler(async (req, res) => {
  const profile = req.user;
  const user = await findOrCreateGoogleUser(profile);
  setAuthCookie(res, user._id);
  // Frontend reads the cookie via /me on mount. We just redirect home.
  res.redirect(env.CLIENT_URL);
});
