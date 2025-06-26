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
 * Content API Endpoints for testing
 */
const CONTENT_API_ENDPOINTS = {
  ROOT: `${API_ENDPOINTS.HEALTH.replace('/api/health', '')}/api/content/root`,
} as const;

/**
 * Helper function to test unauthorized content API requests
 */
async function testUnauthorizedContentRequest(
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

test.describe('Content API - Authentication', () => {

  test('should reject requests to /api/content/root without authorization token', async () => {
    await testUnauthorizedContentRequest(CONTENT_API_ENDPOINTS.ROOT, undefined, EXPECTED_AUTH_ERRORS.NO_TOKEN);
  });

  test('should reject requests to /api/content/root with invalid authorization token', async () => {
    await testUnauthorizedContentRequest(
      CONTENT_API_ENDPOINTS.ROOT,
      TEST_AUTH_SCENARIOS.INVALID_TOKEN,
      EXPECTED_AUTH_ERRORS.INVALID_TOKEN
    );
  });

  test('should reject requests to /api/content/root with malformed authorization header', async () => {
    // Test various malformed authorization headers
    for (const authHeader of TEST_AUTH_SCENARIOS.MALFORMED_TOKENS) {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': authHeader
        }
      });

      const response = await apiContext.get(CONTENT_API_ENDPOINTS.ROOT);

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

  test('should allow authenticated requests to /api/content/root with valid Firebase ID token', async () => {
    // Create a test user and get their ID token
    const testUser = TEST_USERS.VALID_USER_1;
    const email = testUser.email;
    const { user, token } = await createTestUserWithToken(email, testUser.password);

    try {
      // Test authenticated request to /api/content/root endpoint
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });

      const response = await apiContext.get(CONTENT_API_ENDPOINTS.ROOT);

      expect(response.status()).toBe(200);

      const responseBody = await response.json();

      // Verify response structure matches Content interface
      expect(responseBody).toHaveProperty('id');
      expect(responseBody).toHaveProperty('name', 'My Contents');
      expect(responseBody).toHaveProperty('type', 'directory');
      expect(responseBody).toHaveProperty('parentId', null);
      expect(responseBody).toHaveProperty('ownerId', user.uid);
      expect(responseBody).toHaveProperty('createdAt');
      expect(responseBody).toHaveProperty('updatedAt');

      // Verify timestamp format
      expect(new Date(responseBody.createdAt).toISOString()).toBe(responseBody.createdAt);
      expect(new Date(responseBody.updatedAt).toISOString()).toBe(responseBody.updatedAt);

      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  test('should create root directory automatically for new users', async () => {
    // Create a test user and get their ID token
    const testUser = TEST_USERS.ADMIN_USER;
    const email = testUser.email;
    const { user, token } = await createTestUserWithToken(email, testUser.password);

    try {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });

      // First request should create the root directory
      const response1 = await apiContext.get(CONTENT_API_ENDPOINTS.ROOT);
      expect(response1.status()).toBe(200);

      const responseBody1 = await response1.json();
      expect(responseBody1.name).toBe('My Contents');
      expect(responseBody1.ownerId).toBe(user.uid);

      // Second request should return the same directory (idempotent)
      const response2 = await apiContext.get(CONTENT_API_ENDPOINTS.ROOT);
      expect(response2.status()).toBe(200);

      const responseBody2 = await response2.json();
      expect(responseBody2.id).toBe(responseBody1.id);
      expect(responseBody2.name).toBe(responseBody1.name);
      expect(responseBody2.ownerId).toBe(responseBody1.ownerId);

      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  test('should isolate user root directories (user cannot access other user directories)', async () => {
    // Create two test users
    const testUser1 = TEST_USERS.VALID_USER_1;
    const testUser2 = TEST_USERS.ADMIN_USER;

    const { user: user1, token: token1 } = await createTestUserWithToken(testUser1.email, testUser1.password);
    const { user: user2, token: token2 } = await createTestUserWithToken(testUser2.email, testUser2.password);

    try {
      // Create root directories for both users
      const apiContext1 = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token1}`
        }
      });

      const apiContext2 = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token2}`
        }
      });

      // Get root directory for user 1
      const response1 = await apiContext1.get(CONTENT_API_ENDPOINTS.ROOT);
      expect(response1.status()).toBe(200);
      const rootDir1 = await response1.json();

      // Get root directory for user 2
      const response2 = await apiContext2.get(CONTENT_API_ENDPOINTS.ROOT);
      expect(response2.status()).toBe(200);
      const rootDir2 = await response2.json();

      // Verify that users have different root directories
      expect(rootDir1.id).not.toBe(rootDir2.id);
      expect(rootDir1.ownerId).toBe(user1.uid);
      expect(rootDir2.ownerId).toBe(user2.uid);

      // Verify both have "My Contents" as name
      expect(rootDir1.name).toBe('My Contents');
      expect(rootDir2.name).toBe('My Contents');

      await apiContext1.dispose();
      await apiContext2.dispose();
    } finally {
      // Cleanup: delete test users
      await deleteTestUser(user1);
      await deleteTestUser(user2);
    }
  });
});

