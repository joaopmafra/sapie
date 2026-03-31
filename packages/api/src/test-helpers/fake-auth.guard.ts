import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth';

@Injectable()
export class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const testUserIdHeader = request.headers['x-test-user-id'];

    const uid =
      typeof testUserIdHeader === 'string' && testUserIdHeader.length > 0
        ? testUserIdHeader
        : 'test-user';

    request.user = { uid } as AuthenticatedRequest['user'];

    return true;
  }
}
