// context/AuthContext.jsx
// Owns the "who is logged in?" state for the whole app. On mount we ping
// /auth/me - if the cookie is valid the backend echoes back the user, if
// not we sit at user=null. Every component that needs auth reads from this
// context (via the useAuth hook) instead of fetching /me itself.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiMe,
  apiLogin,
  apiSignup,
  apiLogout,
  apiAuthConfig,
  apiFirebaseLogin,
} from '../api/auth.api.js';

const AuthContext = createContext(null);

// Checked here (not in config/firebase.js) so the Firebase SDK can stay in
// a lazily loaded chunk until someone actually clicks the Google button.
const firebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `loading` is the initial bootstrap, distinct from form-level pending
  // states. ProtectedRoute uses it to avoid flashing the login page while
  // /me is still in flight.
  const [loading, setLoading] = useState(true);
  // Only show "Continue with Google" when both the frontend (Firebase web
  // config) and the backend (FIREBASE_PROJECT_ID) are set up.
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiMe();
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    apiAuthConfig()
      .then((data) => {
        const enabled = Boolean(data?.googleEnabled);
        if (!enabled) {
          console.warn(
            '[auth] Google sign-in hidden: the backend has no FIREBASE_PROJECT_ID ' +
              '(set it in backend/.env and restart the API).',
          );
        }
        setGoogleEnabled(enabled);
      })
      .catch(() => setGoogleEnabled(false));
  }, []);

  // Listen for the global "session expired" event dispatched by the axios
  // 401 interceptor. Keeps individual pages free of auth-error boilerplate.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = async (credentials) => {
    const data = await apiLogin(credentials);
    setUser(data.user);
    return data.user;
  };

  // Google popup via Firebase -> ID token -> backend sets our session cookie.
  const loginWithGoogle = async () => {
    const { getGoogleIdToken } = await import('../config/firebase.js');
    const idToken = await getGoogleIdToken();
    const data = await apiFirebaseLogin(idToken);
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const data = await apiSignup(payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      // Even if the request fails (offline, server down) the local state
      // should still clear so the UI returns to the logged-out shell.
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleEnabled, login, loginWithGoogle, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
