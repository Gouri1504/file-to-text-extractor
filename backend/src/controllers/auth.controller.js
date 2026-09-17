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
  loginWithFirebase,
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

// Lets the SPA decide which login options to render.
export const authConfig = (_req, res) =>
  new ApiResponse(200, { googleEnabled: env.FIREBASE_AUTH_ENABLED }, 'OK').send(res);

// Google sign-in via Firebase: the SPA signs in with a popup, then sends the
// Firebase ID token here. We verify it, upsert the user, and issue our own
// JWT cookie - from here on the session is identical to email login.
export const firebaseLogin = asyncHandler(async (req, res) => {
  const user = await loginWithFirebase(req.body.idToken);
  setAuthCookie(res, user._id);
  return new ApiResponse(200, { user }, 'Logged in').send(res);
});
