// pages/LoginPage.jsx
// Email/password sign-in form with a Google button. After success, we
// route to the page the user originally tried to visit (saved by
// ProtectedRoute via location.state.from), defaulting to the dashboard.

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { googleLoginUrl } from '../api/auth.api.js';
import Button from '../components/ui/Button.jsx';
import PageTransition from '../components/layout/PageTransition.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If a logged-in user lands here (e.g. via back button), bounce them
  // straight to where they were going.
  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  // Surface OAuth callback errors via the ?error=oauth query string.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'oauth') {
      toast.error('Google sign-in was cancelled or failed.');
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ email, password });
      toast.success('Welcome back!');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <h1>Welcome back</h1>
        <p className="auth-card__sub">Sign in to access your claim history.</p>

        <form onSubmit={handleSubmit} className="form">
          <label className="form__field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="form__field">
            <span>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <Button type="submit" loading={submitting}>Sign in</Button>
        </form>

        <div className="divider"><span>or</span></div>

        <a className="btn btn--google" href={googleLoginUrl()}>
          Continue with Google
        </a>

        <p className="auth-card__footer">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </motion.div>
    </PageTransition>
  );
}
