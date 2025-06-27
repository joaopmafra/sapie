import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import {
  ProtectedRoute,
  PublicRoute,
  AuthErrorBoundary,
} from './components/auth';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import StatusPage from './pages/StatusPage';
import './App.css';

function App() {
  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <Router>
          <div className='App'>
            <Routes>
              {/* Protected routes - require authentication */}
              <Route
                path='/'
                element={
                  <ProtectedRoute>
                    <AppLayout showNavigation={true}>
                      <HomePage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path='/status'
                element={
                  <ProtectedRoute>
                    <AppLayout showNavigation={true}>
                      <StatusPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Public routes - redirect authenticated users away */}
              <Route
                path='/login'
                element={
                  <PublicRoute>
                    <AppLayout showNavigation={false}>
                      <LoginPage />
                    </AppLayout>
                  </PublicRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </AuthErrorBoundary>
  );
}

export default App;
