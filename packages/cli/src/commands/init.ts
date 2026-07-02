import * as fs from 'fs/promises';
import * as path from 'path';
import { generateAgentsMd, generateGitignore } from '../lib/workspace/agents-md';

interface InitOptions {
  workspaceRoot: string;
  apiBaseUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  googleClientId?: string;
  authEmulatorHost?: string;
}

export async function initCommand(opts: InitOptions): Promise<void> {
  // 1. Create workspace directory
  await fs.mkdir(opts.workspaceRoot, { recursive: true });

  // 2. Create .sapie directory
  const sapieDir = path.join(opts.workspaceRoot, '.sapie');
  await fs.mkdir(sapieDir, { recursive: true });

  // 3. Write config (skip if exists)
  const configPath = path.join(sapieDir, 'config.json');
  try {
    await fs.access(configPath);
    console.log(`⚠ .sapie/config.json already exists — skipping.`);
  } catch {
    const config: Record<string, string> = {
      apiBaseUrl: opts.apiBaseUrl,
      firebaseApiKey: opts.firebaseApiKey,
      firebaseAuthDomain: opts.firebaseAuthDomain,
    };
    if (opts.googleClientId) config.googleClientId = opts.googleClientId;
    if (opts.authEmulatorHost) config.authEmulatorHost = opts.authEmulatorHost;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    console.log(`✓ Created .sapie/config.json`);
  }

  // 4. Generate AGENTS.md (reuses existing generator — skips if exists)
  await generateAgentsMd(opts.workspaceRoot);
  const agentsPath = path.join(opts.workspaceRoot, 'AGENTS.md');
  try {
    await fs.access(agentsPath);
    console.log(`⚠ AGENTS.md already exists — skipping.`);
  } catch {
    console.log(`✓ Created AGENTS.md`);
  }

  // 5. Generate .gitignore (reuses existing generator — skips if exists)
  await generateGitignore(opts.workspaceRoot);
  const gitignorePath = path.join(opts.workspaceRoot, '.gitignore');
  try {
    await fs.access(gitignorePath);
    console.log(`⚠ .gitignore already exists — skipping.`);
  } catch {
    console.log(`✓ Created .gitignore`);
  }

  console.log(`\nWorkspace initialized at ${opts.workspaceRoot}`);
  if (!opts.firebaseApiKey) {
    console.log(
      `\n⚠ No firebaseApiKey set. Edit .sapie/config.json with your Firebase web app config before logging in.`
    );
  }
  console.log(
    `\nNext: run \`sapie login\` to authenticate, then \`sapie pull\` to download your content.`
  );
}
