// api/auth.api.js
// Thin wrappers around the /api/auth endpoints. Keeping these in their own
// file means components never know URLs - they import functions.

import client, { unwrap } from './client.js';

export const apiSignup = (body) => unwrap(client.post('/auth/signup', body));
export const apiLogin = (body) => unwrap(client.post('/auth/login', body));
export const apiLogout = () => unwrap(client.post('/auth/logout'));
export const apiMe = () => unwrap(client.get('/auth/me'));

// Google OAuth lives on the backend - we redirect the whole window so the
// browser follows the OAuth chain and ends up back at /auth/google/callback,
// which sets the cookie and redirects to CLIENT_URL.
export const googleLoginUrl = () => {
  const base = import.meta.env.VITE_API_URL || '/api';
  // If VITE_API_URL is relative ("/api"), build an absolute URL using the
  // current origin; otherwise use it as-is.
  const absolute = /^https?:/i.test(base) ? base : window.location.origin + base;
  return `${absolute}/auth/google`;
};
