import { AuthService } from '../lib/auth/auth.service';
import { promptEmailPassword } from '../lib/auth/prompt-email-password';
interface LoginOptions {
  workspaceRoot: string;
  config: Config;
  method: 'google' | 'email';
}

interface Config {
  apiBaseUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  googleClientId?: string;
  authEmulatorHost?: string;
}

export async function loginCommand(opts: LoginOptions): Promise<void> {
  const authService = new AuthService({
    apiKey: opts.config.firebaseApiKey,
    authDomain: opts.config.firebaseAuthDomain,
    googleClientId: opts.config.googleClientId,
    authEmulatorHost: opts.config.authEmulatorHost,
  });

  if (opts.method === 'google') {
    try {
      const tokens = await authService.signInWithGoogle(opts.workspaceRoot);
      console.log(`✓ Logged in as ${tokens.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ Google sign-in failed: ${message}`);
      process.exit(1);
    }
    return;
  }

  // Email/password flow
  const { email, password } = await promptEmailPassword();

  try {
    const tokens = await authService.signInWithPassword(opts.workspaceRoot, email, password);
    console.log(`✓ Logged in as ${tokens.email}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('INVALID_LOGIN_CREDENTIALS') || message.includes('400')) {
      console.error('✗ Invalid email or password.');
    } else if (message.includes('TOO_MANY_ATTEMPTS')) {
      console.error('✗ Too many attempts. Try again later.');
    } else {
      console.error(`✗ Login failed: ${message}`);
    }
    process.exit(1);
  }
}
