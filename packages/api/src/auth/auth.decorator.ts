import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiSecurity,
} from '@nestjs/swagger';

/**
 * Authentication Decorator
 *
 * This decorator combines the AuthGuard with Swagger API documentation
 * for protected endpoints. It ensures that endpoints require authentication
 * and provides proper API documentation.
 */
export function Auth() {
  return applyDecorators(
    UseGuards(AuthGuard),
    ApiBearerAuth(),
    ApiSecurity('bearer'),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Valid Firebase ID token required',
      schema: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            example: 401,
          },
          message: {
            type: 'string',
            example: 'Authorization token is required',
          },
          error: {
            type: 'string',
            example: 'Unauthorized',
          },
        },
      },
    })
  );
}

/**
 * Optional Authentication Decorator
 *
 * This decorator applies authentication middleware without enforcing it.
 * Useful for endpoints that can work with or without authentication,
 * providing different behavior based on user context.
 */
export function OptionalAuth() {
  return applyDecorators(ApiBearerAuth(), ApiSecurity('bearer'));
}
