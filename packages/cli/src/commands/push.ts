import { ApiClient } from '../lib/api/api-client';
import { AuthService } from '../lib/auth/auth.service';
import { push } from '../lib/sync/push.service';

interface PushOptions {
  workspaceRoot: string;
  config: {
    apiBaseUrl: string;
    firebaseApiKey: string;
    firebaseAuthDomain: string;
    authEmulatorHost?: string;
  };
  abort?: boolean;
}

export async function pushCommand(opts: PushOptions): Promise<void> {
  const authService = new AuthService({
    apiKey: opts.config.firebaseApiKey,
    authDomain: opts.config.firebaseAuthDomain,
    authEmulatorHost: opts.config.authEmulatorHost,
  });
  const api = new ApiClient(opts.config.apiBaseUrl);

  api.setTokenProvider(() => authService.getValidToken(opts.workspaceRoot));

  const token = await authService.getValidToken(opts.workspaceRoot);
  if (!token) {
    console.error('✗ Not authenticated. Run `sapie login` first.');
    process.exit(1);
  }

  if (opts.abort) {
    console.log('Force-releasing sync lock...');
    await push(api, opts.workspaceRoot, { abort: true });
    console.log('✓ Lock released.');
    return;
  }

  console.log('Pushing to Sapie...');
  const result = await push(api, opts.workspaceRoot);

  console.log(
    `✓ Pushed: ${result.created} created, ${result.updated} updated, ` +
      `${result.renamed} renamed, ${result.deleted} deleted, ` +
      `${result.deckCardsChanged} deck card changes` +
      (result.conflicts > 0 ? `, ${result.conflicts} conflicts` : '')
  );

  if (result.errors.length > 0) {
    console.log(`\n⚠ ${result.errors.length} error(s):`);
    for (const err of result.errors) {
      console.log(`  ${err}`);
    }
  }
}
