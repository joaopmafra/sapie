import { Controller, Get, Request, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthService, CurrentUserResponse } from './auth.service';
import { Auth } from './auth.decorator';
import { AuthenticatedRequest } from './auth.guard';

// TODO: refactor
//  - improve endpoint path (should be /api/users/me)
//  - remove unnecessary user/token data from response
//  - check if @ApiResponse content can be shortened (eg. inferred from ts class/interface definitions)

/**
 * Authentication Controller
 *
 * This controller provides authentication-related endpoints including
 * user information retrieval and authentication management.
 */
@ApiTags('authentication')
@Controller('/api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Get current user information
   *
   * This endpoint returns the current authenticated user's information
   * from Firebase Auth. It requires a valid Firebase ID token.
   *
   * @param request - HTTP request with authenticated user context
   * @returns Promise<CurrentUserResponse> - Current user information
   */
  @Get()
  @Auth()
  @ApiOperation({
    summary: 'Get current user information',
    description:
      'Returns detailed information about the currently authenticated user from Firebase Auth',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        uid: {
          type: 'string',
          description: 'Unique user identifier',
          example: 'abc123def456ghi789',
        },
        email: {
          type: 'string',
          description: 'User email address',
          example: 'user@example.com',
        },
        displayName: {
          type: 'string',
          description: 'User display name',
          example: 'John Doe',
        },
        photoURL: {
          type: 'string',
          description: 'User profile photo URL',
          example: 'https://example.com/photo.jpg',
        },
        emailVerified: {
          type: 'boolean',
          description: 'Whether the user email is verified',
          example: true,
        },
        providerData: {
          type: 'array',
          description: 'Authentication provider information',
          items: {
            type: 'object',
            properties: {
              providerId: { type: 'string', example: 'google.com' },
              uid: { type: 'string', example: '123456789' },
              displayName: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'user@example.com' },
              photoURL: {
                type: 'string',
                example: 'https://example.com/photo.jpg',
              },
            },
          },
        },
        customClaims: {
          type: 'object',
          description: 'Custom claims assigned to the user',
          example: { role: 'admin' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
  })
  @ApiNotFoundResponse({
    description: 'User not found in Firebase Auth',
  })
  async getCurrentUser(
    @Request() request: AuthenticatedRequest
  ): Promise<CurrentUserResponse> {
    try {
      const uid = request.user.uid;

      this.logger.debug(`Getting current user information for UID: ${uid}`);
      const currentUser = await this.authService.getCurrentUser(uid);

      this.logger.debug(
        `Successfully retrieved current user information for UID: ${uid}`
      );
      return currentUser;
    } catch (error) {
      this.logger.error('Failed to get current user information', error);
      throw error;
    }
  }

  /**
   * Get current user information at /users/me endpoint
   *
   * This endpoint returns the current authenticated user's information
   * from Firebase Auth. It requires a valid Firebase ID token.
   *
   * @param request - HTTP request with authenticated user context
   * @returns Promise<CurrentUserResponse> - Current user information
   */
  @Get('/users/me')
  @Auth()
  @ApiOperation({
    summary: 'Get current user information (/users/me)',
    description:
      'Returns detailed information about the currently authenticated user from Firebase Auth at the /users/me endpoint',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        uid: {
          type: 'string',
          description: 'Unique user identifier',
          example: 'abc123def456ghi789',
        },
        email: {
          type: 'string',
          description: 'User email address',
          example: 'user@example.com',
        },
        displayName: {
          type: 'string',
          description: 'User display name',
          example: 'John Doe',
        },
        photoURL: {
          type: 'string',
          description: 'User profile photo URL',
          example: 'https://example.com/photo.jpg',
        },
        emailVerified: {
          type: 'boolean',
          description: 'Whether the user email is verified',
          example: true,
        },
        providerData: {
          type: 'array',
          description: 'Authentication provider information',
          items: {
            type: 'object',
            properties: {
              providerId: { type: 'string', example: 'google.com' },
              uid: { type: 'string', example: '123456789' },
              displayName: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'user@example.com' },
              photoURL: {
                type: 'string',
                example: 'https://example.com/photo.jpg',
              },
            },
          },
        },
        customClaims: {
          type: 'object',
          description: 'Custom claims assigned to the user',
          example: { role: 'admin' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
  })
  @ApiNotFoundResponse({
    description: 'User not found in Firebase Auth',
  })
  async getUsersMe(
    @Request() request: AuthenticatedRequest
  ): Promise<CurrentUserResponse> {
    try {
      const uid = request.user.uid;

      this.logger.debug(
        `Getting current user information for UID: ${uid} (via /users/me)`
      );
      const currentUser = await this.authService.getCurrentUser(uid);

      this.logger.debug(
        `Successfully retrieved current user information for UID: ${uid} (via /users/me)`
      );
      return currentUser;
    } catch (error) {
      this.logger.error('Failed to get current user information', error);
      throw error;
    }
  }
}
