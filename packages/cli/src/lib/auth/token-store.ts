import * as fs from 'fs/promises';
import * as path from 'path';
import { FirebaseSignInResponse } from '../api/types';

const AUTH_FILE = '.sapie/auth.json';

export interface AuthTokens {
  idToken: string;
  refreshToken: string;
  email: string;
  localId: string;
  expiresAt: number; // epoch ms
}

/**
 * Read auth tokens from .sapie/auth.json.
 * Returns null if the file doesn't exist or is invalid.
 */
export async function readTokens(workspaceRoot: string): Promise<AuthTokens | null> {
  try {
    const raw = await fs.readFile(path.join(workspaceRoot, AUTH_FILE), 'utf-8');
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.idToken === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed as AuthTokens;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write auth tokens to .sapie/auth.json with 600 permissions.
 */
export async function writeTokens(
  workspaceRoot: string,
  signInResponse: FirebaseSignInResponse
): Promise<AuthTokens> {
  const tokens: AuthTokens = {
    idToken: signInResponse.idToken,
    refreshToken: signInResponse.refreshToken,
    email: signInResponse.email,
    localId: signInResponse.localId,
    expiresAt: Date.now() + parseInt(signInResponse.expiresIn, 10) * 1000,
  };

  const authDir = path.join(workspaceRoot, '.sapie');
  await fs.mkdir(authDir, { recursive: true });

  const filePath = path.join(workspaceRoot, AUTH_FILE);
  await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  return tokens;
}

/**
 * Update tokens after a refresh.
 */
export async function updateTokens(
  workspaceRoot: string,
  tokens: AuthTokens,
  newIdToken: string,
  newRefreshToken: string,
  expiresInSeconds: number
): Promise<AuthTokens> {
  tokens.idToken = newIdToken;
  tokens.refreshToken = newRefreshToken;
  tokens.expiresAt = Date.now() + expiresInSeconds * 1000;

  const filePath = path.join(workspaceRoot, AUTH_FILE);
  await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  return tokens;
}

/**
 * Delete auth tokens (logout).
 */
export async function deleteTokens(workspaceRoot: string): Promise<void> {
  try {
    await fs.unlink(path.join(workspaceRoot, AUTH_FILE));
  } catch {
    // File doesn't exist — that's fine
  }
}
