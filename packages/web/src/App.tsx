import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SnackbarProvider } from 'notistack';
import {
  // routing does not work after reloading the page; consider using HashRouter instead
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';

import {
  ProtectedRoute,
  PublicRoute,
  AuthErrorBoundary,
} from './components/auth';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from './lib/queryClient';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NoteEditorPage from './pages/NoteEditorPage';
import StatusPage from './pages/StatusPage';
import './App.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        maxSnack={3}
      >
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
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/status'
                    element={
                      <ProtectedRoute>
                        <StatusPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path='/notes/:noteId'
                    element={
                      <ProtectedRoute>
                        <NoteEditorPage />
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
      </SnackbarProvider>
      {import.meta.env.DEV ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}

export default App;
