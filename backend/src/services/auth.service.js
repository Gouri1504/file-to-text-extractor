// services/auth.service.js
// Pure auth business logic - no req/res. Controllers translate between
// HTTP and these functions. Returns plain user objects (model instances).
// Cookie issuance is also done here as a helper since every auth flow ends
// the same way: set the JWT cookie and return the sanitized user.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';

const COOKIE_NAME = 'token';

const signToken = (userId) =>
  jwt.sign({ sub: userId.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

// Centralized so cookie attributes are identical across signup/login/oauth.
// httpOnly defeats XSS exfiltration; sameSite=strict defeats most CSRF;
// secure=true is required in production (set via env).
export const setAuthCookie = (res, userId) => {
  const token = signToken(userId);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
  });
};

export const signupWithEmail = async ({ email, password, name }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with that email already exists');
  }

  // 10 rounds is the bcrypt sweet spot in 2026 - costly enough to deter
  // offline attacks, fast enough to not block the event loop on signup.
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({ email, passwordHash, name: name || email.split('@')[0] });
  return user;
};

export const loginWithEmail = async ({ email, password }) => {
  // Need .select('+passwordHash') because the schema hides it by default.
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return user;
};

// Called from the Google OAuth callback. Upserts on googleId, but if the
// user already signed up with the same email via password, we link the
// accounts by stamping googleId onto the existing record - so the same
// person never ends up with two separate users.
export const findOrCreateGoogleUser = async (profile) => {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value?.toLowerCase();
  const name = profile.displayName;
  const avatar = profile.photos?.[0]?.value;

  if (!email) {
    throw new ApiError(400, 'Google account has no email');
  }

  let user = await User.findOne({ googleId });
  if (user) return user;

  user = await User.findOne({ email });
  if (user) {
    user.googleId = googleId;
    if (!user.avatar && avatar) user.avatar = avatar;
    if (!user.name && name) user.name = name;
    await user.save();
    return user;
  }

  return User.create({ email, googleId, name, avatar });
};
