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
import { getFirebaseAuth } from '../config/firebase.js';

const COOKIE_NAME = 'token';

const signToken = (userId) =>
  jwt.sign({ sub: userId.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

// Converts JWT_EXPIRES_IN ("7d", "12h", "3600") to ms so the cookie never
// outlives (or dies before) the token inside it.
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
const DEFAULT_MAX_AGE = 7 * UNIT_MS.d;
const parseDurationMs = (value) => {
  const m = String(value).trim().match(/^(\d+)\s*([smhdw])?$/i);
  if (!m) return DEFAULT_MAX_AGE;
  // A bare number is seconds, matching jsonwebtoken's interpretation.
  return Number(m[1]) * UNIT_MS[(m[2] || 's').toLowerCase()];
};

// Single source of truth for cookie attributes, so set and clear always
// match (browsers only clear a cookie whose attributes line up).
// httpOnly defeats XSS exfiltration. sameSite/secure come from env:
// lax for same-site setups, none+secure for a cross-site frontend/API.
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
});

export const setAuthCookie = (res, userId) => {
  const token = signToken(userId);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
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

// Only accept tokens from a sign-in that just happened, so a leaked older
// (but still unexpired) ID token can't be replayed to mint a session.
const MAX_AUTH_AGE_SECONDS = 5 * 60;

// Verifies a Firebase ID token from the frontend's Google sign-in and
// returns our User. Upserts on googleId (the Google account's own id, so
// users created by the earlier Passport flow still match). If the user
// already signed up with the same email via password, we link the accounts
// by stamping googleId onto the existing record - so the same person never
// ends up with two separate users.
export const loginWithFirebase = async (idToken) => {
  let decoded;
  try {
    decoded = await getFirebaseAuth().verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired Google sign-in token');
  }

  if (decoded.firebase?.sign_in_provider !== 'google.com') {
    throw new ApiError(401, 'Only Google sign-in is supported');
  }
  if (Date.now() / 1000 - decoded.auth_time > MAX_AUTH_AGE_SECONDS) {
    throw new ApiError(401, 'Sign-in is too old, please try again');
  }

  const googleId = decoded.firebase.identities?.['google.com']?.[0] ?? decoded.uid;
  const email = decoded.email?.toLowerCase();
  const name = decoded.name;
  const avatar = decoded.picture;

  if (!email) {
    throw new ApiError(400, 'Google account has no email');
  }

  let user = await User.findOne({ googleId });
  if (user) return user;

  user = await User.findOne({ email });
  if (user) {
    // Only link to an existing account when Google vouches for the email;
    // otherwise anyone who can put that address on a Google account could
    // take over the password account.
    if (decoded.email_verified !== true) {
      throw new ApiError(409, 'Verify your Google email before linking it to an existing account');
    }
    user.googleId = googleId;
    if (!user.avatar && avatar) user.avatar = avatar;
    if (!user.name && name) user.name = name;
    await user.save();
    return user;
  }

  return User.create({ email, googleId, name, avatar });
};
