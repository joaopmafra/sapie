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

interface NoteTask {
  id: string;
  localPath: string;
  name: string;
  parentId: string | null;
  updatedAt: string;
  bodyUpdatedAt: string | null;
}

interface NoteBodyResult extends NoteTask {
  body: string | null;
}

/**
 * Pull the entire content tree from Sapie and write to the local workspace.
 * Two-pass: BFS discovery (sequential) then parallel body downloads (concurrency-capped).
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

  // 3. First pass: BFS to discover all content, write folder structure and decks
  const noteTasks: NoteTask[] = [];

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

        // Defer body download — collect metadata only
        noteTasks.push({
          id: content.id,
          localPath,
          name: content.name,
          parentId: content.parentId,
          updatedAt: content.updatedAt,
          bodyUpdatedAt: content.body?.updatedAt ?? null,
        });

        // Fetch children (decks) — these are lightweight, do inline
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

  // 4. Second pass: download all note bodies in parallel batches
  const CONCURRENCY = 5;
  for (let i = 0; i < noteTasks.length; i += CONCURRENCY) {
    const batch = noteTasks.slice(i, i + CONCURRENCY);
    const bodyResults: NoteBodyResult[] = await Promise.all(
      batch.map(async (task): Promise<NoteBodyResult> => {
        let body: string | null = null;
        try {
          body = await api.getBody(task.id);
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

        return { ...task, body };
      })
    );

    // Write bodies sequentially within the batch (fs-safe)
    for (const task of bodyResults) {
      const bodyHash = task.body ? computeBodyHash(task.body) : null;
      const prevHash = prevState?.bodyHashByContentId[task.id];
      if (prevHash !== undefined && prevHash === bodyHash) {
        result.unchanged++;
      } else {
        result.created++;
      }

      await writeNoteBody(workspaceRoot, task.localPath, task.body);

      entries[task.id] = {
        id: task.id,
        type: 'note' as const,
        name: task.name,
        parentId: task.parentId,
        updatedAt: task.updatedAt,
        bodyUpdatedAt: task.bodyUpdatedAt,
        localPath: task.localPath,
      };
    }
  }

  // 5. Build and write state
  const state = createEmptyState(root.id);
  state.lastSyncAt = new Date().toISOString();
  state.entries = entries;

  // Populate body hashes from written files (skip notes with bodyUpdatedAt: null)
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.type === 'note' && entry.bodyUpdatedAt !== null) {
      const body = await readNoteBody(workspaceRoot, entry.localPath);
      if (body !== null) {
        state.bodyHashByContentId[id] = computeBodyHash(body);
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
