# API E2E Tests

This directory contains end-to-end tests for the Sapie API using Playwright's request testing capabilities.

## Test Structure

### Authentication Tests (`auth.spec.ts`)

Tests for API authentication endpoints including:

#### ✅ Implemented

- **Unauthorized request handling**: Tests that API endpoints properly reject requests without authentication tokens
- **Invalid token handling**: Tests that API endpoints properly reject requests with invalid or malformed tokens
- **Multiple endpoint coverage**: Tests both `/api/auth` and `/api/auth/users/me` endpoints
- **Authenticated API requests**: Tests with valid Firebase ID tokens from emulator
- **Firebase Auth emulator integration**: Full setup with test user creation and token generation
- **User context validation**: Tests that authenticated requests return proper user information

#### 🚧 TODO (future enhancement)

- **Token expiration scenarios**: Tests with expired Firebase ID tokens (complex to implement with Firebase Auth)

## Test Utilities

The tests use shared utilities from `../helpers/test-utils.ts`:

- `API_ENDPOINTS`: Centralized API endpoint URLs
- `TEST_AUTH_SCENARIOS`: Common test authentication scenarios
- `EXPECTED_AUTH_ERRORS`: Expected error responses for unauthorized requests
- `testUnauthorizedRequest()`: Helper function following DRY principles

## Running Tests

Run all API tests:

```bash
pnpm test -- tests/api/
```

Run specific test file:

```bash
pnpm test -- tests/api/auth.spec.ts
```

## Development Principles Applied

Following the [development principles](../../../../docs/development_principles.md):

- **KISS**: Simple, focused tests for specific API behaviors
- **DRY**: Shared utilities and helper functions to avoid code duplication
- **Single Responsibility**: Each test verifies one specific authentication scenario
- **YAGNI**: Only implemented what's needed now (unauthorized requests), with TODO comments for future requirements

## Architecture

These tests use Playwright's `request` API for direct HTTP testing without browser overhead, making them faster and more
focused than full browser-based E2E tests. They complement the existing browser-based authentication tests in
`../auth/login.spec.ts`. 
