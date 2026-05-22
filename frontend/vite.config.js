// vite.config.js
// Standard React + Vite config plus a dev-only proxy for /api so the
// frontend can call relative URLs (e.g. axios.get("/api/auth/me")) without
// CORS preflights during local development. Production deploys configure
// the API base URL via VITE_API_URL instead.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
