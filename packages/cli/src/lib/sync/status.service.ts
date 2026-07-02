import * as path from 'path';
import { ApiClient } from '../api/api-client';
import { ContentType } from '../api/types';
import { computeCardHash } from '../state/hashing';
import { findEntryByPath, hasBodyChanged, readState } from '../state/state.service';
import { DeckSyncEntry } from '../state/sync-state';
import {
  listDeckFiles,
  readDeck,
  readNoteBody,
  sanitizeName,
  unsanitizeName,
  walkLocalTree,
} from '../workspace/workspace.service';

/** A single detected change for status reporting. */
export interface StatusChange {
  type: 'create' | 'modify' | 'rename' | 'move' | 'delete' | 'conflict' | 'deck_cards';
  localPath: string;
  detail?: string;
  cardChanges?: {
    added: number;
    removed: number;
  };
}

/** Result of status detection. */
export interface StatusResult {
  changes: StatusChange[];
}

/**
 * Detect local changes without making API calls.
 * Compares the local filesystem tree against .sapie/state.json.
 */
export async function detectStatus(_api: ApiClient, workspaceRoot: string): Promise<StatusResult> {
  const changes: StatusChange[] = [];

  const state = await readState(workspaceRoot);
  if (!state) {
    // No state yet — everything on disk is a create
    const localTree = await walkLocalTree(workspaceRoot);
    for (const item of localTree) {
      // Skip deck files when reporting creates — they'll be covered when the parent note is created
      if (item.localPath.includes('/decks/') && item.localPath.endsWith('.json')) continue;
      changes.push({
        type: 'create',
        localPath: item.localPath,
        detail: item.isNote ? 'new note' : 'new folder',
      });
    }
    return { changes };
  }

  const localTree = await walkLocalTree(workspaceRoot);
  const localPaths = new Set(localTree.map((t) => t.localPath));

  // Track which local items get matched (for later create detection)
  const matchedLocalPaths = new Set<string>();

  // Build a lookup of state entries by id
  const stateEntries = Object.entries(state.entries);

  // --- First pass: detect deletes, renames, moves, body changes, deck changes ---

  for (const [id, entry] of stateEntries) {
    if (localPaths.has(entry.localPath)) {
      // Entry still at same path — check for body changes, renames, deck changes
      matchedLocalPaths.add(entry.localPath);

      if (entry.type === 'note') {
        // Check body changes
        const body = await readNoteBody(workspaceRoot, entry.localPath);
        if (hasBodyChanged(state, id, body)) {
          changes.push({
            type: 'modify',
            localPath: entry.localPath,
            detail: 'modified body',
          });
        }

        // Check deck card changes
        const deckFiles = await listDeckFiles(workspaceRoot, entry.localPath);
        for (const df of deckFiles) {
          const deckLocalPath = path.join(entry.localPath, 'decks', df);
          matchedLocalPaths.add(deckLocalPath);

          const deckEntry = findEntryByPath(state, deckLocalPath);
          if (deckEntry && deckEntry.type === 'deck') {
            const deck = await readDeck(workspaceRoot, entry.localPath, df);
            if (deck) {
              const cardHash = computeCardHash(deck.cards);
              const deckSyncEntry = deckEntry as DeckSyncEntry;
              if (cardHash !== (deckSyncEntry.cardHash ?? '')) {
                // Compute added/removed counts
                const prevIds = new Set(deckSyncEntry.cardIds ?? []);
                const currIds = new Set(deck.cards.filter((c) => c.id !== null).map((c) => c.id!));
                const added = deck.cards.filter((c) => c.id === null).length;
                const removed = [...prevIds].filter((pid) => !currIds.has(pid)).length;

                changes.push({
                  type: 'deck_cards',
                  localPath: deckLocalPath,
                  cardChanges: { added, removed },
                });
              }
            }
          } else if (!deckEntry) {
            // New deck file in an existing note
            changes.push({
              type: 'create',
              localPath: deckLocalPath,
              detail: 'new deck',
            });
          }
        }
      }

      // Check for rename (name mismatch between local dir name and sanitized entry name)
      if (entry.type === 'directory' || entry.type === 'note') {
        const dirName = path.basename(entry.localPath);
        const sanitized = sanitizeName(entry.name, entry.type as ContentType);
        if (dirName !== sanitized) {
          const newName = entry.type === 'note' ? unsanitizeName(dirName) : dirName;
          changes.push({
            type: 'rename',
            localPath: entry.localPath,
            detail: `→ ${newName}`,
          });
        }
      }
    }
  }

  // --- Second pass: for state entries whose path is gone, detect move vs delete ---

  // Build a map: localPath → localTree item for unmatched local paths
  const unmatchedLocalItems = new Map<
    string,
    { localPath: string; isNote: boolean; basename: string }
  >();
  for (const item of localTree) {
    if (!matchedLocalPaths.has(item.localPath)) {
      unmatchedLocalItems.set(item.localPath, {
        localPath: item.localPath,
        isNote: item.isNote,
        basename: item.isNote
          ? unsanitizeName(path.basename(item.localPath))
          : path.basename(item.localPath),
      });
    }
  }

  for (const [, entry] of stateEntries) {
    if (localPaths.has(entry.localPath)) continue; // already handled

    // Try to find a move destination: an unmatched local item with matching name and type
    let moveTarget: string | null = null;

    for (const [locPath, item] of unmatchedLocalItems) {
      // Skip deck files for move matching
      if (locPath.includes('/decks/') && locPath.endsWith('.json')) continue;

      const entryTypeMatches =
        (entry.type === 'note' && item.isNote) || (entry.type === 'directory' && !item.isNote);

      if (!entryTypeMatches) continue;

      // Match by name. For notes, compare unsanitized dir name to entry name.
      // For directories, compare basename to entry name.
      const localName = item.isNote
        ? unsanitizeName(path.basename(locPath))
        : path.basename(locPath);

      if (localName === entry.name) {
        moveTarget = locPath;
        break;
      }
    }

    if (moveTarget) {
      // Found a move — the entry was moved to a new parent
      const newParent = path.dirname(moveTarget);
      changes.push({
        type: 'move',
        localPath: entry.localPath,
        detail: `→ ${newParent === '.' ? '/' : newParent}/`,
      });

      // Mark the target as matched so it won't appear as a create
      matchedLocalPaths.add(moveTarget);
      unmatchedLocalItems.delete(moveTarget);

      // Also check for body changes at the new location for notes
      if (entry.type === 'note') {
        const body = await readNoteBody(workspaceRoot, moveTarget);
        if (hasBodyChanged(state, entry.id, body)) {
          changes.push({
            type: 'modify',
            localPath: moveTarget,
            detail: 'modified body',
          });
        }
      }
    } else {
      // No move target found → it's a delete
      changes.push({
        type: 'delete',
        localPath: entry.localPath,
      });
    }
  }

  // --- Third pass: detect creates for unmatched local items ---
  for (const item of localTree) {
    if (matchedLocalPaths.has(item.localPath)) continue;

    // Skip orphan deck files (they'll be created when the parent note is created)
    if (item.localPath.includes('/decks/') && item.localPath.endsWith('.json')) continue;

    const parentPath = path.dirname(item.localPath);
    // Only report as create if parent exists (in state or also being created)
    // or if parent is root ('.' or '' or '/')
    const parentInState =
      parentPath === '.' ||
      parentPath === '' ||
      parentPath === '/' ||
      findEntryByPath(state, parentPath) !== null ||
      matchedLocalPaths.has(parentPath);

    if (parentInState) {
      changes.push({
        type: 'create',
        localPath: item.localPath,
        detail: item.isNote ? 'new note' : 'new folder',
      });
      matchedLocalPaths.add(item.localPath);
    }
  }

  return { changes };
}

