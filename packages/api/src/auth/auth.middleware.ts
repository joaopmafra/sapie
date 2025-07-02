import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FirebaseAdminService } from '../firebase';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

/**
 * Firebase Authentication Middleware
 *
 * This middleware processes Firebase ID tokens from the Authorization header
 * and adds user information to the request object when a valid token is present.
 * Unlike the AuthGuard, this middleware is optional and doesn't throw errors
 * for missing tokens - it simply adds user context when available.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async use(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const token = this.extractTokenFromHeader(req);

    if (token) {
      try {
        // Verify the Firebase ID token using the Firebase Admin service
        const decodedToken =
          await this.firebaseAdminService.verifyIdToken(token);

        // Add user information to the request object
        req.user = decodedToken;

        this.logger.log(`User context added: ${decodedToken.uid}`);
      } catch (error) {
        this.logger.warn('Token verification failed in middleware:', error);
        // Don't throw error - just continue without user context
        // This allows endpoints to handle authentication optionally
      }
    }

    next();
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
