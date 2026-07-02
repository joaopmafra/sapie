import * as crypto from 'crypto';
import * as path from 'path';
import { ApiClient, ApiError } from '../api/api-client';
import { ContentType } from '../api/types';
import { computeCardHash } from '../state/hashing';
import {
  findEntryByPath,
  hasBodyChanged,
  readState,
  updateBodyHash,
  writeState,
} from '../state/state.service';
import { LocalCard, SyncEntry, SyncState } from '../state/sync-state';
import {
  listDeckFiles,
  readDeck,
  readNoteBody,
  sanitizeName,
  unsanitizeName,
  walkLocalTree,
} from '../workspace/workspace.service';
import { createMarkdownService } from '../markdown/markdown.service';

export interface PushResult {
  created: number;
  updated: number;
  renamed: number;
  deleted: number;
  deckCardsChanged: number;
  conflicts: number;
  errors: string[];
}

interface ChangeSet {
  creates: CreateOp[];
  renames: RenameOp[];
  bodyUpdates: BodyUpdateOp[];
  deckCardChanges: DeckCardChange[];
  deletes: DeleteOp[];
}

interface CreateOp {
  localPath: string;
  name: string;
  parentId: string;
  type: ContentType;
}

interface RenameOp {
  id: string;
  newName: string;
  localPath: string;
}

interface BodyUpdateOp {
  id: string;
  body: string;
  expectedRevision: string;
  localPath: string;
}

interface DeckCardChange {
  deckId: string;
  localPath: string;
  noteLocalPath: string;
  deckName: string;
  cards: LocalCard[];
  prevCardIds: string[];
  prevCardHash: string;
}

interface DeleteOp {
  id: string;
  localPath: string;
  isNote: boolean;
}
export interface PushOptions {
  /** If true, force-release any existing lock instead of pushing. */
  abort?: boolean;
}

function generateInstanceId(): string {
  return crypto.randomUUID();
}

/**
 * Push local changes to the Sapie API.
 * In Phase 3, acquires a pessimistic lock before pushing.
 */