test.describe('Content API - Error Scenarios', () => {

  test('should handle malformed requests gracefully', async () => {
    // Test with valid token but malformed request
    const testUser = TEST_USERS.VALID_USER_1;
    const email = testUser.email;
    const { user, token } = await createTestUserWithToken(email, testUser.password);

    try {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Test GET request (should work)
      const response = await apiContext.get(CONTENT_API_ENDPOINTS.ROOT);
      expect(response.status()).toBe(200);

      // Test unsupported HTTP methods
      const postResponse = await apiContext.post(CONTENT_API_ENDPOINTS.ROOT, {
        data: { test: 'data' }
      });
      expect(postResponse.status()).toBe(404); // Method not found

      const putResponse = await apiContext.put(CONTENT_API_ENDPOINTS.ROOT, {
        data: { test: 'data' }
      });
      expect(putResponse.status()).toBe(404); // Method not found

      const deleteResponse = await apiContext.delete(CONTENT_API_ENDPOINTS.ROOT);
      expect(deleteResponse.status()).toBe(404); // Method not found

      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  test('should maintain consistent response format', async () => {
    // Test multiple requests to verify consistent response format
    const testUser = TEST_USERS.VALID_USER_1;
    const email = testUser.email;
    const { user, token } = await createTestUserWithToken(email, testUser.password);

    try {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Make multiple requests
      const responses = await Promise.all([
        apiContext.get(CONTENT_API_ENDPOINTS.ROOT),
        apiContext.get(CONTENT_API_ENDPOINTS.ROOT),
        apiContext.get(CONTENT_API_ENDPOINTS.ROOT)
      ]);

      // All should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      // Parse response bodies
      const responseBodies = await Promise.all(
        responses.map(response => response.json())
      );

      // All should have the same structure and data
      const firstResponse = responseBodies[0];
      responseBodies.forEach(body => {
        expect(body.id).toBe(firstResponse.id);
        expect(body.name).toBe(firstResponse.name);
        expect(body.type).toBe(firstResponse.type);
        expect(body.ownerId).toBe(firstResponse.ownerId);
        expect(body.parentId).toBe(firstResponse.parentId);
      });

      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  // TODO disabled for now
  /*test('should handle concurrent requests from same user', async () => {
    // Test that concurrent requests don't create multiple root directories
    const testUser = TEST_USERS.ADMIN_USER;
    const email = testUser.email;
    const { user, token } = await createTestUserWithToken(email, testUser.password);

    try {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Make concurrent requests (simulate race condition)
      const concurrentRequests = Array(5).fill(null).map(() =>
        apiContext.get(CONTENT_API_ENDPOINTS.ROOT)
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      // Parse response bodies
      const responseBodies = await Promise.all(
        responses.map(response => response.json())
      );

      // All should return the same root directory (no duplicates)
      const firstDirectoryId = responseBodies[0].id;
      responseBodies.forEach(body => {
        expect(body.id).toBe(firstDirectoryId);
        expect(body.name).toBe('My Contents');
        expect(body.ownerId).toBe(user.uid);
      });

      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });*/
});

test.describe('Content API - Performance and Reliability', () => {

  test('should respond within reasonable time limits', async () => {
    const testUser = TEST_USERS.VALID_USER_1;
    const email = testUser.email;
    const { user, token } = await createTestUserWithToken(email, testUser.password);

    try {
      const apiContext = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });

      const startTime = Date.now();
      const response = await apiContext.get(CONTENT_API_ENDPOINTS.ROOT);
      const endTime = Date.now();

      expect(response.status()).toBe(200);

      // API should respond within 2 seconds (as specified in story requirements)
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000);

      await apiContext.dispose();
    } finally {
      // Cleanup: delete test user
      await deleteTestUser(user);
    }
  });

  test('should handle multiple users simultaneously', async () => {
    // Test that the API can handle multiple users at the same time
    const testUser1 = TEST_USERS.VALID_USER_1;
    const testUser2 = TEST_USERS.ADMIN_USER;

    const userPromises = [
      createTestUserWithToken(testUser1.email, testUser1.password),
      createTestUserWithToken(testUser2.email, testUser2.password)
    ];

    const [{ user: user1, token: token1 }, { user: user2, token: token2 }] = await Promise.all(userPromises);

    try {
      const apiContext1 = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token1}`
        }
      });

      const apiContext2 = await request.newContext({
        extraHTTPHeaders: {
          'Authorization': `Bearer ${token2}`
        }
      });

      // Make simultaneous requests from both users
      const [response1, response2] = await Promise.all([
        apiContext1.get(CONTENT_API_ENDPOINTS.ROOT),
        apiContext2.get(CONTENT_API_ENDPOINTS.ROOT)
      ]);

      // Both should succeed
      expect(response1.status()).toBe(200);
      expect(response2.status()).toBe(200);

      const [body1, body2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);

      // Verify proper user isolation
      expect(body1.ownerId).toBe(user1.uid);
      expect(body2.ownerId).toBe(user2.uid);
      expect(body1.id).not.toBe(body2.id);

      await apiContext1.dispose();
      await apiContext2.dispose();
    } finally {
      // Cleanup: delete test users
      await Promise.all([
        deleteTestUser(user1),
        deleteTestUser(user2)
      ]);
    }
  });
});
