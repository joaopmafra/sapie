import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('firebase-admin.config.ts');

/**
 * Firebase Admin SDK Configuration
 *
 * This module initializes and configures the Firebase Admin SDK for server-side
 * authentication and user management operations.
 */

// TODO improve this; should get the current environment from the configService
// Set Firebase emulator hosts early if running in emulator mode or local development
const isLocalDevelopment =
  process.env.CURRENT_ENV === 'local-dev' ||
  process.env.NODE_ENV === 'development';
const isFirebaseEmulator =
  process.env.FUNCTIONS_EMULATOR === 'true' || isLocalDevelopment;

if (isFirebaseEmulator) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  logger.debug('Firebase Auth emulator host set to: localhost:9099');
  logger.debug('Firestore emulator host set to: localhost:8080');
}

let app: admin.app.App;

/**
 * Initialize Firebase Admin SDK
 *
 * Handles initialization for different environments:
 * - Production: Uses default service account credentials
 * - Development/Emulator/Local: Uses emulator or service account key file
 */
export function initializeFirebaseAdmin(
  configService?: ConfigService
): admin.app.App {
  if (app) {
    return app;
  }

  logger.debug('CURRENT_ENV: ' + configService?.get('CURRENT_ENV'));

  try {
    const isProduction = configService?.get('NODE_ENV') === 'production';

    if (isProduction) {
      // In production (Firebase Functions), use default credentials
      app = admin.initializeApp();
      logger.debug('Firebase Admin initialized with default credentials');
    } else if (isFirebaseEmulator) {
      const projectId = process.env.GCLOUD_PROJECT;
      app = admin.initializeApp({
        projectId: projectId,
      });
      logger.debug(
        `Firebase Admin initialized for emulator/local development with project ID: ${projectId}`
      );
    } else {
      // TODO this seems not to be necessary; verify and remove
      // For other development scenarios, try service account key file
      const serviceAccountPath = configService?.get(
        'FIREBASE_SERVICE_ACCOUNT_KEY_PATH'
      ) as string;

      if (serviceAccountPath) {
        // Use service account key file if provided
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(
          serviceAccountPath
        ) as admin.ServiceAccount;
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        logger.debug(
          'Firebase Admin initialized with service account key file'
        );
      } else {
        // Fallback to default credentials or application default credentials
        app = admin.initializeApp();
        logger.debug(
          'Firebase Admin initialized with default credentials for development'
        );
      }
    }

    return app;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error(
      `Firebase Admin initialization failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get Firebase Admin app instance
 * Initializes if not already done
 */
export function getFirebaseAdmin(): admin.app.App {
  if (!app) {
    return initializeFirebaseAdmin();
  }
  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}

/**
 * Get Firebase Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}

/**
 * Verify Firebase ID token
 *
 * @param idToken - The Firebase ID token to verify
 * @returns Promise<admin.auth.DecodedIdToken> - The decoded token
 */
export async function verifyIdToken(
  idToken: string
): Promise<admin.auth.DecodedIdToken> {
  try {
    const decodedToken = await getFirebaseAuth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw new Error(
      `Token verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get user by UID
 *
 * @param uid - The user's UID
 * @returns Promise<admin.auth.UserRecord> - The user record
 */
export async function getUserByUid(
  uid: string
): Promise<admin.auth.UserRecord> {
  try {
    const userRecord = await getFirebaseAuth().getUser(uid);
    return userRecord;
  } catch (error) {
    logger.error('Failed to get user:', error);
    throw new Error(
      `Failed to get user: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
