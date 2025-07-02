# NestJS Firebase Integration Guide

**TODO:** merge this document to the existing [FIREBASE_ADMIN_SETUP.md](../../packages/api/FIREBASE_ADMIN_SETUP.md).

This document provides comprehensive information about Firebase integration in the Sapie API, including authentication,
user management, and development setup.

## Table of Contents

- [Firebase Admin SDK Configuration](#firebase-admin-sdk-configuration)
- [Authentication System](#authentication-system)
- [API Authentication Usage](#api-authentication-usage)
- [Environment Setup](#environment-setup)
- [Testing](#testing)
- [Common Issues](#common-issues)

## Firebase Admin SDK Configuration

The Firebase Admin SDK is implemented as a NestJS module for proper dependency injection and follows modern NestJS architecture patterns.

### Architecture Overview

**Module Structure**: `packages/api/src/firebase/`

- **`FirebaseAdminModule`**: Global NestJS module that provides Firebase services
- **`FirebaseAdminService`**: Injectable service managing Firebase Admin SDK operations
- **Dependency Injection**: All components use DI to access Firebase functionality

### Environment Support

#### Production (Firebase Functions)

- Uses default service account credentials automatically
- No additional configuration needed
- Automatic initialization via NestJS lifecycle

#### Development with Firebase Emulator

- Uses project ID configuration
- Automatically connects to Firebase Auth emulator at `localhost:9099`
- Firestore emulator at `localhost:8080`

#### Local Development

- Can use service account key file or Application Default Credentials
- Set `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` environment variable if using service account key

### Service Usage

**Service Methods**:

- `getFirebaseAdmin()` - Gets Firebase Admin app instance
- `getFirebaseAuth()` - Gets Firebase Auth instance
- `getFirestore()` - Gets Firestore instance
- `verifyIdToken(token)` - Verifies Firebase ID tokens
- `getUserByUid(uid)` - Retrieves user information by UID

**Example Usage**:

```typescript
import { Injectable } from '@nestjs/common';
import { FirebaseAdminService } from '../firebase';

@Injectable()
export class ExampleService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async authenticateUser(token: string) {
    return await this.firebaseAdminService.verifyIdToken(token);
  }
}
```

## Authentication System

### Overview

The authentication system uses Firebase ID tokens for secure API access. The system includes:

1. **AuthGuard** - Protects endpoints requiring authentication
2. **AuthMiddleware** - Adds optional user context to requests
3. **AuthService** - Handles user management operations
4. **AuthController** - Provides authentication endpoints

### Components

#### AuthGuard (`src/auth/auth.guard.ts`)

- Enforces authentication on protected endpoints
- Injects `FirebaseAdminService` for token verification
- Adds user context to request object
- Throws `UnauthorizedException` for invalid/missing tokens

#### AuthMiddleware (`src/auth/auth.middleware.ts`)

- Optional authentication processing
- Uses `FirebaseAdminService` for token verification
- Adds user context when valid token is present
- Does not throw errors for missing tokens
- Useful for endpoints that work with or without authentication

#### AuthService (`src/auth/auth.service.ts`)

- Injects `FirebaseAdminService` for user operations
- Retrieves user information from Firebase Auth
- Converts Firebase User Records to API DTOs
- Handles user not found scenarios

#### AuthController (`src/auth/auth.controller.ts`)

- Provides `/api/auth` endpoint for getting current user info
- Protected with `@Auth()` decorator
- Returns detailed user information

### Authentication Decorators

#### `@Auth()` Decorator

```typescript
import {Auth} from '../auth/auth.decorator';

@Get('/protected')
@Auth()
async
getProtectedResource(@Request()
req: AuthenticatedRequest
)
{
    // User information available in req.user
    return {message: `Hello ${req.user.email}!`};
}
```

#### `@OptionalAuth()` Decorator

```typescript
import {OptionalAuth} from '../auth/auth.decorator';

@Get('/optional')
@OptionalAuth()
async
getOptionalResource(@Request()
req: AuthenticatedRequest
)
{
    if (req.user) {
        return {message: `Hello ${req.user.email}!`};
    }
    return {message: 'Hello anonymous user!'};
}
```

## API Authentication Usage

### For API Consumers

#### Authentication Flow

1. User signs in through Firebase Auth (web app)
2. Client obtains Firebase ID token
3. Client includes token in `Authorization` header
4. API verifies token and processes request

#### Request Format

```http
GET /api/auth
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

#### Response Format

```json
{
  "uid": "user-unique-id",
  "email": "user@example.com",
  "displayName": "User Name",
  "photoURL": "https://example.com/photo.jpg",
  "emailVerified": true,
  "providerData": [
    {
      "providerId": "google.com"
    }
  ],
  "customClaims": {}
}
```

#### Error Responses

**401 Unauthorized - No Token**

```json
{
  "statusCode": 401,
  "message": "Authorization token is required",
  "error": "Unauthorized"
}
```

**401 Unauthorized - Invalid Token**

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

### For Frontend Applications

#### Using Generated API Client

```typescript
import {createAuthenticatedApiConfiguration} from '../lib/auth-utils';
import {AuthenticationApi} from '../lib/api-client';

// Get current user from Firebase Auth
const currentUser = auth.currentUser;

// Create authenticated API configuration
const config = await createAuthenticatedApiConfiguration(
    API_BASE_URL,
    currentUser
);

// Use with generated API client
const authApi = new AuthenticationApi(config);
const userInfo = await authApi.authControllerGetCurrentUser();
```

## Environment Setup

### Development Environment Variables

```bash
# Optional: Path to Firebase service account key file
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json

# Set by Firebase emulator automatically
FUNCTIONS_EMULATOR=true
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### Firebase Project Configuration

See `packages/api/FIREBASE_ADMIN_SETUP.md` for detailed setup instructions.

## Testing

### E2E Tests

Authentication is tested with Playwright E2E tests:

- **Location**: `packages/test-e2e/tests/api/auth.spec.ts`
- **Tests**:
    - Token validation
    - Unauthorized request handling
    - Authenticated request processing
    - User context persistence

### Test Utilities

**Firebase Auth Utils**: `packages/test-e2e/tests/helpers/firebase-auth-utils.ts`

- Creates test users in Firebase Auth emulator
- Generates valid ID tokens for testing
- Cleans up test users after tests

### Running Tests

```bash
# Run all tests
./scripts/build-test-all.sh

# Run API tests only
cd packages/api && pnpm test

# Run E2E tests only
cd packages/test-e2e && pnpm test
```

## Common Issues

### Token Verification Failures

**Symptom**: "Invalid or expired token" errors
**Solutions**:

1. Check token format (must be `Bearer <token>`)
2. Verify Firebase project configuration
3. Ensure Firebase Auth emulator is running (development)
4. Check token expiration (Firebase ID tokens expire after 1 hour)

### Firebase Admin Initialization Issues

**Symptom**: Firebase Admin SDK initialization errors
**Solutions**:

1. Ensure `FirebaseAdminModule` is imported in `AppModule`
2. Verify service account key path and permissions
3. Check Firebase project ID configuration
4. Ensure environment variables are set correctly
5. Verify Firebase emulator is running (development)
6. Check that dependency injection is working correctly

### Performance Considerations

The authentication system is designed for optimal performance:

- **Token Caching**: Firebase Admin SDK caches public keys for token verification
- **Minimal Overhead**: Guards and middleware add minimal processing time
- **Efficient Logging**: Structured logging with appropriate log levels
- **Error Handling**: Fast-fail approach for invalid tokens

### Security Best Practices

1. **Never log tokens**: Tokens are never logged for security
2. **Proper error messages**: Generic error messages prevent information leakage
3. **Token validation**: All tokens are cryptographically verified
4. **Secure headers**: Proper CORS and security headers are configured

## API Documentation

### Swagger Integration

The API includes comprehensive Swagger documentation:

- **URL**: `http://localhost:3000/api/docs` (development only)
- **Authentication**: Includes Bearer token authentication scheme
- **Interactive**: Test authenticated endpoints directly from Swagger UI

### Authentication in Swagger

1. Click "Authorize" in Swagger UI
2. Enter Firebase ID token in the Bearer token field
3. Test protected endpoints interactively

For more information, see the [Contributing Guidelines](../contributing_guidelines.md)
and [Development Principles](../development_principles.md).

## Useful links

https://www.linkedin.com/pulse/comprehensive-guide-integrating-firebase-nest-js-syed-bilal-ali-rhk7f/

https://www.npmjs.com/package/nestfire

https://dev.to/stonedcatt/nestjs-firebase-gcloud-how-to-quickly-set-up-an-api-backend-in-typescript-9no

https://www.google.com/search?q=nestjs+firebase+functions&sca_esv=b5163d8851d952ee&source=lnt&tbs=qdr:y&sa=X&ved=2ahUKEwjHtIHix_CNAxWUl5UCHRN8M70QpwV6BAgFEBA&biw=1745&bih=872&dpr=1.1

