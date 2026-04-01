import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth';

export const TEST_USER_ID_HEADER = 'X-Test-User-Id';

@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const testUserIdHeader = request.headers[TEST_USER_ID_HEADER.toLowerCase()];

    if (typeof testUserIdHeader === 'string' && testUserIdHeader.length > 0)
      request.user = { uid: testUserIdHeader } as AuthenticatedRequest['user'];

    return true;
  }
}
