import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthMiddleware } from './auth.middleware';

/**
 * Authentication Module
 *
 * This module provides authentication utilities including:
 * - AuthService for user management operations
 * - AuthController for authentication endpoints
 * - AuthGuard for protecting routes
 * - AuthMiddleware for optional authentication context
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AuthMiddleware],
  exports: [AuthService, AuthGuard, AuthMiddleware],
})
export class AuthModule {}
