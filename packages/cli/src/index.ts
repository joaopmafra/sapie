#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { pullCommand } from './commands/pull';
import { pushCommand } from './commands/push';
import { loadConfig, resolveWorkspaceRoot } from './lib/config';

async function main(): Promise<void> {
  yargs(hideBin(process.argv))
    .scriptName('sapie')
    .usage('$0 <command> [options]')
    .command(
      'login',
      'Authenticate with email and password',
      (y) =>
        y.option('workspace', {
          type: 'string',
          description: 'Path to Sapie workspace directory',
        }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await loginCommand({ workspaceRoot, config });
      }
    )
    .command(
      'logout',
      'Clear stored credentials',
      (y) =>
        y.option('workspace', {
          type: 'string',
          description: 'Path to Sapie workspace directory',
        }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await logoutCommand({ workspaceRoot, config });
      }
    )
    .command(
      'pull',
      'Download content tree from Sapie',
      (y) =>
        y.option('workspace', {
          type: 'string',
          description: 'Path to Sapie workspace directory',
        }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await pullCommand({ workspaceRoot, config });
      }
    )
    .command(
      'push',
      'Upload local changes to Sapie',
      (y) =>
        y.option('workspace', {
          type: 'string',
          description: 'Path to Sapie workspace directory',
        }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await pushCommand({ workspaceRoot, config });
      }
    )
    .demandCommand(1, 'Please specify a command: login, logout, pull, push')
    .strict()
    .help()
    .version('0.0.1')
    .parse();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
