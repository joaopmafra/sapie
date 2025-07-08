# Sapie Web App

React-based frontend for the Sapie knowledge management application.

## Architecture

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API
- **Deployment**: Firebase Hosting
- **Package Management**: PNPM (defined in packageManager field)
- **Code Quality**: ESLint + Prettier integration

## Project Structure

```
packages/web/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── FirebaseUIAuth.tsx    # FirebaseUI wrapper component
│   │   └── Header.tsx               # Navigation with auth controls
│   ├── contexts/
│   │   └── AuthContext.tsx          # Authentication state management
│   ├── lib/
│   │   └── firebase/
│   │       └── config.ts            # Firebase configuration
│   ├── pages/
│   │   ├── HomePage.tsx             # Landing page with auth status
│   │   └── LoginPage.tsx            # Authentication page
│   ├── App.tsx                      # Main application component
│   ├── App.css                      # Application styles
│   ├── main.tsx                     # Application entry point
│   └── index.css                    # Global styles
├── public/                          # Public assets
├── dist/                            # Build output
├── FIREBASE_SETUP.md                # Firebase authentication setup guide
├── .prettierrc                      # Prettier configuration
├── .prettierignore                  # Prettier ignore patterns
├── eslint.config.js                 # ESLint configuration (with Prettier integration)
├── vite.config.ts                   # Vite configuration
└── package.json                     # Package configuration (@sapie/web)
```

## Features

### Authentication System
The web app provides comprehensive authentication functionality:
- **Firebase Auth Integration**: Secure authentication with Firebase
- **FirebaseUI Components**: Pre-built, accessible authentication UI
- **Multiple Sign-In Methods**: Email/password and Google authentication
- **Session Management**: Persistent authentication state across app
- **Protected Routes**: Authentication-aware navigation and routing

### API Health Status Display
The web app demonstrates API connectivity by:
- Fetching health status from the `/api/health` endpoint
- Displaying the API response in real-time
- Showing connection status and error handling

### Modern React Stack
- **React 19**: Latest React features and performance improvements
- **TypeScript**: Full type safety and developer experience
- **Material-UI**: Modern, accessible component library
- **Vite**: Fast development server and optimized builds

## Authentication

The web app uses **Firebase Auth** with **FirebaseUI** to provide secure and user-friendly authentication flows.

### Features

- **Email/Password Authentication**: Users can register and login with email and password
- **Google Sign-In**: One-click authentication with Google accounts
- **Email Verification**: Automatic email verification for new registrations
- **Password Reset**: Built-in password reset functionality
- **Session Persistence**: User sessions persist across browser refreshes
- **Responsive UI**: FirebaseUI provides mobile-friendly authentication flows

### Authentication Architecture

The authentication system includes:

- **AuthContext** (`src/contexts/AuthContext.tsx`) - React context for authentication state
- **FirebaseUIAuth** (`src/components/auth/FirebaseUIAuth.tsx`) - Reusable FirebaseUI wrapper
- **LoginPage** (`src/pages/LoginPage.tsx`) - Complete authentication page with FirebaseUI integration
- **Header** (`src/components/Header.tsx`) - Navigation with login/logout buttons and user status

### Quick Setup

For development, the application works with placeholder Firebase configuration. For full functionality:

1. **Create a Firebase project** and enable Authentication
2. **Configure environment variables** in `.env.local` (this directory)
3. **Enable Email/Password and Google providers** in Firebase Console

See the **[Firebase Setup Guide](./FIREBASE_SETUP.md)** for detailed step-by-step instructions.

### FirebaseUI Configuration

The `FirebaseUIAuth` component is highly customizable:

```typescript
<FirebaseUIAuth
  signInSuccessUrl="/"
  signInOptions={customSignInOptions}
  onSignInSuccess={(authResult, redirectUrl) => {
    // Custom success handling
    return false; // Prevent auto-redirect
  }}
  onSignInFailure={(error) => {
    // Custom error handling
  }}
/>
```

**Available Props:**
- `signInSuccessUrl`: Redirect URL after successful authentication
- `signInOptions`: Array of authentication providers and their configuration
- `onSignInSuccess`: Custom success callback
- `onSignInFailure`: Custom error callback