export async function push(
  api: ApiClient,
  workspaceRoot: string,
  opts: PushOptions = {}
): Promise<PushResult> {
  // Handle --abort: force-release and exit
  if (opts.abort) {
    await api.releaseLock('', true);
    return {
      created: 0,
      updated: 0,
      renamed: 0,
      deleted: 0,
      deckCardsChanged: 0,
      conflicts: 0,
      errors: [],
    };
  }

  const result: PushResult = {
    created: 0,
    updated: 0,
    renamed: 0,
    deleted: 0,
    deckCardsChanged: 0,
    conflicts: 0,
    errors: [],
  };

  const instanceId = generateInstanceId();
  // Acquire lock
  let hasLock = false;
  try {
    await api.acquireLock(instanceId);
    hasLock = true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const problem = err.problem as Record<string, unknown> | undefined;
      const existingInstance = problem?.instanceId ?? 'unknown';
      const expiresAt = problem?.expiresAt ?? 'unknown';
      result.errors.push(
        `Lock conflict: another push is in progress (instance ${existingInstance}, expires ${expiresAt}). ` +
          `Use --abort to force-release a stale lock.`
      );
      return result;
    }
    if (err instanceof ApiError && err.status === 404) {
      // Lock endpoint not available — proceed without locking (backward compat)
    } else {
      result.errors.push(`Failed to acquire lock: ${err instanceof Error ? err.message : err}`);
      return result;
    }
  }
  try {
    // 1. Load state
    const state = await readState(workspaceRoot);
    if (!state) {
      result.errors.push('No .sapie/state.json found — run `sapie pull` first.');
      return result;
    }

    // 2. Detect changes
    const changes = await detectChanges(api, workspaceRoot, state);

    // 3. Apply: creates first
    for (const op of changes.creates) {
      try {
        const created = await api.createContent({
          name: op.name,
          parentId: op.parentId,
          type: op.type,
        });

        // Add entry to state
        state.entries[created.id] = {
          id: created.id,
          type: op.type === ContentType.DIRECTORY ? 'directory' : 'note',
          name: created.name,
          parentId: created.parentId,
          updatedAt: created.updatedAt,
          bodyUpdatedAt: created.body?.updatedAt ?? null,
          localPath: op.localPath,
        };
        result.created++;
      } catch (err) {
        result.errors.push(
          `Failed to create ${op.localPath}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // 4. Renames
    for (const op of changes.renames) {
      try {
        const updated = await api.patchContent(op.id, { name: op.newName });
        const entry = state.entries[op.id];
        if (entry) {
          entry.name = updated.name;
          entry.updatedAt = updated.updatedAt;
        }
        result.renamed++;
      } catch (err) {
        result.errors.push(
          `Failed to rename ${op.localPath}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // 5. Body updates
    for (const op of changes.bodyUpdates) {
      try {
        const updated = await api.putBody(op.id, op.body, 'text/markdown', op.expectedRevision);
        const entry = state.entries[op.id];
        if (entry) {
          entry.bodyUpdatedAt = updated.body?.updatedAt ?? null;
          entry.updatedAt = updated.updatedAt;
        }
        updateBodyHash(state, op.id, op.body);
        result.updated++;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          result.conflicts++;
          result.errors.push(
            `Conflict on ${op.localPath}: body was modified remotely — run \`sapie pull\` to resolve.`
          );
        } else {
          result.errors.push(
            `Failed to update ${op.localPath}: ${err instanceof Error ? err.message : err}`
          );
        }
      }
    }

    // 6. Deck card changes
    for (const change of changes.deckCardChanges) {
      try {
        await syncDeckCards(api, change);
        result.deckCardsChanged++;
      } catch (err) {
        result.errors.push(
          `Failed to sync deck cards in ${change.localPath}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // 7. Deletes (soft-delete)
    for (const op of changes.deletes) {
      try {
        const cascade = op.isNote;
        await api.deleteContent(op.id, cascade);
        delete state.entries[op.id];
        if (op.isNote) {
          delete state.bodyHashByContentId[op.id];
        }
        result.deleted++;
      } catch (err) {
        result.errors.push(
          `Failed to delete ${op.localPath}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // 8. Update state
    state.lastSyncAt = new Date().toISOString();
    await writeState(workspaceRoot, state);

    return result;
  } finally {
    if (hasLock) {
      try {
        await api.releaseLock(instanceId);
      } catch {
        // Lock release failure is non-fatal
      }
    }
  }
}

async function detectChanges(
  api: ApiClient,
  workspaceRoot: string,
  state: SyncState
): Promise<ChangeSet> {
  const changes: ChangeSet = {
    creates: [],
    renames: [],
    bodyUpdates: [],
    deckCardChanges: [],
    deletes: [],
  };

  const localTree = await walkLocalTree(workspaceRoot);

  // Build set of local paths
  const localPaths = new Set(localTree.map((t) => t.localPath));

  // Detect creates: paths in local but not in state
  for (const item of localTree) {
    const entry = findEntryByPath(state, item.localPath);
    if (!entry) {
      if (item.isNote) {
        // New note
        const noteName = unsanitizeName(path.basename(item.localPath));

        // Determine parent
        const parentPath = path.dirname(item.localPath);
        const parentEntry = findEntryByPath(state, parentPath);
        if (parentEntry) {
          changes.creates.push({
            localPath: item.localPath,
            name: noteName,
            parentId: parentEntry.id,
            type: ContentType.NOTE,
          });
        }
      } else {
        // Could be a folder or a deck file
        if (item.localPath.includes('/decks/') && item.localPath.endsWith('.json')) {
          // New deck — handle in deck sync
        } else {
          // New folder
          const folderName = path.basename(item.localPath);
          const parentPath = path.dirname(item.localPath);
          const parentEntry =
            parentPath === '.' ? state.entries[state.rootId] : findEntryByPath(state, parentPath);
          if (parentEntry) {
            changes.creates.push({
              localPath: item.localPath,
              name: folderName,
              parentId: parentEntry.id,
              type: ContentType.DIRECTORY,
            });
          }
        }
      }
    }
  }

  // Detect deletes: paths in state but not local
  for (const [id, entry] of Object.entries(state.entries)) {
    if (!localPaths.has(entry.localPath)) {
      changes.deletes.push({
        id,
        localPath: entry.localPath,
        isNote: entry.type === 'note',
      });
    }
  }

  // Detect renames and body changes for existing entries
  for (const [id, entry] of Object.entries(state.entries)) {
    if (!localPaths.has(entry.localPath)) continue; // already handled as delete

    if (entry.type === 'note') {
      // Check body changes
      let body = await readNoteBody(workspaceRoot, entry.localPath);

      // Transform local blobs/{blobId} paths → remote blob URLs for push
      if (body) {
        const markdownSvc = createMarkdownService();
        body = markdownSvc.transformImageUrls(body, (url) => {
          if (url.startsWith('blobs/')) {
            return `/api/content/${id}/blobs/${url.slice(6)}`;
          }
          return url;
        });
      }

      if (hasBodyChanged(state, id, body)) {
        const expectedRevision = entry.bodyUpdatedAt ?? '';
        changes.bodyUpdates.push({
          id,
          body: body ?? '',
          expectedRevision,
          localPath: entry.localPath,
        });
      }

      // Check for deck card changes
      const deckFiles = await listDeckFiles(workspaceRoot, entry.localPath);
      for (const df of deckFiles) {
        const deckLocalPath = path.join(entry.localPath, 'decks', df);
        const deckEntry = findEntryByPath(state, deckLocalPath);
        if (deckEntry && deckEntry.type === 'deck') {
          const deck = await readDeck(workspaceRoot, entry.localPath, df);
          if (deck) {
            const cardHash = computeCardHash(deck.cards);
            const deckSyncEntry = deckEntry as SyncEntry & {
              cardHash?: string;
              cardIds?: string[];
            };
            if (cardHash !== (deckSyncEntry.cardHash ?? '')) {
              changes.deckCardChanges.push({
                deckId: deckEntry.id,
                localPath: deckLocalPath,
                noteLocalPath: entry.localPath,
                deckName: deck.name,
                cards: deck.cards,
                prevCardIds: deckSyncEntry.cardIds ?? [],
                prevCardHash: deckSyncEntry.cardHash ?? '',
              });
            }
          }
        }
      }
    }

    // Check for rename (name mismatch with local directory name)
    if (entry.type === 'directory' || entry.type === 'note') {
      const dirName = path.basename(entry.localPath);
      const sanitized = sanitizeName(entry.name, entry.type as ContentType);
      if (dirName !== sanitized) {
        const newName = entry.type === 'note' ? unsanitizeName(dirName) : dirName;
        changes.renames.push({
          id,
          newName,
          localPath: entry.localPath,
        });
      }
    }
  }

  return changes;
}

async function syncDeckCards(api: ApiClient, change: DeckCardChange): Promise<void> {
  const prevIds = new Set(change.prevCardIds);
  const currentIds = new Set(change.cards.filter((c) => c.id !== null).map((c) => c.id!));

  // Create new cards (id: null)
  for (const card of change.cards) {
    if (card.id === null) {
      await api.createCard(change.deckId, {
        front: card.front,
        back: card.back,
      });
    }
  }

  // Update existing cards with changed front/back
  for (const card of change.cards) {
    if (card.id !== null && prevIds.has(card.id)) {
      // Check if front/back changed (we don't have prev values, so always update existing)
      await api.updateCard(change.deckId, card.id, {
        front: card.front,
        back: card.back,
      });
    }
  }

  // Delete removed cards
  for (const prevId of prevIds) {
    if (!currentIds.has(prevId)) {
      await api.deleteCard(change.deckId, prevId);
    }
  }
}
