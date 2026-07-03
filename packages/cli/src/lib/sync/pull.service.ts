import { ApiClient } from '../api/api-client';
import { CardResponse, ContentResponse, ContentType } from '../api/types';
import { LocalCard, LocalDeck, SyncEntry } from '../state/sync-state';
import { computeBlobHash, computeBodyHash, computeCardHash } from '../state/hashing';
import { createEmptyState, readState, writeState } from '../state/state.service';
import { createMarkdownService, parseBlobUrl } from '../markdown/markdown.service';
import {
  computeLocalPath,
  ensureFolder,
  readBlob,
  readNoteBody,
  writeBlob,
  writeDeck,
  writeNoteBody,
} from '../workspace/workspace.service';
import { contentTypeToExtension } from '../blob/content-type';
export interface PullResult {
  folders: number;
  notes: number;
  decks: number;
  created: number;
  unchanged: number;
  collisions: string[];
  blobs: number;
  blobsDownloaded: number;
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
  blobUpdates: Array<{ contentId: string; blobId: string; hash: string }>;
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
    blobs: 0,
    blobsDownloaded: 0,
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

  const CONCURRENCY = 5;
  const blobStateUpdates: Array<{ contentId: string; blobId: string; hash: string }> = [];

  for (let i = 0; i < noteTasks.length; i += CONCURRENCY) {
    const batch = noteTasks.slice(i, i + CONCURRENCY);
    const bodyResults: NoteBodyResult[] = await Promise.all(
      batch.map(async (task): Promise<NoteBodyResult> => {
        let body: string | null = null;
        const blobUpdates: Array<{ contentId: string; blobId: string; hash: string }> = [];
        // Track extensions for URL transform
        const blobExtByBlobId = new Map<string, string>();
        try {
          body = await api.getBody(task.id);
        } catch {
          // 404 → no body yet
        }

        if (body) {
          // Download blobs BEFORE transforming URLs (findBlobUrls matches /api/content/... patterns)
          const markdownSvc = createMarkdownService();
          const blobRefs = markdownSvc.findBlobUrls(body);
          result.blobs += blobRefs.length;

          for (const ref of blobRefs) {
            const prevHash = prevState?.blobHashByContentId[ref.contentId]?.[ref.blobId];
            try {
              const downloaded = await api.getBlob(ref.contentId, ref.blobId);
              if (downloaded) {
                const hash = computeBlobHash(downloaded.data);
                const ext = contentTypeToExtension(downloaded.contentType);
                blobExtByBlobId.set(ref.blobId, ext);
                if (hash !== prevHash) {
                  await writeBlob(workspaceRoot, task.localPath, ref.blobId, ext, downloaded.data);
                  result.blobsDownloaded++;
                  blobUpdates.push({
                    contentId: ref.contentId,
                    blobId: ref.blobId,
                    hash,
                  });
                } else if (prevHash !== undefined) {
                  // Unchanged blob — still need to write it (it may not exist locally)
                  // Extension already tracked via blobExtByBlobId
                }
              }
            } catch {
              // Blob download failed — skip, will retry on next pull
            }
          }

          // For unchanged blobs not downloaded this run, look up extension from disk
          if (prevState) {
            for (const ref of blobRefs) {
              if (!blobExtByBlobId.has(ref.blobId)) {
                const blobFile = await readBlob(workspaceRoot, task.localPath, ref.blobId);
                if (blobFile) {
                  blobExtByBlobId.set(ref.blobId, blobFile.ext);
                }
              }
            }
          }

          // Transform remote blob URLs → local blobs/{blobId}.{ext} paths
          body = markdownSvc.transformImageUrls(body, (url) => {
            const parsed = parseBlobUrl(url);
            if (parsed) {
              const ext = blobExtByBlobId.get(parsed.blobId) ?? '';
              return `blobs/${parsed.blobId}${ext}`;
            }
            return url;
          });
        }

        return { ...task, body, blobUpdates };
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
      blobStateUpdates.push(...task.blobUpdates);

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

  // Populate blob hashes from downloaded blobs
  for (const update of blobStateUpdates) {
    if (!state.blobHashByContentId[update.contentId]) {
      state.blobHashByContentId[update.contentId] = {};
    }
    state.blobHashByContentId[update.contentId][update.blobId] = update.hash;
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
