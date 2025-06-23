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
- [x] Refactor after implementing tests

### Development & Testing
- [x] Add E2E tests using Playwright
  - Test unauthorized request handling (✅ implemented)
  - Test authenticated API requests (✅ implemented)  
  - Test token expiration scenarios (moved to a separate story)

### Documentation & DevOps
- [x] Update project documentation
  - Document API authentication setup (✅ NestJS Firebase Integration Guide created)
  - Add authentication guide for API consumers (✅ Comprehensive usage examples added)
  - Update API documentation with auth endpoints (✅ README updated with auth endpoints)
  - Document Firebase Admin SDK configuration (✅ Configuration documented)

## Acceptance Criteria
- [x] API endpoints are protected with Firebase Auth token verification (✅ AuthGuard implemented and tested)
- [x] Authenticated users can access protected resources (✅ /api/auth endpoint working with token verification)
- [x] Unauthenticated requests to protected endpoints return proper error responses (✅ E2E tests verify 401 responses)
- [x] User context is available in protected endpoint handlers (✅ AuthenticatedRequest interface provides user context)
- [x] Token verification works with both email/password and Google sign-in tokens (✅ Firebase ID tokens work for all providers)
- [x] API authentication works in both development and production environments (✅ Environment-specific configuration implemented)
- [x] All authentication middleware and guards are tested (✅ Comprehensive E2E tests passing)
- [x] API documentation includes authentication requirements (✅ Swagger UI includes Bearer auth, documentation updated)

## Technical Requirements
- [x] Use Firebase Admin SDK for server-side token verification (✅ Firebase Admin SDK integrated with verifyIdToken function)
- [x] Implement proper error handling for authentication failures (✅ UnauthorizedException thrown with proper error messages)
- [x] Support for extracting user information from validated tokens (✅ User context added to request objects)
- [x] Middleware should be reusable across different endpoints (✅ AuthGuard and AuthMiddleware exported and reusable)
- [x] Authentication should not impact API performance significantly (✅ Efficient token verification with Firebase SDK caching) 
