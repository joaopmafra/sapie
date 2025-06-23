import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import LoadingComponent from './LoadingComponent';

interface AuthRedirectProps {
  authenticatedRedirect?: string;
  unauthenticatedRedirect?: string;
}

const AuthRedirect = ({
  authenticatedRedirect = '/',
  unauthenticatedRedirect = '/login',
}: AuthRedirectProps) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log redirects for debugging
    if (!loading) {
      console.log('AuthRedirect: Authentication state changed', {
        isAuthenticated: !!currentUser,
        currentPath: location.pathname,
        intendedDestination: location.state?.from?.pathname,
      });
    }
  }, [currentUser, loading, location]);

  // Show loading while checking authentication status
  if (loading) {
    return <LoadingComponent />;
  }

  if (currentUser) {
    // User is authenticated - redirect to intended destination or default
    const from = location.state?.from?.pathname || authenticatedRedirect;
    return <Navigate to={from} replace />;
  } else {
    // User is not authenticated - redirect to login
    return (
      <Navigate
        to={unauthenticatedRedirect}
        state={{ from: location }}
        replace
      />
    );
  }
};

export default AuthRedirect;
