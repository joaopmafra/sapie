# Add core login/logout functionality

## Description
As a user, I want to login and logout of the application using email/password or Google authentication.

## Tasks

### Frontend (React Web App)
- [x] Install and configure Firebase SDK and FirebaseUI in web package
  - Add `firebase` and `firebaseui` dependencies to `packages/web/package.json`
  - Create Firebase configuration file (`src/lib/firebase/config.ts`)
  - Initialize Firebase Auth in the application
  - Configure FirebaseUI with email/password and Google providers
- [x] Create authentication context and provider
  - Create `src/contexts/AuthContext.tsx` for managing auth state
  - Implement `AuthProvider` component to wrap the app
  - Add authentication hooks (`useAuth`, `useAuthRequired`)
- [x] Implement FirebaseUI authentication components
  - Create `src/components/auth/FirebaseUIAuth.tsx` wrapper component
  - Configure FirebaseUI with email/password and Google sign-in providers
  - Import and apply FirebaseUI CSS styles for consistent UI
  - Handle FirebaseUI callbacks and error states
- [x] Create authentication pages using FirebaseUI
  - Create `src/pages/LoginPage.tsx` using FirebaseUI component
  - Integrate FirebaseUI widget for unified login/signup experience
  - Add routing for authentication pages
  - Configure sign-in flow (redirect vs popup) for optimal UX
- [x] Implement basic logout functionality
  - Add logout method to authentication context
  - Create logout button component
  - Handle logout state transitions

### Firebase Configuration
- [x] Configure Firebase Auth providers
  - Enable Email/Password authentication in Firebase Console
  - Configure Google Sign-In provider with OAuth 2.0 credentials
  - Set up authentication domains and redirect URLs
  - Configure Google OAuth consent screen and authorized domains
- ~~[ ] Update Firebase security rules~~
  - ~~Create Firestore security rules for user data~~
  - ~~Configure Firebase Storage rules if needed~~
  - ~~Test security rule validation~~
- [x] Configure Firebase Auth settings
  - Set up email templates for verification and password reset
  - Configure password requirements
  - Set up authorized domains for test

### Development & Testing
- [x] Update development environment
  - Configure Firebase Auth emulator for local development
  - Update build scripts to handle Firebase Auth and FirebaseUI
  - Add environment variables for Firebase configuration
  - ~~Configure Google OAuth credentials for development environment~~
- ~~[ ] Add unit tests~~
  - ~~Test authentication context and hooks~~
  - ~~Test FirebaseUI integration and callbacks~~
  - ~~Test Google sign-in flow~~
  - ~~Test logout functionality~~
- [x] Add end-to-end tests
  - Create e2e tests for email/password login flow in `packages/test-e2e`
  - ~~Create e2e tests for Google sign-in flow
  - ~~Test signup flow and email verification~~
  - ~~Test logout functionality~~

### Documentation & DevOps
- [x] Update project documentation
  - Document Firebase Auth and FirebaseUI setup in README
  - Add an authentication guide for developers including Google OAuth setup
  - Document FirebaseUI configuration and customization options
- [x] Update deployment configuration
  - Configure Firebase Auth environment variables
  - Update Firebase hosting configuration
  - Test authentication in the test environment

## Acceptance Criteria
- [x] Users can register with email and password using FirebaseUI
- [x] Users can log in with email and password using FirebaseUI
- [x] Users can sign in with Google using FirebaseUI
- [x] Users can log out from the application
- [x] User session persists across browser refreshes
- [x] Authentication works in both development and production environments
- [x] Email verification is sent upon registration
- [x] Password reset functionality is available
- [x] FirebaseUI provides consistent and accessible authentication UI
- ~~[ ] All authentication flows (email/password and Google) are tested with e2e tests~~

## Technical Requirements
- [x] Use [FirebaseUI-web](https://github.com/firebase/firebaseui-web) library for authentication UI
- [x] Support both email/password and Google OAuth providers
- [x] FirebaseUI widget handles sign-in and sign-up flows in a unified interface
- ~~[ ] Implement proper error handling for all authentication methods~~
- ~~[ ] Configure appropriate sign-in flow (redirect recommended for production)~~