**Key Configuration Options:**
- **signInFlow**: `'popup'` (default) or `'redirect'`
- **signInOptions**: Configure providers and their settings
- **tosUrl/privacyPolicyUrl**: Terms of service and privacy policy links
- **callbacks**: Custom success/failure handlers

**Provider Configuration Example:**
```typescript
const signInOptions = [
  {
    provider: EmailAuthProvider.PROVIDER_ID,
    requireDisplayName: true,
    signInMethod: EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD,
  },
  {
    provider: GoogleAuthProvider.PROVIDER_ID,
    scopes: ['profile', 'email'],
    customParameters: {
      prompt: 'select_account',
    },
  },
];
```

**Default Configuration:**
- Email/Password authentication with display name required
- Google Sign-In with profile and email scopes
- Popup flow for better UX (vs redirect)
- Terms of service and privacy policy links

### Development with Emulators

Firebase Auth emulator is automatically configured for local development:
- **Auth Emulator**: http://localhost:9099
- **Emulator UI**: http://localhost:4000
- No real Firebase project required for basic testing

### Environment Variables

Required environment variables for production (see [Firebase Setup Guide](./FIREBASE_SETUP.md)):

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_API_BASE_URL=http://127.0.0.1:5000
```

## Route Protection

The web app implements comprehensive route protection to control access to pages based on authentication status.

### Authentication Guards

The application provides several authentication guard components:

#### ProtectedRoute
Wraps components that require authentication. Redirects unauthenticated users to login.

```typescript
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

#### PublicRoute
Wraps components that should only be accessible to unauthenticated users (e.g., login page).

```typescript
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

#### AuthRedirect
A utility component for handling automatic redirects based on authentication state.

```typescript
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

### Route Protection Architecture

The route protection system includes:

- **ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`) - Guards for authenticated-only routes
- **PublicRoute** (`src/components/auth/PublicRoute.tsx`) - Guards for unauthenticated-only routes
- **AuthRedirect** (`src/components/auth/AuthRedirect.tsx`) - Utility for conditional redirects
- **LoadingComponent** (`src/components/auth/LoadingComponent.tsx`) - Loading states during auth checks
- **AuthErrorBoundary** (`src/components/auth/AuthErrorBoundary.tsx`) - Error handling for auth failures

### Features

- **Intended Destination Preservation**: Users are redirected to their originally requested page after login
- **Loading States**: Smooth loading experience during authentication checks
- **Error Boundaries**: Graceful handling of authentication errors
- **Navigation State Management**: Header and navigation components update based on auth state
- **Flexible Configuration**: Customizable redirect destinations

### Implementation Example

```typescript
// App.tsx
import { ProtectedRoute, PublicRoute, AuthErrorBoundary } from './components/auth';

function App() {
  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Protected routes - require authentication */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } 
            />
            
            {/* Public routes - redirect authenticated users away */}
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

For comprehensive documentation on route protection setup and usage, see the **[Route Protection Guide](../../docs/dev/route_protection_guide.md)**.

## Development Setup

### Prerequisites

Install dependencies for this package:
```bash
cd packages/web
pnpm install
```

### Development Commands

```bash
# Start development server
pnpm dev

# Build and watch for changes for running in Firebase Emulator
pnpm dev:emulator

# Build for production
pnpm build

# Build for running in Firebase Emulator
pnpm build:emulator

# Preview production build
pnpm preview

# Lint and format
pnpm lint
pnpm format
```

## Development Server

The development server runs on `http://localhost:5173` with:
- **Hot Module Replacement (HMR)**: Instant updates during development
- **API Proxy**: Automatically proxies `/api/*` requests to `http://localhost:3000`
- **TypeScript**: Real-time type checking

### API Integration

The web app integrates with the Sapie API through:

1. **Development Proxy** (via Vite):
   ```typescript
   // vite.config.ts
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:3000',
         changeOrigin: true,
         secure: false
       }
     }
   }
   ```

