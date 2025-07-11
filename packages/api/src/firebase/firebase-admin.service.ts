import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: admin.app.App;

  constructor() {}

  onModuleInit() {
    this.initializeFirebaseAdmin();
  }

  /**
   * Initialize Firebase Admin SDK
   *
   * Handles initialization for different environments:
   * - Production: Uses default service account credentials
   * - Development/Emulator/Local: Uses emulator or service account key file
   */
  private initializeFirebaseAdmin(): void {
    const useFirebaseEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';

    // set firebase emulator hosts
    if (useFirebaseEmulator) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    }

    try {
      const projectId = process.env.GCLOUD_PROJECT;
      this.app = admin.initializeApp({
        // this is not needed, but we're keeping it here to make it explicit
        projectId: projectId,
      });
      this.logger.debug(`Firebase Admin initialized with project ID: ${projectId}`);

      // TODO this seems not to be necessary; verify and remove
      // For other development scenarios, try service account key file
      /*const serviceAccountPath = this.configService.get(
        'FIREBASE_SERVICE_ACCOUNT_KEY_PATH'
      ) as string;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(
        serviceAccountPath
      ) as admin.ServiceAccount;
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.debug(
        'Firebase Admin initialized with service account key file'
      );*/
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      throw new Error(
        `Firebase Admin initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get Firebase Admin app instance
   */
  getFirebaseAdmin(): admin.app.App {
    if (!this.app) {
      throw new Error('Firebase Admin not initialized');
    }
    return this.app;
  }

  /**
   * Get Firebase Auth instance
   */
  getFirebaseAuth(): admin.auth.Auth {
    return this.getFirebaseAdmin().auth();
  }

  /**
   * Get Firebase Firestore instance
   */
  getFirestore(): admin.firestore.Firestore {
    return this.getFirebaseAdmin().firestore();
  }

  /**
   * Verify Firebase ID token
   *
   * @param idToken - The Firebase ID token to verify
   * @returns Promise<admin.auth.DecodedIdToken> - The decoded token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await this.getFirebaseAuth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      this.logger.error('Token verification failed:', error);
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
  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await this.getFirebaseAuth().getUser(uid);
      return userRecord;
    } catch (error) {
      this.logger.error('Failed to get user:', error);
      throw new Error(
        `Failed to get user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
