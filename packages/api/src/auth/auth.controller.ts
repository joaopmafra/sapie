import { Controller, Get, Request, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthService, AuthenticatedUser } from './auth.service';
import { Auth } from './auth.decorator';
import { AuthenticatedRequest } from './auth.guard';

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
   * Get current authenticated user information
   *
   * @param request - HTTP request with authenticated user context
   * @returns Promise<AuthenticatedUser> - Authenticated user information
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
    type: AuthenticatedUser,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Valid Firebase ID token required',
  })
  @ApiNotFoundResponse({
    description: 'User not found in Firebase Auth',
  })
  async getCurrentUser(@Request() request: AuthenticatedRequest): Promise<AuthenticatedUser> {
    const uid = request.user.uid;
    try {
      const currentUser = await this.authService.getCurrentUser(uid);
      this.logger.debug(`Successfully retrieved current user information for UID: ${uid}`);
      return currentUser;
    } catch (error) {
      this.logger.error(`Failed to get current user information for UID: ${uid}`, error);
      throw error;
    }
  }
}
