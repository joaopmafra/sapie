#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initCommand } from './commands/init';
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
      'init',
      'Initialize a new Sapie workspace',
      (y) =>
        y
          .option('workspace', {
            type: 'string',
            description: 'Path to create the workspace directory (default: ~/sapie-workspace)',
          })
          .option('api-base-url', {
            type: 'string',
            description: 'Sapie API base URL',
            default: 'https://api.sapie.dev/api',
          })
          .option('firebase-api-key', {
            type: 'string',
            description: 'Firebase web API key (from Firebase Console)',
            default: '',
          })
          .option('firebase-auth-domain', {
            type: 'string',
            description: 'Firebase Auth domain',
            default: 'sapie-dev.firebaseapp.com',
          })
          .option('google-client-id', {
            type: 'string',
            description: 'Google OAuth web client ID (for sapie login --method google)',
          })
          .option('auth-emulator-host', {
            type: 'string',
            description: 'Firebase Auth emulator host (e.g. localhost:9099)',
          }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        await initCommand({
          workspaceRoot,
          apiBaseUrl: (args['api-base-url'] as string) || 'https://api.sapie.dev/api',
          firebaseApiKey: (args['firebase-api-key'] as string) || '',
          firebaseAuthDomain:
            (args['firebase-auth-domain'] as string) || 'sapie-dev.firebaseapp.com',
          googleClientId: args['google-client-id'] as string | undefined,
          authEmulatorHost: args['auth-emulator-host'] as string | undefined,
        });
      }
    )
    .command(
      'login',
      'Authenticate with Google or email/password',
      (y) =>
        y
          .option('method', {
            type: 'string',
            choices: ['google', 'email'],
            default: 'google',
            description: 'Auth method',
          })
          .option('workspace', {
            type: 'string',
            description:
              'Path to Sapie workspace directory (auto-detected from .sapie/config.json if not provided)',
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
          description: 'Path to Sapie workspace directory (auto-detected if not provided)',
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
          description: 'Path to Sapie workspace directory (auto-detected if not provided)',
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
            description: 'Path to Sapie workspace directory (auto-detected if not provided)',
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
          description: 'Path to Sapie workspace directory (auto-detected if not provided)',
        }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = loadConfig(workspaceRoot);
        await statusCommand({ workspaceRoot, config });
      }
    )
    .command(deckCommand)
    .demandCommand(1, 'Please specify a command: init, login, logout, pull, push, status, deck')
    .strict()
    .help()
    .version('0.0.4')
    .parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
