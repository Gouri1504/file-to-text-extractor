// api/auth.api.js
// Thin wrappers around the /api/auth endpoints. Keeping these in their own
// file means components never know URLs - they import functions.

import client, { unwrap } from './client.js';

export const apiSignup = (body) => unwrap(client.post('/auth/signup', body));
export const apiLogin = (body) => unwrap(client.post('/auth/login', body));
export const apiLogout = () => unwrap(client.post('/auth/logout'));
export const apiMe = () => unwrap(client.get('/auth/me'));
// Which sign-in options the backend has configured (e.g. { googleEnabled }).
export const apiAuthConfig = () => unwrap(client.get('/auth/config'));
// Exchanges a Firebase ID token (from Google sign-in) for our session cookie.
export const apiFirebaseLogin = (idToken) =>
  unwrap(client.post('/auth/firebase', { idToken }));
