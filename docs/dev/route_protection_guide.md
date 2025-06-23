# Route Protection Guide

This guide explains how to implement and use route protection in the Sapie application.

## Overview

The application uses a comprehensive route protection system that integrates with Firebase Authentication to control access to protected pages and manage navigation flow based on authentication status.

## Components

### Authentication Guards

#### ProtectedRoute

Wraps components that require authentication. Redirects unauthenticated users to the login page.

```tsx
import { ProtectedRoute } from '../components/auth';

<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  } 
/>
```

**Features:**
- Shows loading state during authentication check
- Redirects to `/login` if user is not authenticated
- Preserves intended destination for post-login redirect
- Integrates with existing `AuthContext`

#### PublicRoute

Wraps components that should only be accessible to unauthenticated users (e.g., login page).

```tsx
import { PublicRoute } from '../components/auth';

<Route 
  path="/login" 
  element={
    <PublicRoute>
      <LoginPage />
    </PublicRoute>
  } 
/>
```

**Features:**
- Redirects authenticated users away from public routes
- Supports custom redirect destination
- Handles intended destination from location state

#### AuthRedirect

A utility component for handling automatic redirects based on authentication state.

```tsx
import { AuthRedirect } from '../components/auth';

<Route 
  path="/auth-check" 
  element={
    <AuthRedirect 
      authenticatedRedirect="/dashboard"
      unauthenticatedRedirect="/login"
    />
  } 
/>
```

**Props:**
- `authenticatedRedirect`: Where to redirect authenticated users (default: `/`)
- `unauthenticatedRedirect`: Where to redirect unauthenticated users (default: `/login`)

### Support Components

#### LoadingComponent

Displays a loading state during authentication checks.

```tsx
import { LoadingComponent } from '../components/auth';

<LoadingComponent message="Checking authentication..." />
```

#### AuthErrorBoundary

Handles authentication-related errors gracefully.

```tsx
import { AuthErrorBoundary } from '../components/auth';

<AuthErrorBoundary>
  <App />
</AuthErrorBoundary>
```

## Implementation Example

### Basic Setup

```tsx
// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, AuthErrorBoundary } from './components/auth';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Protected routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } 
            />
            
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </AuthErrorBoundary>
  );
}
```

### Navigation Flow

1. **Unauthenticated User Accesses Protected Route:**
   - User navigates to `/` (protected)
   - `ProtectedRoute` detects no authentication
   - Redirects to `/login` with intended destination stored
   - After login, user is redirected back to `/`

2. **Authenticated User Accesses Public Route:**
   - User navigates to `/login` (public)
   - `PublicRoute` detects authentication
   - Redirects to `/` (or intended destination)

3. **Error Handling:**
   - Authentication errors are caught by `AuthErrorBoundary`
   - User sees error message with retry options
   - Graceful fallback to functional state

## Best Practices

### Route Configuration

```tsx
// ✅ Good: Clear separation of protected and public routes
<Routes>
  {/* Protected routes - require authentication */}
  <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
  
  {/* Public routes - redirect authenticated users away */}
  <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
  <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
</Routes>

// ❌ Avoid: Mixed protection without clear organization
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
</Routes>
```

### Error Handling

```tsx
// ✅ Good: Wrap entire app with error boundary
<AuthErrorBoundary>
  <AuthProvider>
    <Router>
      <Routes>
        {/* routes */}
      </Routes>
    </Router>
  </AuthProvider>
</AuthErrorBoundary>

// ✅ Good: Custom error boundary for specific sections
<AuthErrorBoundary fallback={<CustomErrorPage />}>
  <ProtectedRoute>
    <SensitiveDataPage />
  </ProtectedRoute>
</AuthErrorBoundary>
```

### Navigation State Management

```tsx
// ✅ Good: Handle navigation after authentication changes
const handleLogout = async () => {
  try {
    await logout();
    navigate('/login', { replace: true });
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

// ✅ Good: Preserve intended destination
const handleSignInSuccess = () => {
  const from = location.state?.from?.pathname || '/';
  navigate(from, { replace: true });
};
```

## Testing

### E2E Tests

Route protection functionality is tested with comprehensive end-to-end tests:

```typescript
// tests/auth/route-protection.spec.ts
test('redirects unauthenticated users from protected routes to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
});

test('preserves intended destination after authentication', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
  // After login, should redirect back to '/'
});
```

### Manual Testing Checklist

- [ ] Protected routes redirect to login when unauthenticated
- [ ] Public routes redirect authenticated users away
- [ ] Intended destination is preserved after login
- [ ] Loading states are shown during auth checks
- [ ] Error boundaries handle auth failures gracefully
- [ ] Navigation state updates correctly after login/logout
- [ ] Browser back/forward navigation works correctly

## Troubleshooting

### Common Issues

**Issue: Infinite redirect loops**
- **Cause:** Conflicting route protection logic
- **Solution:** Ensure routes are categorized correctly as protected or public

**Issue: Authentication state not updating**
- **Cause:** Components not wrapped in `AuthProvider`
- **Solution:** Verify `AuthProvider` wraps all components that need auth state

**Issue: Intended destination not working**
- **Cause:** Location state not preserved during redirects
- **Solution:** Use `replace: true` and check state preservation

**Issue: Loading state flickers**
- **Cause:** Authentication check resolves too quickly
- **Solution:** This is expected behavior for fast auth checks

## Integration with Existing Systems

### Firebase Authentication

The route protection system integrates seamlessly with Firebase Authentication:

```tsx
// AuthContext.tsx
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### API Authentication

Protected routes work with authenticated API calls:

```tsx
// In protected components
const { currentUser } = useAuth();
const config = await createAuthenticatedApiConfiguration(API_BASE_URL, currentUser);
```

## Performance Considerations

- **Minimal Re-renders:** Guards only re-render when authentication state changes
- **Lazy Loading:** Components are only loaded when authentication permits access
- **Error Boundaries:** Prevent authentication errors from crashing the entire app
- **Route Optimization:** Uses React Router's built-in optimization for navigation

## Security Notes

- **Client-side Only:** This is client-side route protection for UX purposes
- **Server-side Required:** Always validate authentication on the server/API level
- **Token Validation:** API endpoints must validate Firebase ID tokens
- **Sensitive Data:** Never rely solely on client-side protection for sensitive data 