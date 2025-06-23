# Add API authentication and authorization

## Description
As a developer, I want to secure API endpoints with Firebase Auth tokens to ensure only authenticated users can access protected resources.

## Dependencies
- Story #6: Add core login/logout functionality (must be completed first)

## Tasks

### Backend (NestJS API)
- [x] Install and configure Firebase Admin SDK
  - Add `firebase-admin` dependency to `packages/api/package.json`
  - Create Firebase Admin configuration (`src/config/firebase-admin.config.ts`)
  - Initialize Firebase Admin in the application
  - Set up service account credentials for Firebase Admin
- [x] Create authentication middleware and guards
  - Create `src/auth/auth.guard.ts` for token verification
  - Create `src/auth/auth.middleware.ts` for request processing
  - Create `src/auth/auth.decorator.ts` for route protection
  - Implement JWT token validation logic
- [x] Create authentication module
  - Create `src/auth/auth.module.ts`
  - Create `src/auth/auth.service.ts` for user management
  - Create `src/auth/auth.controller.ts` for auth endpoints
  - Export authentication utilities
- [x] Implement an endpoint to get current user information
  - Add `/users/me` endpoint to get user
  - Add authentication guards to protected the endpoint
  - Add user context to request objects
  - Implement proper error handling for unauthorized requests
  - Add a call to the home page to the endpoint to test it
- [ ] Refactor after implementing tests

### Development & Testing
- [x] Add E2E tests using Playwright
  - Test unauthorized request handling (✅ implemented)
  - Test authenticated API requests (✅ implemented)  
  - Test token expiration scenarios (moved to a separate story)
- [ ] Update development environment
  - Configure Firebase Admin SDK for local development
  - Add environment variables for Firebase Admin configuration
  - Update API documentation with authentication requirements

### Documentation & DevOps
- [ ] Update project documentation
  - Document API authentication setup
  - Add authentication guide for API consumers
  - Update API documentation with auth endpoints
  - Document Firebase Admin SDK configuration
- [ ] Update deployment configuration
  - Configure Firebase Admin environment variables
  - Set up service account credentials for production
  - Test API authentication in production environment

## Acceptance Criteria
- [ ] API endpoints are protected with Firebase Auth token verification
- [ ] Authenticated users can access protected resources
- [ ] Unauthenticated requests to protected endpoints return proper error responses
- [ ] User context is available in protected endpoint handlers
- [ ] Token verification works with both email/password and Google sign-in tokens
- [ ] API authentication works in both development and production environments
- [ ] All authentication middleware and guards are tested
- [ ] API documentation includes authentication requirements

## Technical Requirements
- [ ] Use Firebase Admin SDK for server-side token verification
- [ ] Implement proper error handling for authentication failures
- [ ] Support for extracting user information from validated tokens
- [ ] Middleware should be reusable across different endpoints
- [ ] Authentication should not impact API performance significantly 
