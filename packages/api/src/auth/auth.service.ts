import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiProperty } from '@nestjs/swagger';
import * as admin from 'firebase-admin';
import {
  getUserByUid,
  initializeFirebaseAdmin,
} from '../config/firebase-admin.config';

/**
 * Provider Data DTO
 */
export class ProviderDataDto {
  @ApiProperty({
    description: 'Authentication provider identifier',
    example: 'google.com',
  })
  providerId: string;
}

/**
 * Authenticated User DTO
 */
export class AuthenticatedUser {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'abc123def456ghi789',
  })
  uid: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    required: false,
  })
  displayName?: string;

  @ApiProperty({
    description: 'User profile photo URL',
    example: 'https://example.com/photo.jpg',
    required: false,
  })
  photoURL?: string;

  @ApiProperty({
    description: 'Whether the user email is verified',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Authentication provider information',
    type: [ProviderDataDto],
  })
  providerData: ProviderDataDto[];

  @ApiProperty({
    description: 'Custom claims assigned to the user',
    example: { role: 'admin' },
    required: false,
  })
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
   * @returns Promise<AuthenticatedUser> - The authenticated user information
   * @throws NotFoundException if user is not found
   */
  async getCurrentUser(uid: string): Promise<AuthenticatedUser> {
    try {
      this.logger.debug(`Getting user information for UID: ${uid}`);

      const userRecord = await getUserByUid(uid);

      const authenticatedUser = new AuthenticatedUser();
      authenticatedUser.uid = userRecord.uid;
      authenticatedUser.email = userRecord.email;
      authenticatedUser.displayName = userRecord.displayName;
      authenticatedUser.photoURL = userRecord.photoURL;
      authenticatedUser.emailVerified = userRecord.emailVerified;
      authenticatedUser.providerData = userRecord.providerData.map(provider => {
        const providerData = new ProviderDataDto();
        providerData.providerId = provider.providerId;
        return providerData;
      });
      authenticatedUser.customClaims = userRecord.customClaims as
        | Record<string, any>
        | undefined;

      this.logger.debug(
        `Successfully retrieved user information for UID: ${uid}`
      );
      return authenticatedUser;
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