/**
 * Format status detection results into a human-readable string.
 */
export function formatStatusOutput(result: StatusResult): string {
  if (result.changes.length === 0) {
    return 'No local changes. Workspace is in sync.';
  }

  const lines: string[] = ['Changes to push:'];

  for (const change of result.changes) {
    switch (change.type) {
      case 'create':
        lines.push(`  + ${change.localPath} (${change.detail ?? 'new'})`);
        break;
      case 'modify':
        lines.push(`  ~ ${change.localPath} (${change.detail ?? 'modified body'})`);
        break;
      case 'rename':
        lines.push(`  → ${change.localPath} ${change.detail ?? ''} (renamed)`.trimEnd());
        break;
      case 'move':
        lines.push(`  → ${change.localPath} ${change.detail ?? ''} (moved)`.trimEnd());
        break;
      case 'delete':
        lines.push(`  - ${change.localPath} (deleted)`);
        break;
      case 'deck_cards': {
        const cc = change.cardChanges;
        const parts: string[] = [];
        if (cc) {
          if (cc.added > 0) parts.push(`+${cc.added}`);
          if (cc.removed > 0) parts.push(`−${cc.removed}`);
        }
        const detail = parts.length > 0 ? ` (cards: ${parts.join(' ')})` : ' (cards changed)';
        lines.push(`  ~ ${change.localPath}${detail}`);
        break;
      }
      case 'conflict':
        lines.push(`  ⚠ ${change.localPath} (conflict)`);
        break;
    }
  }

  lines.push('');
  lines.push(`${result.changes.length} change(s) — run \`sapie push\` to apply.`);

  return lines.join('\n');
}
