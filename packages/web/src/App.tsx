import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SnackbarProvider } from 'notistack';
import { useMemo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { ProtectedRoute, AuthErrorBoundary } from './components/auth';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from './lib/queryClient';
import DeckStudyPage from './pages/DeckStudyPage';
import DeckViewPage from './pages/DeckViewPage';
import FolderPage from './pages/FolderPage';
import FolderStudyPage from './pages/FolderStudyPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NoteEditorPage from './pages/NoteEditorPage';
import StatusPage from './pages/StatusPage';
import StudyDashboard from './pages/StudyDashboard';
import StudySessionPage from './pages/StudySessionPage';
import './App.css';

function AppRoutes() {
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: '/',
          element: (
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/status',
          element: (
            <ProtectedRoute>
              <StatusPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/notes/:noteId',
          element: (
            <ProtectedRoute>
              <NoteEditorPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/folders/:folderId',
          element: (
            <ProtectedRoute>
              <FolderPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/folders/:folderId/study',
          element: (
            <ProtectedRoute>
              <FolderStudyPage />
            </ProtectedRoute>
          ),
        },

        {
          path: '/decks/:deckId',
          element: (
            <ProtectedRoute>
              <DeckViewPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/decks/:deckId/study',
          element: (
            <ProtectedRoute>
              <DeckStudyPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/study',
          element: (
            <ProtectedRoute>
              <StudyDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: '/study/session',
          element: (
            <ProtectedRoute>
              <StudySessionPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/login',
          element: <LoginPage />,
        },
      ]),
    []
  );

  return (
    <div className='App'>
      <RouterProvider router={router} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        maxSnack={3}
        style={{ zIndex: 1600 }}
      >
        <AuthErrorBoundary>
          <AuthProvider>
            <AppRoutes />
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
