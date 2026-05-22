// components/layout/Navbar.jsx
// Persistent top bar. Shows brand on the left, primary nav in the middle
// (only when authenticated), and an account menu on the right.

import { NavLink, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <motion.header
      className="navbar"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Link to="/" className="navbar__brand">
        <span className="navbar__logo">CS</span>
        <span>ClaimScribe</span>
      </Link>

      {user && (
        <nav className="navbar__links">
          <NavLink to="/" end className="navbar__link">Dashboard</NavLink>
          <NavLink to="/compare" className="navbar__link">Compare</NavLink>
        </nav>
      )}

      <div className="navbar__right">
        {user ? (
          <>
            <span className="navbar__user">
              {user.avatar && <img src={user.avatar} alt="" className="navbar__avatar" />}
              <span>{user.name || user.email}</span>
            </span>
            <button className="btn btn--ghost" onClick={handleLogout}>Sign out</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn btn--ghost">Sign in</NavLink>
            <NavLink to="/signup" className="btn btn--primary">Sign up</NavLink>
          </>
        )}
      </div>
    </motion.header>
  );
}
