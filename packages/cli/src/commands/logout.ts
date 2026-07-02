import { AuthService } from '../lib/auth/auth.service';

interface LogoutOptions {
  workspaceRoot: string;
  config: { firebaseApiKey: string };
}

export async function logoutCommand(opts: LogoutOptions): Promise<void> {
  const authService = new AuthService({ apiKey: opts.config.firebaseApiKey });
  await authService.logout(opts.workspaceRoot);
  console.log('✓ Logged out.');
}
