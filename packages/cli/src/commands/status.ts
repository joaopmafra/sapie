import { ApiClient } from '../lib/api/api-client';
import { AuthService } from '../lib/auth/auth.service';
import { detectStatus, formatStatusOutput } from '../lib/sync/status.service';

interface StatusOptions {
  workspaceRoot: string;
  config: {
    apiBaseUrl: string;
    firebaseApiKey: string;
    firebaseAuthDomain: string;
    authEmulatorHost?: string;
  };
}

export async function statusCommand(opts: StatusOptions): Promise<void> {
  const authService = new AuthService({
    apiKey: opts.config.firebaseApiKey,
    authDomain: opts.config.firebaseAuthDomain,
    authEmulatorHost: opts.config.authEmulatorHost,
  });
  const api = new ApiClient(opts.config.apiBaseUrl);

  api.setTokenProvider(() => authService.getValidToken(opts.workspaceRoot));

  // Require authentication
  const token = await authService.getValidToken(opts.workspaceRoot);
  if (!token) {
    console.error('✗ Not authenticated. Run `sapie login` first.');
    process.exit(1);
  }

  const result = await detectStatus(api, opts.workspaceRoot);

  if (result.changes.length === 0) {
    console.log('No local changes. Workspace is in sync.');
  } else {
    console.log(formatStatusOutput(result));
  }
}
