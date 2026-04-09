import { expect, Page } from '@playwright/test';

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

/**
 * API Testing Utilities
 */
export const API_BASE_URL = 'http://127.0.0.1:5001/demo-test-e2e/us-central1/api';

/**
 * Common API endpoints for testing
 */
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  HEALTH: `${API_BASE_URL}/api/health`,
} as const;

/**
 * Common test tokens and headers for API authentication testing
 */
export const TEST_AUTH_SCENARIOS = {
  NO_TOKEN: undefined,
  INVALID_TOKEN: 'Bearer invalid-token-here',
  MALFORMED_TOKENS: [
    'InvalidToken',           // No Bearer prefix
    'Bearer',                 // No token
    'Basic dGVzdDp0ZXN0',    // Wrong auth type
    'Bearer token1 token2',   // Multiple tokens
    '',                       // Empty string
  ],
} as const;

/**
 * Expected error responses for unauthorized API requests
 */
export const EXPECTED_AUTH_ERRORS = {
  NO_TOKEN: {
    statusCode: 401,
    message: 'Authorization token is required',
    error: 'Unauthorized',
  },
  INVALID_TOKEN: {
    statusCode: 401,
    message: 'Invalid or expired token',
    error: 'Unauthorized',
  },
} as const;

type ExpectedAuthError =
  (typeof EXPECTED_AUTH_ERRORS)[keyof typeof EXPECTED_AUTH_ERRORS];

/**
 * Normalize Nest problem-details (RFC 7807: `status` / `detail` / `title`) or legacy `{ statusCode, message, error }`.
 */
export function getApiErrorFields(body: Record<string, unknown>): {
  status: number;
  message: string;
  title: string;
} {
  const status =
    typeof body.status === 'number'
      ? body.status
      : typeof body.statusCode === 'number'
        ? body.statusCode
        : NaN;
  const message =
    typeof body.detail === 'string'
      ? body.detail
      : typeof body.message === 'string'
        ? body.message
        : '';
  const title =
    typeof body.title === 'string'
      ? body.title
      : typeof body.error === 'string'
        ? body.error
        : '';
  return { status, message, title };
}

export function expectUnauthorizedJsonBody(
  body: Record<string, unknown>,
  expected: ExpectedAuthError,
) {
  const { status, message, title } = getApiErrorFields(body);
  expect(status).toBe(expected.statusCode);
  expect(message).toBe(expected.message);
  expect(title).toBe(expected.error);
}

/**
 * Wait for Firebase Auth emulator to be ready
 * This can be used in tests that need to interact with Firebase Auth
 */
export async function waitForFirebaseAuth(timeoutMs: number = 10000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Try to check if Firebase Auth emulator is responding
      // This is a simple check - in a real scenario, you might want to make a test request
      await new Promise(resolve => setTimeout(resolve, 100));
      return;
    } catch (error) {
      // Continue waiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error(`Firebase Auth emulator not ready after ${timeoutMs}ms`);
}

/**
 * TODO: Firebase Auth Test Helpers
 * These would be implemented when adding full Firebase Auth integration tests
 */

// export async function createTestUser(email: string, password: string): Promise<string> {
//   // Create a test user in Firebase Auth emulator
//   // Return the user's UID
// }

// export async function generateTestFirebaseToken(uid: string): Promise<string> {
//   // Generate a valid Firebase ID token for testing
//   // This would use Firebase Admin SDK with emulator configuration
// }

// export async function signInTestUser(email: string, password: string): Promise<string> {
//   // Sign in a test user and return their ID token
// }

// export async function deleteTestUser(uid: string): Promise<void> {
//   // Clean up test user after tests
// }
