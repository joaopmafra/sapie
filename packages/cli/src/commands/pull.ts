import { ApiClient } from '../lib/api/api-client';
import { AuthService } from '../lib/auth/auth.service';
import { pull } from '../lib/sync/pull.service';
import { generateAgentsMd, generateGitignore } from '../lib/workspace/agents-md';

interface PullOptions {
  workspaceRoot: string;
  config: {
    apiBaseUrl: string;
    firebaseApiKey: string;
    firebaseAuthDomain: string;
    authEmulatorHost?: string;
  };
}

export async function pullCommand(opts: PullOptions): Promise<void> {
  const authService = new AuthService({
    apiKey: opts.config.firebaseApiKey,
    authDomain: opts.config.firebaseAuthDomain,
    authEmulatorHost: opts.config.authEmulatorHost,
  });
  const api = new ApiClient(opts.config.apiBaseUrl);

  api.setTokenProvider(() => authService.getValidToken(opts.workspaceRoot));

  // Ensure authenticated
  const token = await authService.getValidToken(opts.workspaceRoot);
  if (!token) {
    console.error('✗ Not authenticated. Run `sapie login` first.');
    process.exit(1);
  }

  console.log('Pulling from Sapie...');
  const result = await pull(api, opts.workspaceRoot);

  // Generate AGENTS.md and .gitignore on first pull
  await generateAgentsMd(opts.workspaceRoot);
  await generateGitignore(opts.workspaceRoot);

  // Report
  console.log(
    `✓ Pulled ${result.folders} folders, ${result.notes} notes, ${result.decks} decks` +
      ` (${result.created} new, ${result.unchanged} unchanged)`
  );

  if (result.collisions.length > 0) {
    console.log(`\n⚠ ${result.collisions.length} collision(s):`);
    for (const c of result.collisions) {
      console.log(`  ${c}`);
    }
  }
}
