/**
 * Sync state types — persisted in .sapie/state.json.
 */

export interface SyncState {
  version: 1;
  lastSyncAt: string;
  rootId: string;
  bodyHashByContentId: Record<string, string>;
  /** SHA-256 of blob bytes keyed by contentId → blobId → hex digest. */
  blobHashByContentId: Record<string, Record<string, string>>;
  entries: Record<string, SyncEntry>;
}

export interface SyncEntry {
  id: string;
  type: 'directory' | 'note' | 'deck';
  name: string;
  parentId: string | null;
  updatedAt: string;
  bodyUpdatedAt: string | null;
  localPath: string;
}

export interface DeckSyncEntry extends SyncEntry {
  type: 'deck';
  cardIds: string[];
  cardHash: string;
}

/** Local deck JSON file format. */
export interface LocalDeck {
  name: string;
  cards: LocalCard[];
}

export interface LocalCard {
  id: string | null;
  front: string;
  back: string;
  dueDate?: string;
  interval?: number;
  repetitions?: number;
  lastResult?: 'know' | 'dont_know' | null;
  lastStudied?: string | null;
  correctCount?: number;
  incorrectCount?: number;
}
