import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  Auth,
  User,
  UserCredential
} from 'firebase/auth';

/**
 * Firebase Auth Testing Utilities
 *
 * These utilities work with the Firebase Auth emulator to create test users
 * and generate valid ID tokens for API testing.
 */

// Firebase config for testing with emulator
const testFirebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-test-e2e.firebaseapp.com',
  projectId: 'demo-test-e2e',
  storageBucket: 'demo-test-e2e.appspot.com',
  messagingSenderId: '234567890',
  appId: '2:123456789:web:abcdef123456',
};

let testAuth: Auth | null = null;

/**
 * Initialize Firebase Auth for testing
 * Connects to the Auth emulator
 */
export function initializeTestAuth(): Auth {
  if (testAuth) {
    return testAuth;
  }

  // Initialize Firebase app for testing if not already done
  const app = !getApps().length ? initializeApp(testFirebaseConfig, 'test') : getApps()[0];

  testAuth = getAuth(app);

  // Connect to Auth emulator
  if (!testAuth.emulatorConfig) {
    connectAuthEmulator(testAuth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
  }

  return testAuth;
}

/**
 * Create a test user with email and password
 * If user already exists, try to sign them in instead
 *
 * @param email - Test user email
 * @param password - Test user password
 * @returns Promise<User> - The created or signed-in user
 */
export async function createTestUser(email: string, password: string): Promise<User> {
  const auth = initializeTestAuth();

  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    // If user already exists, try to sign them in instead
    if (error?.code === 'auth/email-already-in-use') {
      console.log(`User ${email} already exists, signing in instead`);
      try {
        const existingUser = await signInTestUser(email, password);
        return existingUser;
      } catch (signInError) {
        console.error('Failed to sign in existing user:', signInError);
        throw signInError;
      }
    }
    console.error('Failed to create test user:', error);
    throw error;
  }
}

/**
 * Sign in a test user and return their credentials
 *
 * @param email - Test user email
 * @param password - Test user password
 * @returns Promise<User> - The signed-in user
 */
export async function signInTestUser(email: string, password: string): Promise<User> {
  const auth = initializeTestAuth();

  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Failed to sign in test user:', error);
    throw error;
  }
}

/**
 * Generate a Firebase ID token for a test user
 *
 * @param user - Firebase user object
 * @returns Promise<string> - The ID token
 */
export async function generateTestFirebaseToken(user: User): Promise<string> {
  try {
    const idToken = await user.getIdToken();
    return idToken;
  } catch (error) {
    console.error('Failed to generate Firebase ID token:', error);
    throw error;
  }
}

/**
 * Delete a test user (cleanup)
 *
 * @param user - Firebase user object to delete
 */
export async function deleteTestUser(user: User): Promise<void> {
  try {
    await deleteUser(user);
  } catch (error) {
    console.error('Failed to delete test user:', error);
    // Don't throw - this is cleanup, and user might already be deleted
  }
}

/**
 * Create a test user and get their ID token
 * Convenience function that combines user creation and token generation
 *
 * @param email - Test user email
 * @param password - Test user password
 * @returns Promise<{user: User, token: string}> - User and their ID token
 */
export async function createTestUserWithToken(email: string, password: string): Promise<{user: User, token: string}> {
  const user = await createTestUser(email, password);
  const token = await generateTestFirebaseToken(user);

  return { user, token };
}

/**
 * Sign in an existing test user and get their ID token
 *
 * @param email - Test user email
 * @param password - Test user password
 * @returns Promise<{user: User, token: string}> - User and their ID token
 */
export async function signInTestUserWithToken(email: string, password: string): Promise<{user: User, token: string}> {
  const user = await signInTestUser(email, password);
  const token = await generateTestFirebaseToken(user);

  return { user, token };
}

/**
 * Wait for Firebase Auth emulator to be ready
 * Tests the connection by attempting to create and delete a test user
 */
export async function waitForFirebaseAuthEmulator(timeoutMs: number = 10000): Promise<void> {
  const startTime = Date.now();
  const testEmail = `test.${Date.now()}@example.com`;
  const testPassword = 'test123456';

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Try to create and delete a test user to verify emulator is working
      const user = await createTestUser(testEmail, testPassword);
      await deleteTestUser(user);
      return; // Success!
    } catch (error) {
      // Continue waiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Firebase Auth emulator not ready after ${timeoutMs}ms`);
}

/**
 * Generate unique test user email with timestamp to avoid collisions
 */
function generateUniqueEmail(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}.${timestamp}.${random}@example.com`;
}

/**
 * Test user templates for consistent testing
 */
export const TEST_USERS = {
  VALID_USER_1: {
    get email() { return generateUniqueEmail('test1'); },
    password: 'password123',
  },
  VALID_USER_2: {
    get email() { return generateUniqueEmail('test2'); },
    password: 'password456',
  },
  ADMIN_USER: {
    get email() { return generateUniqueEmail('admin'); },
    password: 'admin123456',
  },
} as const;
