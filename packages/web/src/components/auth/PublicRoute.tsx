import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import LoadingComponent from './LoadingComponent';

interface PublicRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const PublicRoute = ({ children, redirectTo = '/' }: PublicRouteProps) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication status
  if (loading) {
    return <LoadingComponent />;
  }

  // If user is authenticated, redirect them away from public routes
  if (currentUser) {
    // Check if there's a 'from' location in state (intended destination)
    const from = location.state?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  // User is not authenticated, render the children (public content)
  return <>{children}</>;
};

export default PublicRoute;