2. **Health Check Integration**:
   ```typescript
   // App.tsx
   useEffect(() => {
     fetch('/api/health')
       .then(response => response.json())
       .then(data => setHealthStatus(JSON.stringify(data, null, 2)))
       .catch(() => setHealthStatus('Error fetching health status'))
   }, [])
   ```

## Components

### App Component (`src/App.tsx`)
The main application component featuring:
- API health status display
- Interactive counter demonstration
- Material-UI components showcase
- Responsive design with Container and Grid system

### Key Features:
- **Health Status**: Real-time API connectivity display
- **Counter**: Interactive state management example
- **Responsive Layout**: Mobile-first design approach
- **Error Handling**: Graceful API error display

## Styling

### Material-UI Integration
- **Theme**: Default Material-UI theme
- **Components**: Card, Typography, Button, Container, Box
- **Icons**: Material Icons integration
- **Responsive**: Built-in responsive breakpoints

### Custom Styles
- `App.css`: Component-specific styles
- `index.css`: Global styles and CSS reset

## Code Quality

### Linting and Formatting
The package uses ESLint with Prettier integration:

```bash
# Lint code with auto-fix
pnpm run lint

# Lint code without fixes (for CI)
pnpm run lint:check

# Format code with Prettier
pnpm run format

# Check code formatting (for CI)
pnpm run format:check
```

### Configuration Files
- **ESLint**: `eslint.config.js` with TypeScript and React rules
- **Prettier**: `.prettierrc` with consistent formatting rules
- **Prettier Ignore**: `.prettierignore` to exclude certain files

## Build Process

### Production Build
```bash
pnpm run build
```

Creates optimized production build in `dist/`:
- **Code Splitting**: Automatic chunk optimization
- **Asset Optimization**: Image and CSS minification
- **TypeScript Compilation**: Type checking and compilation
- **Tree Shaking**: Unused code elimination

### Build Output
- `dist/index.html`: Main HTML file
- `dist/assets/`: Optimized JavaScript, CSS, and images
- Compatible with Firebase Hosting

## Firebase Integration

### Development with Emulator
When running via Firebase emulator (`firebase emulators:start`):
- Web app served at `http://localhost:5000`
- API calls proxied through Firebase rewrites
- Full production-like environment locally

### Staging Deployment
- Deployed to Firebase Hosting
- API calls routed to Firebase Functions
- Available at: https://sapie-b09be.web.app

## Environment Configuration

The web app uses environment variables to configure the API base URL for different environments:

### Environment Files

- `.env` - Default configuration (local development with localhost:3000)
- `.env.development` - Firebase Emulator configuration
- `.env.production` - Production configuration
- `.env.local` - Local overrides (gitignored)

### Environment Variables

- `VITE_API_BASE_URL` - Base URL for API calls

### Configuration Examples

**Local Development** (`.env`):
```
VITE_API_BASE_URL=http://localhost:3000
```

**Firebase Emulator** (`.env.development`):
```
VITE_API_BASE_URL=http://127.0.0.1:5000
```

### Usage in Development

Pass the API base URL when creating the API configuration:

```typescript
import { createApiConfiguration } from './lib/api-client';
const config = createApiConfiguration(import.meta.env.VITE_API_BASE_URL);
```

## API Client

This package uses a generated TypeScript API client based on the OpenAPI specification from the NestJS API.

### Generating the API Client

The API client is generated from the OpenAPI spec and should be regenerated whenever the API changes:

```bash
# Make sure the API server is running first
cd ../api && pnpm dev

# In another terminal, generate the client
cd ../web
pnpm generate:api-client
```

### Using the API Client

The generated client provides type-safe access to all API endpoints:

```typescript
import { HealthApi, AppApi, createApiConfiguration } from './lib/api-client';

// Create API instances
const config = createApiConfiguration();
const healthApi = new HealthApi(config);

// Use the APIs
const healthResponse = await healthApi.healthControllerGetHealth();
```

### Important Notes

- The `src/lib/api-client/` directory is auto-generated and should not be edited manually
- This directory and its contents are under version control
- Regenerate the client after any API schema changes
- The client uses axios for HTTP requests and provides full TypeScript typing

## Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Material-UI** - Component library
- **Generated API Client** - Type-safe API communication
