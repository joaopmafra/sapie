import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import {
  ProtectedRoute,
  PublicRoute,
  AuthErrorBoundary,
} from './components/auth';
import Header from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import ContentWorkspacePage from './pages/ContentWorkspacePage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <Router>
          <div className='App'>
            <Header />
            <Routes>
              {/* Protected routes - require authentication */}
              <Route
                path='/'
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/workspace'
                element={
                  <ProtectedRoute>
                    <ContentWorkspacePage />
                  </ProtectedRoute>
                }
              />

              {/* Public routes - redirect authenticated users away */}
              <Route
                path='/login'
                element={
                  <PublicRoute>
                    <LoginPage />
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
