import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import {
  getUserByUid,
  initializeFirebaseAdmin,
} from '../config/firebase-admin.config';

/**
 * Current User Response DTO
 */
export interface CurrentUserResponse {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  providerData: {
    providerId: string;
  }[];
  customClaims?: Record<string, unknown>;
}

/**
 * Authentication Service
 *
 * This service provides user management operations using Firebase Admin SDK.
 * It handles operations like getting user information and managing user data.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly configService: ConfigService) {
    // Initialize Firebase Admin with configuration service
    initializeFirebaseAdmin(this.configService);
  }

  /**
   * Get current user information from Firebase Auth
   *
   * @param uid - The user's UID from the decoded token
   * @returns Promise<CurrentUserResponse> - The current user information
   * @throws NotFoundException if user is not found
   */
  async getCurrentUser(uid: string): Promise<CurrentUserResponse> {
    try {
      this.logger.debug(`Getting user information for UID: ${uid}`);

      const userRecord = await getUserByUid(uid);

      const currentUser: CurrentUserResponse = {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        providerData: userRecord.providerData.map(provider => ({
          providerId: provider.providerId,
        })),
        customClaims: userRecord.customClaims as
          | Record<string, any>
          | undefined,
      };

      this.logger.debug(
        `Successfully retrieved user information for UID: ${uid}`
      );
      return currentUser;
    } catch (error) {
      this.logger.error(
        `Failed to get user information for UID: ${uid}`,
        error
      );

      if (
        error instanceof Error &&
        // TODO WTF IS THIS?
        error.message.includes('There is no user record')
      ) {
        throw new NotFoundException(`User with UID ${uid} not found`);
      }

      throw error;
    }
  }

  /**
   * Get user information from decoded token
   *
   * @param decodedToken - The decoded Firebase ID token
   * @returns Basic user information from the token
   */
  getUserFromToken(decodedToken: admin.auth.DecodedIdToken): {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    emailVerified?: boolean;
  } {
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name as string | undefined,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified,
    };
  }
}
