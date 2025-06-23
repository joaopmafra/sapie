import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import LoadingComponent from './LoadingComponent';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication status
  if (loading) {
    return <LoadingComponent />;
  }

  // Redirect to login if user is not authenticated
  // Pass the current location as state so we can redirect back after login
  if (!currentUser) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // User is authenticated, render the children
  return <>{children}</>;
};

export default ProtectedRoute;
