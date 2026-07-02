import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CliConfig {
  apiBaseUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
}

const DEFAULT_WORKSPACE = path.join(os.homedir(), 'sapie-workspace');

/**
 * Load config from .sapie/config.json in the workspace.
 * Falls back to defaults for local dev.
 */
export function loadConfig(workspaceRoot: string): CliConfig {
  const configPath = path.join(workspaceRoot, '.sapie', 'config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      apiBaseUrl: parsed.apiBaseUrl || 'https://api.sapie.dev/api',
      firebaseApiKey: parsed.firebaseApiKey || '',
      firebaseAuthDomain: parsed.firebaseAuthDomain || 'sapie-dev.firebaseapp.com',
    };
  } catch {
    return {
      apiBaseUrl: 'https://api.sapie.dev/api',
      firebaseApiKey: '',
      firebaseAuthDomain: 'sapie-dev.firebaseapp.com',
    };
  }
}

/**
 * Get the workspace root path.
 * Defaults to ~/sapie-workspace, overridable via --workspace flag.
 */
export function resolveWorkspaceRoot(workspaceFlag?: string): string {
  return workspaceFlag || DEFAULT_WORKSPACE;
}
