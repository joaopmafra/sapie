#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { pullCommand } from './commands/pull';
import { pushCommand } from './commands/push';
import { statusCommand } from './commands/status';
import { deckCommand } from './commands/deck';
import { loadConfig, resolveWorkspaceRoot } from './lib/config';

async function main(): Promise<void> {
  yargs(hideBin(process.argv))
    .scriptName('sapie')
    .usage('$0 <command> [options]')
    .command(
      'login',
      'Authenticate with Google or email/password',
      (y) =>
        y
          .option('method', {
            type: 'string',
            choices: ['google', 'email'] as const,
            default: 'google' as const,
            description: 'Authentication method',
          })
          .option('workspace', {
            type: 'string',
            description: 'Path to Sapie workspace directory',
          }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await loginCommand({
          workspaceRoot,
          config,
          method: args.method as 'google' | 'email',
        });
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
        y
          .option('workspace', {
            type: 'string',
            description: 'Path to Sapie workspace directory',
          })
          .option('abort', {
            type: 'boolean',
            description: 'Force-release any existing sync lock without pushing',
            default: false,
          }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await pushCommand({ workspaceRoot, config, abort: args.abort as boolean });
      }
    )
    .command(
      'status',
      'Show local changes (dry-run)',
      (y) =>
        y.option('workspace', {
          type: 'string',
          description: 'Path to Sapie workspace directory',
        }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await statusCommand({ workspaceRoot, config });
      }
    )
    .command(deckCommand)
    .demandCommand(1, 'Please specify a command: login, logout, pull, push, status, deck')
    .strict()
    .help()
    .version('0.0.2')
    .parse();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
