// components/auth/ProtectedRoute.jsx
// Route guard. While the initial /me probe is in flight we render a tiny
// placeholder rather than redirect, otherwise refreshing the dashboard
// would always flash the login page. After loading, we either render
// the requested children or send the user to /login (preserving the
// attempted path so we can bounce them back after sign-in).

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../ui/Spinner.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
