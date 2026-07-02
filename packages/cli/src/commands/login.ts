import * as readline from 'readline';
import { AuthService } from '../lib/auth/auth.service';

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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const email = await new Promise<string>((resolve) => {
    rl.question('Email: ', resolve);
  });

  const password = await new Promise<string>((resolve) => {
    rl.question('Password: ', resolve);
  });

  rl.close();

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
