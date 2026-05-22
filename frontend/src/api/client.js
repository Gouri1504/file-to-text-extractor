// api/client.js
// Single shared axios instance for the whole app. Two important defaults:
//   - withCredentials: the JWT lives in an httpOnly cookie set by the
//     backend, so axios must include credentials on every request and the
//     browser will attach the cookie automatically.
//   - baseURL from VITE_API_URL, with a fallback to "/api" so the dev
//     server's vite-proxy works out of the box.
//
// The 401 interceptor lets pages know the session is gone via a custom
// event. AuthContext listens for it and resets user state - this avoids
// every page having to handle 401 individually.

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL,
  withCredentials: true,
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(err);
  },
);

// Helper that pulls the API's `data` envelope out so callers don't have to
// keep writing `res.data.data`. Errors are passed through untouched so
// `error.response.data.message` is still available for toasts.
export const unwrap = (promise) => promise.then((res) => res.data?.data ?? res.data);

export default client;
