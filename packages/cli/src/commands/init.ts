import * as fs from 'fs/promises';
import * as path from 'path';
import { generateAgentsMd, generateGitignore } from '../lib/workspace/agents-md';
import type { EnvironmentConfig } from '../lib/environments';
import { AuthService } from '../lib/auth/auth.service';
import { promptEmailPassword } from '../lib/auth/prompt-email-password';

interface InitOptions {
  targetDir: string;
  envConfig: EnvironmentConfig;
  authMethod: 'google' | 'email';
}

export async function initCommand(opts: InitOptions): Promise<void> {
  // 1. Create .sapie directory (targetDir already exists — enforced by caller)
  const sapieDir = path.join(opts.targetDir, '.sapie');
  await fs.mkdir(sapieDir, { recursive: true });

  // 2. Write config (skip if exists)
  const configPath = path.join(sapieDir, 'config.json');
  try {
    await fs.access(configPath);
    console.log(`⚠ .sapie/config.json already exists — skipping.`);
  } catch {
    const config: Record<string, string> = {
      apiBaseUrl: opts.envConfig.apiBaseUrl,
      firebaseApiKey: opts.envConfig.firebaseApiKey,
      firebaseAuthDomain: opts.envConfig.firebaseAuthDomain,
    };
    if (opts.envConfig.googleClientId) config.googleClientId = opts.envConfig.googleClientId;
    if (opts.envConfig.authEmulatorHost) config.authEmulatorHost = opts.envConfig.authEmulatorHost;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    console.log(`✓ Created .sapie/config.json`);
  }

  // 3. Generate AGENTS.md (reuses existing generator)
  const agentsExisted = await fileExists(path.join(opts.targetDir, 'AGENTS.md'));
  await generateAgentsMd(opts.targetDir);
  if (agentsExisted) {
    console.log(`⚠ AGENTS.md already exists — skipping.`);
  } else {
    console.log(`✓ Created AGENTS.md`);
  }

  // 4. Generate .gitignore
  const gitignoreExisted = await fileExists(path.join(opts.targetDir, '.gitignore'));
  await generateGitignore(opts.targetDir);
  if (gitignoreExisted) {
    console.log(`⚠ .gitignore already exists — skipping.`);
  } else {
    console.log(`✓ Created .gitignore`);
  }

  console.log(`\nWorkspace initialized at ${opts.targetDir}`);

  // 5. Auth flow — skip if no firebaseApiKey (custom URL)
  if (!opts.envConfig.firebaseApiKey) {
    console.log(`\n⚠ Custom URL — you must configure Firebase manually or use API key auth.`);
    console.log(
      `Next: run \`sapie login\` to authenticate, then \`sapie pull\` to download your content.`
    );
    return;
  }

  const authService = new AuthService({
    apiKey: opts.envConfig.firebaseApiKey,
    authDomain: opts.envConfig.firebaseAuthDomain,
    googleClientId: opts.envConfig.googleClientId,
    authEmulatorHost: opts.envConfig.authEmulatorHost,
  });

  try {
    if (opts.authMethod === 'email') {
      const { email, password } = await promptEmailPassword();
      const tokens = await authService.signInWithPassword(opts.targetDir, email, password);
      console.log(`✓ Logged in as ${tokens.email}`);
    } else {
      const tokens = await authService.signInWithGoogle(opts.targetDir);
      console.log(`✓ Logged in as ${tokens.email}`);
    }
    console.log(`\nWorkspace ready. Run \`sapie pull\` to download your content.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('INVALID_LOGIN_CREDENTIALS') || message.includes('400')) {
      console.error('✗ Invalid email or password.');
    } else if (message.includes('TOO_MANY_ATTEMPTS')) {
      console.error('✗ Too many attempts. Try again later.');
    } else {
      console.error(`✗ Auth failed: ${message}`);
    }
    console.error(`⚠ Auth failed. Run \`sapie login\` to try again.`);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
