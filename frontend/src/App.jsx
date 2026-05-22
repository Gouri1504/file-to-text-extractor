// App.jsx
// Top-level shell. Composes the providers (BrowserRouter, AuthProvider),
// renders the persistent Navbar, mounts AppRoutes, and pins the toast
// portal at the top-right. Kept intentionally tiny - all real logic
// lives in pages and the auth context.

import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <Navbar />
          <AppRoutes />
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            // Match the rest of the design system: rounded, subtle shadow.
            style: { borderRadius: 10, fontSize: 14 },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
