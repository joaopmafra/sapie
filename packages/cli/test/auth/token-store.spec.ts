import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import {
  readTokens,
  writeTokens,
  updateTokens,
  deleteTokens,
} from '../../src/lib/auth/token-store';

describe('token-store', () => {
  let workspaceRoot: string;
  let authFilePath: string;

  beforeEach(async () => {
    workspaceRoot = path.join(
      os.tmpdir(),
      `sapie-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fs.mkdir(workspaceRoot, { recursive: true });
    authFilePath = path.join(workspaceRoot, '.sapie', 'auth.json');
  });

  afterEach(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  const sampleSignInResponse = {
    idToken: 'id-token-abc',
    email: 'test@example.com',
    refreshToken: 'refresh-token-xyz',
    expiresIn: '3600',
    localId: 'local-id-123',
    registered: true,
  };

  describe('writeTokens → readTokens round-trip', () => {
    it('writes and reads back tokens with correct values', async () => {
      const beforeWrite = Date.now();
      const written = await writeTokens(workspaceRoot, sampleSignInResponse);

      expect(written.idToken).toBe('id-token-abc');
      expect(written.refreshToken).toBe('refresh-token-xyz');
      expect(written.email).toBe('test@example.com');
      expect(written.localId).toBe('local-id-123');
      expect(written.expiresAt).toBeGreaterThanOrEqual(beforeWrite + 3600 * 1000);

      const read = await readTokens(workspaceRoot);
      expect(read).not.toBeNull();
      expect(read).toEqual(written);
    });

    it('creates the .sapie directory and auth.json with restrictive permissions', async () => {
      await writeTokens(workspaceRoot, sampleSignInResponse);

      const stat = await fs.stat(authFilePath);
      // mode 0o600: owner rw only
      expect(stat.mode & 0o777).toBe(0o600);

      const raw = await fs.readFile(authFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.idToken).toBe('id-token-abc');
      expect(parsed.refreshToken).toBe('refresh-token-xyz');
    });
  });

  describe('readTokens', () => {
    it('returns null when the file does not exist', async () => {
      const result = await readTokens(workspaceRoot);
      expect(result).toBeNull();
    });

    it('returns null when the file contains corrupted JSON', async () => {
      await fs.mkdir(path.join(workspaceRoot, '.sapie'), { recursive: true });
      await fs.writeFile(authFilePath, 'this is not json{', 'utf-8');

      const result = await readTokens(workspaceRoot);
      expect(result).toBeNull();
    });

    it('returns null when JSON is valid but missing required fields', async () => {
      await fs.mkdir(path.join(workspaceRoot, '.sapie'), { recursive: true });
      await fs.writeFile(authFilePath, JSON.stringify({ idToken: 'only-id' }), 'utf-8');

      const result = await readTokens(workspaceRoot);
      expect(result).toBeNull();
    });

    it('returns null when expiresAt is not a number', async () => {
      await fs.mkdir(path.join(workspaceRoot, '.sapie'), { recursive: true });
      await fs.writeFile(
        authFilePath,
        JSON.stringify({
          idToken: 'id',
          refreshToken: 'rt',
          expiresAt: 'not-a-number',
        }),
        'utf-8'
      );

      const result = await readTokens(workspaceRoot);
      expect(result).toBeNull();
    });
  });

  describe('updateTokens', () => {
    it('refreshes idToken, refreshToken, and expiresAt in the object and on disk', async () => {
      const tokens = await writeTokens(workspaceRoot, sampleSignInResponse);
      const originalTokens = { ...tokens };
      const beforeUpdate = Date.now();

      const updated = await updateTokens(workspaceRoot, tokens, 'new-id', 'new-refresh', 7200);

      // Object is mutated in place
      expect(updated).toBe(tokens);
      expect(updated.idToken).toBe('new-id');
      expect(updated.refreshToken).toBe('new-refresh');
      expect(updated.expiresAt).toBeGreaterThanOrEqual(beforeUpdate + 7200 * 1000);

      // Non-mutated fields stay the same
      expect(updated.email).toBe(originalTokens.email);
      expect(updated.localId).toBe(originalTokens.localId);

      // Disk reflects the update
      const raw = await fs.readFile(authFilePath, 'utf-8');
      const onDisk = JSON.parse(raw);
      expect(onDisk.idToken).toBe('new-id');
      expect(onDisk.refreshToken).toBe('new-refresh');
      expect(onDisk.expiresAt).toBe(updated.expiresAt);
      expect(onDisk.email).toBe(originalTokens.email);
      expect(onDisk.localId).toBe(originalTokens.localId);

      // readTokens also sees the update
      const reread = await readTokens(workspaceRoot);
      expect(reread).not.toBeNull();
      expect(reread!.idToken).toBe('new-id');
    });
  });

  describe('deleteTokens', () => {
    it('removes the auth.json file', async () => {
      await writeTokens(workspaceRoot, sampleSignInResponse);

      // File exists before delete
      await fs.stat(authFilePath);

      await deleteTokens(workspaceRoot);

      // File should be gone
      await expect(fs.stat(authFilePath)).rejects.toThrow();
    });

    it('no-ops when the file does not exist', async () => {
      // Should not throw
      await expect(deleteTokens(workspaceRoot)).resolves.toBeUndefined();
    });

    it('no-ops when the .sapie directory does not exist', async () => {
      // Remove the test workspace entirely, create a fresh empty one
      const emptyRoot = path.join(os.tmpdir(), `sapie-test-empty-${Date.now()}`);
      try {
        await fs.mkdir(emptyRoot, { recursive: true });
        await expect(deleteTokens(emptyRoot)).resolves.toBeUndefined();
      } finally {
        await fs.rm(emptyRoot, { recursive: true, force: true });
      }
    });
  });
});
