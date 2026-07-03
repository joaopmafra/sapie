import * as fs from 'fs/promises';
import * as path from 'path';
import { computeBlobHash, computeBodyHash } from './hashing';
import { SyncEntry, SyncState } from './sync-state';

const STATE_DIR = '.sapie';
const STATE_FILE = '.sapie/state.json';

/** Empty sync state template. */
export function createEmptyState(rootId: string): SyncState {
  return {
    version: 1,
    lastSyncAt: new Date().toISOString(),
    rootId,
    bodyHashByContentId: {},
    blobHashByContentId: {},
    entries: {},
  };
}

/** Read sync state from .sapie/state.json. Returns null if missing or corrupted. */
export async function readState(workspaceRoot: string): Promise<SyncState | null> {
  try {
    const raw = await fs.readFile(path.join(workspaceRoot, STATE_FILE), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && typeof parsed.rootId === 'string') {
      return parsed as SyncState;
    }
    return null;
  } catch {
    return null;
  }
}

/** Write sync state to .sapie/state.json. Creates .sapie/ directory if needed. */
export async function writeState(workspaceRoot: string, state: SyncState): Promise<void> {
  const dir = path.join(workspaceRoot, STATE_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(workspaceRoot, STATE_FILE), JSON.stringify(state, null, 2));
}

/** Check if a content body has changed compared to stored hash. */
export function hasBodyChanged(
  state: SyncState,
  contentId: string,
  currentBody: string | null
): boolean {
  if (currentBody === null) {
    // No body local — only changed if state thinks there was one
    return contentId in state.bodyHashByContentId;
  }
  const hash = computeBodyHash(currentBody);
  const stored = state.bodyHashByContentId[contentId];
  return hash !== stored;
}

/** Update body hash in state after successful push/pull. */
export function updateBodyHash(state: SyncState, contentId: string, body: string | null): void {
  if (body === null) {
    delete state.bodyHashByContentId[contentId];
  } else {
    state.bodyHashByContentId[contentId] = computeBodyHash(body);
  }
}

/** Update a blob hash in state. Pass bytes=null to remove the hash. Cleans up empty inner objects. */
export function updateBlobHash(
  state: SyncState,
  contentId: string,
  blobId: string,
  bytes: Buffer | null
): void {
  if (bytes === null) {
    if (state.blobHashByContentId[contentId]) {
      delete state.blobHashByContentId[contentId][blobId];
      if (Object.keys(state.blobHashByContentId[contentId]).length === 0) {
        delete state.blobHashByContentId[contentId];
      }
    }
  } else {
    if (!state.blobHashByContentId[contentId]) {
      state.blobHashByContentId[contentId] = {};
    }
    state.blobHashByContentId[contentId][blobId] = computeBlobHash(bytes);
  }
}

/** Look up the content ID for a given local path. */
export function findEntryByPath(state: SyncState, localPath: string): SyncEntry | null {
  for (const entry of Object.values(state.entries)) {
    if (entry.localPath === localPath) return entry;
  }
  return null;
}

/** Find the local path for a given content ID. */
export function findPathById(state: SyncState, contentId: string): string | null {
  return state.entries[contentId]?.localPath ?? null;
}
