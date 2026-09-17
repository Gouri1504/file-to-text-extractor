// config/firebase.js
// Firebase client, used only for Google sign-in. Firebase gives us a
// short-lived ID token which the backend exchanges for our own session
// cookie - we don't keep a Firebase session in the browser at all.
// Config values are public identifiers (not secrets); they come from
// Firebase console -> Project settings -> Your apps -> Web app.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let auth = null;
const getFirebaseAuth = async () => {
  if (!auth) {
    auth = getAuth(initializeApp(config));
    // Our backend cookie is the session; don't persist Firebase's.
    await auth.setPersistence(inMemoryPersistence);
  }
  return auth;
};

// Opens the Google popup and resolves with a fresh Firebase ID token.
// Rejects with a FirebaseError (e.g. code "auth/popup-closed-by-user").
export const getGoogleIdToken = async () => {
  const firebaseAuth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  // Always show the account chooser so users can switch accounts.
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(firebaseAuth, provider);
  try {
    return await user.getIdToken();
  } finally {
    await signOut(firebaseAuth);
  }
};
