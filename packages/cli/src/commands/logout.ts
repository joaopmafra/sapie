import { AuthService } from '../lib/auth/auth.service';

interface LogoutOptions {
  workspaceRoot: string;
  config: {
    firebaseApiKey: string;
    firebaseAuthDomain: string;
    authEmulatorHost?: string;
  };
}

export async function logoutCommand(opts: LogoutOptions): Promise<void> {
  const authService = new AuthService({
    apiKey: opts.config.firebaseApiKey,
    authDomain: opts.config.firebaseAuthDomain,
    authEmulatorHost: opts.config.authEmulatorHost,
  });
  await authService.logout(opts.workspaceRoot);
  console.log('✓ Logged out.');
}
