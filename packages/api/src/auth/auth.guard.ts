import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { verifyIdToken } from '../config/firebase-admin.config';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends Request {
  user: admin.auth.DecodedIdToken;
}

/**
 * Firebase Authentication Guard
 *
 * This guard verifies Firebase ID tokens and adds user information
 * to the request object for authenticated endpoints.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No authorization token provided');
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      // Verify the Firebase ID token using the existing Firebase Admin configuration
      const decodedToken = await verifyIdToken(token);

      // Add user information to the request object
      request.user = decodedToken;

      this.logger.log(`User authenticated: ${decodedToken.uid}`);
      return true;
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extract Bearer token from Authorization header
   *
   * @param request - HTTP request object
   * @returns Token string or null if not found
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
