import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import LoadingComponent from './LoadingComponent';

interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Renders children only when the user is not signed in. Authenticated users are sent to
 * `location.state.from` (set by ProtectedRoute) or `redirectTo`.
 *
 * For `/login`, handle redirect in `LoginPage` so sign-in-specific rules stay with that screen.
 */
const PublicRoute = ({ children, redirectTo = '/' }: PublicRouteProps) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingComponent />;
  }

  if (currentUser) {
    const target = location.state?.from?.pathname || redirectTo;
    return <Navigate to={target} replace state={{}} />;
  }

  return <>{children}</>;
};

export default PublicRoute;
