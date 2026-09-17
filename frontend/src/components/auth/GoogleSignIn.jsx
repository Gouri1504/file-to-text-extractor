// components/auth/GoogleSignIn.jsx
// "or" divider + "Continue with Google" button, shared by the login and
// signup pages. Uses Firebase's Google popup; the pages already redirect
// once `user` is set. Renders nothing when Google sign-in isn't configured.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../ui/Button.jsx';

// Firebase error codes that mean "the user backed out" - no error toast.
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const errorMessage = (err) => {
  if (err.code === 'auth/popup-blocked') {
    return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
  }
  if (err.code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for Google sign-in (add it in Firebase console).';
  }
  if (err.code === 'auth/network-request-failed') {
    return 'Network error during Google sign-in.';
  }
  return err.response?.data?.message || 'Google sign-in failed';
};

export default function GoogleSignIn() {
  const { googleEnabled, loginWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);
  if (!googleEnabled) return null;

  const handleClick = async () => {
    setPending(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google');
    } catch (err) {
      if (!CANCELLED.has(err.code)) toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <div className="divider"><span>or</span></div>
      <Button type="button" variant="google" onClick={handleClick} loading={pending}>
        Continue with Google
      </Button>
    </>
  );
}
