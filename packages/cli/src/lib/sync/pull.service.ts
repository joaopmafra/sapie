import { ApiClient } from '../api/api-client';
import { CardResponse, ContentResponse, ContentType } from '../api/types';
import { LocalCard, LocalDeck, SyncEntry } from '../state/sync-state';
import { computeBodyHash, computeCardHash } from '../state/hashing';
import { createEmptyState, readState, writeState } from '../state/state.service';
import { createMarkdownService, parseBlobUrl } from '../markdown/markdown.service';
import {
  computeLocalPath,
  ensureFolder,
  readNoteBody,
  writeDeck,
  writeNoteBody,
} from '../workspace/workspace.service';

export interface PullResult {
  folders: number;
  notes: number;
  decks: number;
  created: number;
  unchanged: number;
  collisions: string[];
}

/**
 * Pull the entire content tree from Sapie and write to the local workspace.
 */
export async function pull(api: ApiClient, workspaceRoot: string): Promise<PullResult> {
  const result: PullResult = {
    folders: 0,
    notes: 0,
    decks: 0,
    created: 0,
    unchanged: 0,
    collisions: [],
  };

  // 1. Get root
  const root = await api.getRoot();
  const rootLocalName = 'My Contents';
  const rootLocalPath = rootLocalName;

  const entries: Record<string, SyncEntry> = {};

  // 2. Load existing state
  const prevState = await readState(workspaceRoot);

  // 3. Recursively walk the tree (BFS)
  const queue: Array<{ content: ContentResponse; localPath: string }> = [
    { content: root, localPath: rootLocalPath },
  ];

  while (queue.length > 0) {
    const { content, localPath } = queue.shift()!;

    switch (content.type) {
      case ContentType.DIRECTORY: {
        result.folders++;
        await ensureFolder(workspaceRoot, localPath);

        entries[content.id] = {
          id: content.id,
          type: 'directory',
          name: content.name,
          parentId: content.parentId,
          updatedAt: content.updatedAt,
          bodyUpdatedAt: null,
          localPath,
        };

        const children = await api.listChildren(content.id);
        for (const child of children) {
          queue.push({
            content: child,
            localPath: computeLocalPath(localPath, child.name, child.type),
          });
        }
        break;
      }

      case ContentType.NOTE: {
        result.notes++;

        // Fetch body
        let body: string | null = null;
        try {
          body = await api.getBody(content.id);
        } catch {
          // 404 → no body yet
        }

        // Transform remote blob URLs → local blobs/{blobId} paths
        if (body) {
          const markdownSvc = createMarkdownService();
          body = markdownSvc.transformImageUrls(body, (url) => {
            const parsed = parseBlobUrl(url);
            if (parsed) return `blobs/${parsed.blobId}`;
            return url;
          });
        }
        // Check if unchanged
        const bodyHash = body ? computeBodyHash(body) : null;
        const prevHash = prevState?.bodyHashByContentId[content.id];
        if (prevHash !== undefined && prevHash === bodyHash) {
          result.unchanged++;
        } else {
          result.created++;
        }

        await writeNoteBody(workspaceRoot, localPath, body);

        entries[content.id] = {
          id: content.id,
          type: 'note',
          name: content.name,
          parentId: content.parentId,
          updatedAt: content.updatedAt,
          bodyUpdatedAt: content.body?.updatedAt ?? null,
          localPath,
        };

        // Fetch children (decks)
        const children = await api.listChildren(content.id);
        for (const child of children) {
          if (child.type === ContentType.DECK) {
            result.decks++;
            const cards = await api.getCards(child.id);
            const localCards: LocalCard[] = cards.map(toLocalCard);
            const localDeck: LocalDeck = { name: child.name, cards: localCards };

            await writeDeck(workspaceRoot, localPath, localDeck);

            const cardIds = localCards.map((c) => c.id!).filter(Boolean);
            entries[child.id] = {
              id: child.id,
              type: 'deck',
              name: child.name,
              parentId: content.id,
              updatedAt: child.updatedAt,
              bodyUpdatedAt: null,
              localPath,
              cardIds,
              cardHash: computeCardHash(localCards),
            } as SyncEntry;
          }
        }
        break;
      }

      case ContentType.DECK:
        // Decks only appear as children of notes; skip root-level decks
        break;
    }
  }

  // 4. Build and write state
  const state = createEmptyState(root.id);
  state.lastSyncAt = new Date().toISOString();
  state.entries = entries;

  // Populate body hashes from written files (skip notes with bodyUpdatedAt: null — they had no body)
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.type === 'note') {
      if (entry.bodyUpdatedAt !== null) {
        const writtenBody = await readNoteBody(workspaceRoot, entry.localPath);
        if (writtenBody !== null) {
          state.bodyHashByContentId[id] = computeBodyHash(writtenBody);
        }
      }
    }
  }

  await writeState(workspaceRoot, state);
  return result;
}

function toLocalCard(card: CardResponse): LocalCard {
  return {
    id: card.id,
    front: card.front,
    back: card.back,
    dueDate: card.dueDate,
    interval: card.interval,
    repetitions: card.repetitions,
    lastResult: card.lastResult,
    lastStudied: card.lastStudied,
    correctCount: card.correctCount,
    incorrectCount: card.incorrectCount,
  };
}
