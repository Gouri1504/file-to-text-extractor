// pages/SignupPage.jsx
// Mirror of LoginPage with an extra "name" field. The 8-char password
// minimum mirrors the backend Zod schema so users get instant feedback.

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { googleLoginUrl } from '../api/auth.api.js';
import Button from '../components/ui/Button.jsx';
import PageTransition from '../components/layout/PageTransition.jsx';

export default function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await signup(form);
      toast.success('Account created!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
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
        <h1>Create your account</h1>
        <p className="auth-card__sub">Start parsing claim documents in seconds.</p>

        <form onSubmit={handleSubmit} className="form">
          <label className="form__field">
            <span>Name</span>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
            />
          </label>
          <label className="form__field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
            />
          </label>
          <label className="form__field">
            <span>Password</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={update('password')}
            />
          </label>
          <Button type="submit" loading={submitting}>Create account</Button>
        </form>

        <div className="divider"><span>or</span></div>

        <a className="btn btn--google" href={googleLoginUrl()}>
          Continue with Google
        </a>

        <p className="auth-card__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </PageTransition>
  );
}
