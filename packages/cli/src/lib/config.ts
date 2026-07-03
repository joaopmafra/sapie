import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CliConfig {
  apiBaseUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  googleClientId?: string;
  authEmulatorHost?: string;
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
      googleClientId: parsed.googleClientId || undefined,
      authEmulatorHost: parsed.authEmulatorHost || undefined,
    };
  } catch {
    return {
      apiBaseUrl: 'https://api.sapie.dev/api',
      firebaseApiKey: '',
      firebaseAuthDomain: 'sapie-dev.firebaseapp.com',
      googleClientId: undefined,
      authEmulatorHost: undefined,
    };
  }
}

/**
 * Walk up from the current working directory looking for a .sapie/config.json.
 * Returns the workspace root directory (the parent of .sapie), or null if not found.
 */
export function detectWorkspaceRoot(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 50; i++) {
    const configPath = path.join(dir, '.sapie', 'config.json');
    try {
      fs.accessSync(configPath, fs.constants.R_OK);
      return dir;
    } catch {
      // not here, try parent
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Get the workspace root path.
 * Defaults to ~/sapie-workspace, overridable via --workspace flag.
 */
export function resolveWorkspaceRoot(workspaceFlag?: string): string {
  if (workspaceFlag) return workspaceFlag;
  return detectWorkspaceRoot() || DEFAULT_WORKSPACE;
}
