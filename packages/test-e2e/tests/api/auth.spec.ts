import { test, expect, request } from '@playwright/test';
import { 
  API_ENDPOINTS, 
  TEST_AUTH_SCENARIOS, 
  EXPECTED_AUTH_ERRORS 
} from '../helpers/test-utils';
import { 
  createTestUserWithToken, 
  deleteTestUser, 
  TEST_USERS 
} from '../helpers/firebase-auth-utils';

/**
 * Helper function to test unauthorized API requests
 * Follows DRY principle by centralizing common test logic
 */
async function testUnauthorizedRequest(
  endpoint: string, 
  authHeader?: string,
  expectedError: typeof EXPECTED_AUTH_ERRORS.NO_TOKEN | typeof EXPECTED_AUTH_ERRORS.INVALID_TOKEN = EXPECTED_AUTH_ERRORS.NO_TOKEN
) {
  const apiContext = await request.newContext(
    authHeader ? {
      extraHTTPHeaders: {
        'Authorization': authHeader
      }
    } : {}
  );
  
  const response = await apiContext.get(endpoint);
  
  expect(response.status()).toBe(401);
  
  const responseBody = await response.json();
  expect(responseBody).toHaveProperty('statusCode', expectedError.statusCode);
  expect(responseBody).toHaveProperty('message', expectedError.message);
  expect(responseBody).toHaveProperty('error', expectedError.error);
  
  await apiContext.dispose();
}

test.describe('API Authentication', () => {

  test('should be able to create Firebase Auth test user', async () => {
    // Verify Firebase Auth emulator is working
    const testUser = TEST_USERS.VALID_USER_1;
    
    const { user, token } = await createTestUserWithToken(testUser.email, testUser.password);
    
    try {
      // Basic assertions
      expect(user).toBeDefined();
      expect(user.uid).toBeDefined();
      expect(user.email).toBe(testUser.email);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    } finally {
      // Cleanup
      await deleteTestUser(user);
    }
  });
  
  test('should reject requests without authorization token', async () => {
    await testUnauthorizedRequest(API_ENDPOINTS.AUTH, undefined, EXPECTED_AUTH_ERRORS.NO_TOKEN);
  });

  test('should reject requests with invalid authorization token', async () => {
    await testUnauthorizedRequest(
      API_ENDPOINTS.AUTH, 
      TEST_AUTH_SCENARIOS.INVALID_TOKEN, 
      EXPECTED_AUTH_ERRORS.INVALID_TOKEN
    );
  });

  test('should reject requests with malformed authorization header', async () => {
    // Test various malformed authorization headers
    for (const authHeader of TEST_AUTH_SCENARIOS.MALFORMED_TOKENS) {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': authHeader
        }
      });
      
      const response = await apiContext.get(API_ENDPOINTS.AUTH);
      
      expect(response.status()).toBe(401);
      
      const responseBody = await response.json();
      expect(responseBody.statusCode).toBe(401);
      expect([
        EXPECTED_AUTH_ERRORS.NO_TOKEN.message, 
        EXPECTED_AUTH_ERRORS.INVALID_TOKEN.message
      ]).toContain(responseBody.message);
      
      await apiContext.dispose();
    }
  });

  test('should also reject unauthorized requests to /users/me endpoint', async () => {
    await testUnauthorizedRequest(API_ENDPOINTS.USERS_ME, undefined, EXPECTED_AUTH_ERRORS.NO_TOKEN);
  });

  test('should allow authenticated requests with valid Firebase ID token', async () => {
    // Create a test user and get their ID token
    const testUser = TEST_USERS.VALID_USER_1;
    const { user, token } = await createTestUserWithToken(testUser.email, testUser.password);
    
    try {
      // Test authenticated request to /api/auth endpoint
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const response = await apiContext.get(API_ENDPOINTS.AUTH);
      
      expect(response.status()).toBe(200);
      
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('uid', user.uid);
      expect(responseBody).toHaveProperty('email', user.email);
      expect(responseBody).toHaveProperty('emailVerified');
      expect(responseBody).toHaveProperty('providerData');
      
      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  test('should allow authenticated requests to /users/me endpoint', async () => {  
    // Create a test user and get their ID token
    const testUser = TEST_USERS.VALID_USER_2;
    const { user, token } = await createTestUserWithToken(testUser.email, testUser.password);
    
    try {
      // Test authenticated request to /users/me endpoint
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const response = await apiContext.get(API_ENDPOINTS.USERS_ME);
      
      expect(response.status()).toBe(200);
      
      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('uid', user.uid);
      expect(responseBody).toHaveProperty('email', user.email);
      expect(responseBody).toHaveProperty('emailVerified');
      expect(responseBody).toHaveProperty('providerData');
      
      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  test('should maintain user context across multiple authenticated requests', async () => {
    // Create a test user and get their ID token
    const testUser = TEST_USERS.ADMIN_USER;
    const { user, token } = await createTestUserWithToken(testUser.email, testUser.password);
    
    try {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Make multiple requests with the same token
      const response1 = await apiContext.get(API_ENDPOINTS.AUTH);
      const response2 = await apiContext.get(API_ENDPOINTS.USERS_ME);
      
      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);
      
      const responseBody1 = await response1.json();
      const responseBody2 = await response2.json();
      
      // Both responses should have the same user information
      expect(responseBody1.uid).toBe(responseBody2.uid);
      expect(responseBody1.email).toBe(responseBody2.email);
      expect(responseBody1.uid).toBe(user.uid);
      
      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  // TODO: Add test for token expiration
  // This would require generating expired tokens, which is complex with Firebase Auth
  // For now, we'll document this as a future enhancement
  test.skip('should reject expired Firebase ID tokens', async () => {
    // This test would require:
    // 1. Generating an expired Firebase ID token (complex with Firebase Auth)
    // 2. Testing that expired tokens are properly rejected
    // 
    // Firebase ID tokens typically have a 1-hour lifespan and are automatically
    // refreshed by the Firebase SDK. Testing expiration would require:
    // - Mocking time or waiting for expiration
    // - Or using Firebase Admin SDK to create custom tokens with short expiration
    // 
    // This is left as a future enhancement when more sophisticated token testing is needed.
  });
}); 