// config/firebase.js
// Firebase Admin, used only to verify ID tokens from the frontend's
// Firebase Google sign-in. verifyIdToken checks the signature against
// Google's public keys plus the audience/issuer for our project, so the
// project id is all it needs - no service-account credentials.

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import env from './env.js';

export const getFirebaseAuth = () => {
  if (!env.FIREBASE_AUTH_ENABLED) {
    throw new Error('Firebase auth is not configured (FIREBASE_PROJECT_ID missing)');
  }
  const app = getApps()[0] ?? initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  return getAuth(app);
};
