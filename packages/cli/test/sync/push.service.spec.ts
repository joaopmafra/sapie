import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

import { push } from '../../src/lib/sync/push.service';
import { ApiClient } from '../../src/lib/api/api-client';
import { ContentResponse, ContentType, CardResponse } from '../../src/lib/api/types';
import { SyncState, SyncEntry, LocalDeck, LocalCard } from '../../src/lib/state/sync-state';
import { computeBodyHash, computeCardHash } from '../../src/lib/state/hashing';

const API_BASE = 'http://localhost:19998';

// ── Helpers ──────────────────────────────────────────────────────────

function makeContentResponse(overrides: Partial<ContentResponse> = {}): ContentResponse {
  return {
    id: 'generated-id',
    name: 'Test',
    type: ContentType.NOTE,
    parentId: 'parent-id',
    ownerId: 'owner-1',
    body: {
      mimeType: 'text/markdown',
      size: 100,
      createdAt: '2024-06-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    },
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCardResponse(overrides: Partial<CardResponse> = {}): CardResponse {
  return {
    id: 'card-1',
    deckId: 'deck-1',
    ownerId: 'owner-1',
    front: 'Front',
    back: 'Back',
    dueDate: '2024-06-01T00:00:00.000Z',
    interval: 0,
    repetitions: 0,
    lastResult: null,
    lastStudied: null,
    correctCount: 0,
    incorrectCount: 0,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRootEntry(overrides: Partial<SyncEntry> = {}): SyncEntry {
  return {
    id: 'root-1',
    type: 'directory',
    name: 'My Contents',
    parentId: null,
    updatedAt: '2024-06-01T00:00:00.000Z',
    bodyUpdatedAt: null,
    localPath: 'My Contents',
    ...overrides,
  };
}

function makeNoteEntry(overrides: Partial<SyncEntry> = {}): SyncEntry {
  return {
    id: 'note-1',
    type: 'note',
    name: 'My Note',
    parentId: 'root-1',
    updatedAt: '2024-06-01T00:00:00.000Z',
    bodyUpdatedAt: '2024-06-01T00:00:00.000Z',
    localPath: 'My Contents/My Note.md',
    ...overrides,
  };
}

function makeDeckEntry(overrides: Partial<SyncEntry> = {}): SyncEntry {
  return {
    id: 'deck-1',
    type: 'deck',
    name: 'My Deck',
    parentId: 'note-1',
    updatedAt: '2024-06-01T00:00:00.000Z',
    bodyUpdatedAt: null,
    localPath: 'My Contents/My Note.md/decks/My Deck.json',
    ...overrides,
  };
}

async function createStateFile(workspaceRoot: string, state: SyncState): Promise<void> {
  const dir = path.join(workspaceRoot, '.sapie');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'state.json'), JSON.stringify(state, null, 2));
}

async function ensureDir(workspaceRoot: string, relativePath: string): Promise<void> {
  await fs.mkdir(path.join(workspaceRoot, relativePath), { recursive: true });
}

async function writeFile(
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  await ensureDir(workspaceRoot, path.dirname(relativePath));
  await fs.writeFile(path.join(workspaceRoot, relativePath), content);
}

async function readStateFile(workspaceRoot: string): Promise<SyncState> {
  const raw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
  return JSON.parse(raw) as SyncState;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('push', () => {
  let workspaceRoot: string;
  beforeAll(() => {
    nock.cleanAll();
  });
  let api: ApiClient;

  beforeEach(() => {
    workspaceRoot = path.join(
      os.tmpdir(),
      `sapie-push-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    api = new ApiClient(API_BASE);
  });

  afterEach(async () => {
    nock.cleanAll();
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  // ── Test 1: No state file ────────────────────────────────────────

  it('errors when no state file exists', async () => {
    await fs.mkdir(workspaceRoot, { recursive: true });

    const result = await push(api, workspaceRoot);

    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('No .sapie/state.json found');
  });

  // ── Test 2: Create new note ──────────────────────────────────────

  it('creates a new note via POST /content when not in state', async () => {
    const rootEntry = makeRootEntry();
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: {},
      entries: { [rootEntry.id]: rootEntry },
    };
    await createStateFile(workspaceRoot, state);

    const noteLocalPath = 'My Contents/New Note.md';
    await writeFile(workspaceRoot, `${noteLocalPath}/index.md`, '# Hello World');

    const createdResponse = makeContentResponse({
      id: 'new-note-id',
      name: 'New Note',
      type: ContentType.NOTE,
      parentId: 'root-1',
    });
    const scope = nock(API_BASE)
      .post('/content', { name: 'New Note', parentId: 'root-1', type: 'note' })
      .reply(201, createdResponse);

    const result = await push(api, workspaceRoot);

    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(scope.isDone()).toBe(true);

    const updatedState = await readStateFile(workspaceRoot);
    expect(updatedState.entries['new-note-id']).toBeDefined();
    expect(updatedState.entries['new-note-id'].name).toBe('New Note');
    expect(updatedState.entries['new-note-id'].localPath).toBe(noteLocalPath);
  });

  // ── Test 3: Modify note body ─────────────────────────────────────

  it('uploads body via PUT when hash differs from stored hash', async () => {
    const oldBody = '# Old Content';
    const newBody = '# New Content';
    const oldHash = computeBodyHash(oldBody);

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: oldHash },
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);

    await writeFile(workspaceRoot, `${noteEntry.localPath}/index.md`, newBody);

    const updatedResponse = makeContentResponse({
      id: noteEntry.id,
      name: noteEntry.name,
      type: ContentType.NOTE,
    });
    const scope = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, newBody)
      .query({ expectedRevision: noteEntry.bodyUpdatedAt })
      .reply(200, updatedResponse);

    const result = await push(api, workspaceRoot);

    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(scope.isDone()).toBe(true);

    const updatedState = await readStateFile(workspaceRoot);
    expect(updatedState.bodyHashByContentId[noteEntry.id]).toBe(computeBodyHash(newBody));
  });

  // ── Test 4: First body upload (bodyUpdatedAt null) ───────────────

  it('uploads body with empty expectedRevision when bodyUpdatedAt is null', async () => {
    const newBody = '# First Body';

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: null });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: {},
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);

    await writeFile(workspaceRoot, `${noteEntry.localPath}/index.md`, newBody);

    const updatedResponse = makeContentResponse({
      id: noteEntry.id,
      name: noteEntry.name,
    });
    const scope = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, newBody)
      .query({ expectedRevision: '' })
      .reply(200, updatedResponse);

    const result = await push(api, workspaceRoot);

    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(scope.isDone()).toBe(true);
  });

  // ── Test 5: Rename ───────────────────────────────────────────────

  it('renames content via PATCH when directory name differs from sanitized state name', async () => {
    const rootEntry = makeRootEntry();
    // State: name="Old Name" → sanitizeName("Old Name", note) = "Old Name.md"
    // Local: dir is "Renamed.md" → mismatch → rename detected
    const noteEntry = makeNoteEntry({
      name: 'Old Name',
      localPath: 'My Contents/Renamed.md',
    });

    const renameBody = '# rename content';
    const renameBodyHash = computeBodyHash(renameBody);

    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: renameBodyHash },
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);

    await writeFile(workspaceRoot, `${noteEntry.localPath}/index.md`, renameBody);

    const updatedResponse = makeContentResponse({
      id: noteEntry.id,
      name: 'Renamed',
      type: ContentType.NOTE,
    });
    const scope = nock(API_BASE)
      .patch(`/content/${noteEntry.id}`, { name: 'Renamed' })
      .reply(200, updatedResponse);

    const result = await push(api, workspaceRoot);

    expect(result.renamed).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(scope.isDone()).toBe(true);

    const updatedState = await readStateFile(workspaceRoot);
    expect(updatedState.entries[noteEntry.id].name).toBe('Renamed');
  });

  // ── Test 6: Delete ───────────────────────────────────────────────

  it('deletes content via DELETE when local path no longer exists', async () => {
    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry();
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: 'some-hash' },
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);

    // Only create root dir so walkLocalTree finds it but NOT the note
    await ensureDir(workspaceRoot, rootEntry.localPath);

    const scope = nock(API_BASE)
      .delete(`/content/${noteEntry.id}`)
      .query({ cascade: 'true' })
      .reply(204);

    const result = await push(api, workspaceRoot);

    expect(result.deleted).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(scope.isDone()).toBe(true);

    const updatedState = await readStateFile(workspaceRoot);
    expect(updatedState.entries[noteEntry.id]).toBeUndefined();
    expect(updatedState.bodyHashByContentId[noteEntry.id]).toBeUndefined();
  });

  // ── Test 7: Conflict 409 on body update ──────────────────────────

  it('increments conflict count on 409 response from body update', async () => {
    const oldBody = '# Old Content';
    const newBody = '# New Content';
    const oldHash = computeBodyHash(oldBody);

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: oldHash },
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);

    await writeFile(workspaceRoot, `${noteEntry.localPath}/index.md`, newBody);

    const scope = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, newBody)
      .query({ expectedRevision: noteEntry.bodyUpdatedAt })
      .reply(409, { title: 'Conflict', detail: 'Body was modified remotely' });

    const result = await push(api, workspaceRoot);

    expect(result.conflicts).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Conflict on');
    expect(result.errors[0]).toContain('run `sapie pull` to resolve');
    expect(scope.isDone()).toBe(true);
  });

  // ── Test 8: Sync deck card changes ───────────────────────────────

  it('syncs deck card changes: creates new, updates existing, deletes removed cards', async () => {
    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry();

    // Body must match stored hash to avoid body-update nock
    const noteBody = '# note body';
    const noteBodyHash = computeBodyHash(noteBody);

    const prevCards: LocalCard[] = [
      { id: 'card-keep', front: 'Keep Front', back: 'Keep Back' },
      { id: 'card-remove', front: 'Remove', back: 'Me' },
    ];
    const newCards: LocalCard[] = [
      { id: 'card-keep', front: 'Updated Front', back: 'Keep Back' },
      { id: null, front: 'New Card', back: 'New Back' },
    ];

    const prevHash = computeCardHash(prevCards);

    const deckEntry: SyncEntry = makeDeckEntry();

    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: noteBodyHash },
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
        [deckEntry.id]: {
          ...deckEntry,
          cardHash: prevHash,
          cardIds: ['card-keep', 'card-remove'],
        } as SyncEntry,
      },
    };
    await createStateFile(workspaceRoot, state);

    await writeFile(workspaceRoot, `${noteEntry.localPath}/index.md`, noteBody);

    const deckJson: LocalDeck = { name: 'My Deck', cards: newCards };
    await writeFile(
      workspaceRoot,
      `${noteEntry.localPath}/decks/My Deck.json`,
      JSON.stringify(deckJson, null, 2)
    );

    // Mock: create new card
    const nockCreate = nock(API_BASE)
      .post(`/content/${deckEntry.id}/cards`, { front: 'New Card', back: 'New Back' })
      .reply(201, makeCardResponse({ id: 'card-new', front: 'New Card', back: 'New Back' }));

    // Mock: update existing card
    const nockUpdate = nock(API_BASE)
      .patch(`/content/${deckEntry.id}/cards/card-keep`, {
        front: 'Updated Front',
        back: 'Keep Back',
      })
      .reply(200, makeCardResponse({ id: 'card-keep', front: 'Updated Front', back: 'Keep Back' }));

    // Mock: delete removed card
    const nockDelete = nock(API_BASE)
      .delete(`/content/${deckEntry.id}/cards/card-remove`)
      .reply(204);

    const result = await push(api, workspaceRoot);

    expect(result.deckCardsChanged).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(nockCreate.isDone()).toBe(true);
    expect(nockUpdate.isDone()).toBe(true);
    expect(nockDelete.isDone()).toBe(true);
  });

  // ── Test 9: Multiple operations combined ─────────────────────────

  it('handles create, update, delete, and rename in a single push', async () => {
    const oldBody = '# Old';
    const newBody = '# New';
    const oldHash = computeBodyHash(oldBody);

    const rootEntry = makeRootEntry();

    // note-to-update: body changed
    const updateEntry = makeNoteEntry({
      id: 'note-update',
      name: 'Update Note',
      localPath: 'My Contents/Update Note.md',
      bodyUpdatedAt: '2024-06-01T00:00:00.000Z',
    });

    // note-to-rename: name mismatch, body stable
    const renameBody = '# rename content';
    const renameBodyHash = computeBodyHash(renameBody);
    const renameEntry = makeNoteEntry({
      id: 'note-rename',
      name: 'Old Rename',
      localPath: 'My Contents/New Rename.md',
    });

    // note-to-delete: not on disk
    const deleteEntry = makeNoteEntry({
      id: 'note-delete',
      name: 'Delete Note',
      localPath: 'My Contents/Delete Note.md',
    });

    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: {
        [updateEntry.id]: oldHash,
        [renameEntry.id]: renameBodyHash,
      },
      entries: {
        [rootEntry.id]: rootEntry,
        [updateEntry.id]: updateEntry,
        [renameEntry.id]: renameEntry,
        [deleteEntry.id]: deleteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);

    // Create local files
    await writeFile(workspaceRoot, `${updateEntry.localPath}/index.md`, newBody);
    await writeFile(workspaceRoot, `${renameEntry.localPath}/index.md`, renameBody);
    await writeFile(workspaceRoot, 'My Contents/New Note.md/index.md', '# new note');
    // deleteEntry intentionally not created

    // Mock: body update
    const nockUpdate = nock(API_BASE)
      .put(`/content/${updateEntry.id}/body`, newBody)
      .query({ expectedRevision: updateEntry.bodyUpdatedAt })
      .reply(200, makeContentResponse({ id: updateEntry.id }));

    // Mock: rename
    const nockRename = nock(API_BASE)
      .patch(`/content/${renameEntry.id}`, { name: 'New Rename' })
      .reply(200, makeContentResponse({ id: renameEntry.id, name: 'New Rename' }));

    // Mock: create
    const nockCreate = nock(API_BASE)
      .post('/content', { name: 'New Note', parentId: rootEntry.id, type: 'note' })
      .reply(201, makeContentResponse({ id: 'new-id', name: 'New Note', parentId: rootEntry.id }));

    // Mock: delete
    const nockDelete = nock(API_BASE)
      .delete(`/content/${deleteEntry.id}`)
      .query({ cascade: 'true' })
      .reply(204);

    const result = await push(api, workspaceRoot);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.renamed).toBe(1);
    expect(result.deleted).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(nockUpdate.isDone()).toBe(true);
    expect(nockRename.isDone()).toBe(true);
    expect(nockCreate.isDone()).toBe(true);
    expect(nockDelete.isDone()).toBe(true);
  });
});
