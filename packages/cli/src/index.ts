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
import { resolveEnvironment } from './lib/environments';
import * as path from 'path';
import * as fs from 'fs';

async function main(): Promise<void> {
  yargs(hideBin(process.argv))
    .scriptName('sapie')
    .usage('$0 <command> [options]')
    .command(
      'init',
      'Initialize a new Sapie workspace',
      (y) =>
        y
          .option('folder', {
            alias: 'f',
            type: 'string',
            description: 'Target directory (default: current directory)',
          })
          .option('url', {
            alias: 'u',
            type: 'string',
            default: 'https://sapie.app',
            description: 'Sapie server URL (localhost, sapie-b09be.web.app, or custom)',
          })
          .option('auth', {
            alias: 'a',
            type: 'string',
            choices: ['google', 'email'],
            default: 'google',
            description: 'Authentication method',
          }),
      async (args) => {
        const targetDir = path.resolve((args.folder as string) || process.cwd());

        const IGNORE_FILES: Record<string, true> = {
          '.git': true,
          '.sapie': true,
          'AGENTS.md': true,
          '.gitignore': true,
        };
        if (fs.existsSync(targetDir)) {
          const entries = fs.readdirSync(targetDir).filter((f: string) => !IGNORE_FILES[f]);
          if (entries.length > 0) {
            console.error(`✗ Directory not empty: ${targetDir}`);
            process.exit(1);
          }
        }

        const envConfig = resolveEnvironment(args.url as string);
        await initCommand({
          targetDir,
          envConfig,
          authMethod: args.auth as 'google' | 'email',
        });
      }
    )
    .command(
      'login',
      'Authenticate with Google or email/password',
      (y) =>
        y
          .option('auth', {
            alias: 'a',
            type: 'string',
            choices: ['google', 'email'],
            default: 'google',
            description: 'Authentication method',
          })
          .option('workspace', {
            type: 'string',
            description:
              'Path to Sapie workspace directory (auto-detected from .sapie/config.json if not provided)',
          })
          .option('url', {
            alias: 'u',
            type: 'string',
            description:
              'Sapie server URL — overrides config (localhost, sapie-b09be.web.app, or custom)',
          }),
      async (args) => {
        const workspaceRoot = resolveWorkspaceRoot(args.workspace as string | undefined);
        const config = args.url
          ? resolveEnvironment(args.url as string)
          : loadConfig(workspaceRoot);
        await loginCommand({
          workspaceRoot,
          config,
          method: args.auth as 'google' | 'email',
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
    .alias('help', 'h')
    .version('0.0.4')
    .parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
