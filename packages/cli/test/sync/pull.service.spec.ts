import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

import { pull } from '../../src/lib/sync/pull.service';
import { ApiClient } from '../../src/lib/api/api-client';
import { ContentResponse, ContentType, CardResponse } from '../../src/lib/api/types';

const API_URL = 'http://localhost:19999';
const now = '2024-06-01T00:00:00.000Z';

function makeContent(overrides: Partial<ContentResponse> = {}): ContentResponse {
  return {
    id: 'entry-1',
    name: 'Test',
    type: ContentType.NOTE,
    parentId: 'parent-1',
    ownerId: 'owner-1',
    body: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCard(overrides: Partial<CardResponse> & { id: string }): CardResponse {
  return {
    deckId: 'deck-1',
    ownerId: 'owner-1',
    front: 'Front',
    back: 'Back',
    dueDate: now,
    interval: 0,
    repetitions: 0,
    lastResult: null,
    lastStudied: null,
    correctCount: 0,
    incorrectCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('pull', () => {
  let api: ApiClient;
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = path.join(
      os.tmpdir(),
      `sapie-pull-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fs.mkdir(workspaceRoot, { recursive: true });
    api = new ApiClient(API_URL);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    // Clean up any leftover workspace dirs
    const tmpDir = os.tmpdir();
    const entries = await fs.readdir(tmpDir);
    for (const entry of entries) {
      if (entry.startsWith('sapie-pull-test-')) {
        await fs.rm(path.join(tmpDir, entry), { recursive: true, force: true });
      }
    }
  });

  // ── Test 1: empty root ──
  it('pulls an empty root: creates root dir and state with root entry', async () => {
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });

    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, []);

    const result = await pull(api, workspaceRoot);

    expect(result.folders).toBe(1);
    expect(result.notes).toBe(0);
    expect(result.decks).toBe(0);

    // Verify root dir exists
    const rootPath = path.join(workspaceRoot, 'My Contents');
    const stat = await fs.stat(rootPath);
    expect(stat.isDirectory()).toBe(true);

    // Verify state.json was written
    const stateRaw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.version).toBe(1);
    expect(state.rootId).toBe('root-1');
    expect(state.entries['root-1']).toBeDefined();
    expect(state.entries['root-1'].name).toBe('Root');
  });

  // ── Test 2: nested folders ──
  it('pulls nested folders: creates full directory structure', async () => {
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const folderA = makeContent({
      id: 'folder-a',
      name: 'FolderA',
      type: ContentType.DIRECTORY,
      parentId: 'root-1',
    });
    const folderB = makeContent({
      id: 'folder-b',
      name: 'FolderB',
      type: ContentType.DIRECTORY,
      parentId: 'folder-a',
    });

    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [folderA]);
    nock(API_URL).get('/content/folder-a/children').reply(200, [folderB]);
    nock(API_URL).get('/content/folder-b/children').reply(200, []);

    const result = await pull(api, workspaceRoot);

    expect(result.folders).toBe(3);

    // Verify directory structure
    const rootPath = path.join(workspaceRoot, 'My Contents');
    expect((await fs.stat(rootPath)).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(rootPath, 'FolderA'))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(rootPath, 'FolderA', 'FolderB'))).isDirectory()).toBe(true);

    // Verify state entries
    const stateRaw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.entries['folder-a']).toBeDefined();
    expect(state.entries['folder-b']).toBeDefined();
  });

  // ── Test 3: note with body ──
  it('pulls a note with body: writes index.md and records hash', async () => {
    const bodyText = '# Hello World';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'My Note',
      type: ContentType.NOTE,
      parentId: 'root-1',
      body: { mimeType: 'text/markdown', size: bodyText.length, createdAt: now, updatedAt: now },
    });

    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL)
      .get('/content/note-1/body')
      .reply(200, bodyText, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, []);

    const result = await pull(api, workspaceRoot);

    expect(result.notes).toBe(1);
    expect(result.created).toBe(1);

    // Verify note directory and index.md
    const noteDir = path.join(workspaceRoot, 'My Contents', 'My Note.md');
    expect((await fs.stat(noteDir)).isDirectory()).toBe(true);
    const written = await fs.readFile(path.join(noteDir, 'index.md'), 'utf-8');
    expect(written).toBe(bodyText);

    // Verify state has body hash
    const stateRaw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.bodyHashByContentId['note-1']).toBeDefined();
    expect(typeof state.bodyHashByContentId['note-1']).toBe('string');
  });

  // ── Test 4: note with no body (404) ──
  it('pulls a note with no body (404): writes empty index.md, bodyUpdatedAt null', async () => {
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Empty Note',
      type: ContentType.NOTE,
      parentId: 'root-1',
      body: null,
    });

    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL).get('/content/note-1/body').reply(404, { title: 'Not Found', status: 404 });
    nock(API_URL).get('/content/note-1/children').reply(200, []);

    const result = await pull(api, workspaceRoot);

    expect(result.notes).toBe(1);

    const noteDir = path.join(workspaceRoot, 'My Contents', 'Empty Note.md');
    const written = await fs.readFile(path.join(noteDir, 'index.md'), 'utf-8');
    expect(written).toBe('');

    const stateRaw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.entries['note-1'].bodyUpdatedAt).toBeNull();
    // Notes with no body should not have a hash entry
    expect(state.bodyHashByContentId['note-1']).toBeUndefined();
  });

  // ── Test 5: note with deck child ──
  it('pulls decks: writes deck JSON and populates cards', async () => {
    const bodyText = '# Note with deck';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Note With Deck',
      type: ContentType.NOTE,
      parentId: 'root-1',
      body: { mimeType: 'text/markdown', size: bodyText.length, createdAt: now, updatedAt: now },
    });
    const deck = makeContent({
      id: 'deck-1',
      name: 'My Deck',
      type: ContentType.DECK,
      parentId: 'note-1',
    });
    const card1 = makeCard({ id: 'card-1', front: 'Q1', back: 'A1' });
    const card2 = makeCard({ id: 'card-2', front: 'Q2', back: 'A2' });

    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL)
      .get('/content/note-1/body')
      .reply(200, bodyText, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, [deck]);
    nock(API_URL).get('/content/deck-1/cards').reply(200, [card1, card2]);

    const result = await pull(api, workspaceRoot);

    expect(result.notes).toBe(1);
    expect(result.decks).toBe(1);

    // Verify deck JSON file
    const deckPath = path.join(
      workspaceRoot,
      'My Contents',
      'Note With Deck.md',
      'decks',
      'My Deck.json'
    );
    const deckRaw = await fs.readFile(deckPath, 'utf-8');
    const deckJson = JSON.parse(deckRaw);
    expect(deckJson.name).toBe('My Deck');
    expect(deckJson.cards).toHaveLength(2);
    expect(deckJson.cards[0].front).toBe('Q1');
    expect(deckJson.cards[1].back).toBe('A2');
  });

  // ── Test 6: second pull unchanged ──
  it('second pull unchanged: body hash matches → unchanged count increments', async () => {
    const bodyText = '# Unchanged';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Stable Note',
      type: ContentType.NOTE,
      parentId: 'root-1',
      body: { mimeType: 'text/markdown', size: bodyText.length, createdAt: now, updatedAt: now },
    });

    // First pull
    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL)
      .get('/content/note-1/body')
      .reply(200, bodyText, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, []);

    await pull(api, workspaceRoot);

    // Second pull — same data
    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL)
      .get('/content/note-1/body')
      .reply(200, bodyText, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, []);

    const result = await pull(api, workspaceRoot);

    expect(result.notes).toBe(1);
    expect(result.created).toBe(0);
    expect(result.unchanged).toBe(1);
  });

  // ── Test 7: second pull body changed ──
  it('second pull body changed: body hash differs → created count increments', async () => {
    const oldBody = '# Old';
    const newBody = '# New Content';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Changing Note',
      type: ContentType.NOTE,
      parentId: 'root-1',
      body: { mimeType: 'text/markdown', size: oldBody.length, createdAt: now, updatedAt: now },
    });

    // First pull
    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL).get('/content/note-1/body').reply(200, oldBody, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, []);

    await pull(api, workspaceRoot);

    // Second pull — body changed
    const updatedNote = { ...note, body: { ...note.body!, updatedAt: '2024-06-02T00:00:00.000Z' } };
    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [updatedNote]);
    nock(API_URL).get('/content/note-1/body').reply(200, newBody, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, []);

    const result = await pull(api, workspaceRoot);

    expect(result.notes).toBe(1);
    expect(result.created).toBe(1);
    expect(result.unchanged).toBe(0);

    // Verify new body written
    const written = await fs.readFile(
      path.join(workspaceRoot, 'My Contents', 'Changing Note.md', 'index.md'),
      'utf-8'
    );
    expect(written).toBe(newBody);
  });
});
