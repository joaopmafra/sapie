import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { SyncEntry, SyncState } from '../../src/lib/state/sync-state';
import * as stateService from '../../src/lib/state/state.service';
import { computeBodyHash } from '../../src/lib/state/hashing';

function makeEntry(overrides: Partial<SyncEntry> = {}): SyncEntry {
  return {
    id: 'entry-1',
    type: 'note',
    name: 'test-note',
    parentId: 'root-1',
    updatedAt: new Date().toISOString(),
    bodyUpdatedAt: null,
    localPath: 'notes/test-note.md',
    ...overrides,
  };
}

function makeState(overrides: Partial<SyncState> = {}): SyncState {
  return {
    version: 1,
    lastSyncAt: new Date().toISOString(),
    rootId: 'root-1',
    bodyHashByContentId: {},
    blobHashByContentId: {},
    entries: {},
    ...overrides,
  };
}

async function tempWorkspace(): Promise<string> {
  const dir = path.join(
    os.tmpdir(),
    `sapie-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

describe('createEmptyState', () => {
  it('returns a valid SyncState with version=1, rootId set, empty entries', () => {
    const state = stateService.createEmptyState('root-xyz');

    expect(state.version).toBe(1);
    expect(state.rootId).toBe('root-xyz');
    expect(state.entries).toEqual({});
    expect(state.bodyHashByContentId).toEqual({});
    expect(state.lastSyncAt).toBeTruthy();
    // lastSyncAt must be a valid ISO date string
    expect(() => new Date(state.lastSyncAt)).not.toThrow();
    expect(new Date(state.lastSyncAt).getTime()).not.toBeNaN();
  });
});

describe('writeState / readState round-trip', () => {
  let ws: string;

  beforeEach(async () => {
    ws = await tempWorkspace();
  });

  afterEach(async () => {
    await fs.rm(ws, { recursive: true, force: true });
  });

  it('writes state and reads it back identically', async () => {
    const original = makeState({
      bodyHashByContentId: { c1: 'abc123' },
      blobHashByContentId: {},
      entries: {
        e1: makeEntry({ id: 'e1', name: 'notes', type: 'directory' }),
      },
    });

    await stateService.writeState(ws, original);
    const restored = await stateService.readState(ws);

    expect(restored).not.toBeNull();
    expect(restored!.version).toBe(original.version);
    expect(restored!.rootId).toBe(original.rootId);
    expect(restored!.bodyHashByContentId).toEqual(original.bodyHashByContentId);
    expect(restored!.entries).toEqual(original.entries);
  });

  it('returns null for non-existent state file', async () => {
    const result = await stateService.readState(ws);
    expect(result).toBeNull();
  });

  it('returns null for corrupted JSON', async () => {
    // Write invalid JSON manually into the state file location
    const stateDir = path.join(ws, '.sapie');
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, 'state.json'), 'not json {{{');

    const result = await stateService.readState(ws);
    expect(result).toBeNull();
  });

  it('returns null for wrong version', async () => {
    const stateDir = path.join(ws, '.sapie');
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      path.join(stateDir, 'state.json'),
      JSON.stringify({
        version: 99,
        rootId: 'x',
        entries: {},
        bodyHashByContentId: {},
        lastSyncAt: new Date().toISOString(),
      })
    );

    const result = await stateService.readState(ws);
    expect(result).toBeNull();
  });

  it('returns null when rootId is missing', async () => {
    const stateDir = path.join(ws, '.sapie');
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      path.join(stateDir, 'state.json'),
      JSON.stringify({
        version: 1,
        entries: {},
        bodyHashByContentId: {},
        lastSyncAt: new Date().toISOString(),
      })
    );

    const result = await stateService.readState(ws);
    expect(result).toBeNull();
  });
});

describe('hasBodyChanged', () => {
  it('returns false when state has no hash and local body is null', () => {
    const state = makeState();
    expect(stateService.hasBodyChanged(state, 'c1', null)).toBe(false);
  });

  it('returns true when state has a hash but local body is null', () => {
    const state = makeState({ bodyHashByContentId: { c1: 'abc' } });
    expect(stateService.hasBodyChanged(state, 'c1', null)).toBe(true);
  });

  it('returns false when body hash matches', () => {
    const body = '# Hello';
    const hash = computeBodyHash(body);

    const state = makeState({ bodyHashByContentId: { c1: hash } });
    expect(stateService.hasBodyChanged(state, 'c1', body)).toBe(false);
  });

  it('returns true when body hash differs', () => {
    const state = makeState({ bodyHashByContentId: { c1: 'old-hash' } });
    expect(stateService.hasBodyChanged(state, 'c1', '# New body')).toBe(true);
  });

  it('returns true for first-time body upload (state has no hash, local has body)', () => {
    const state = makeState();
    expect(stateService.hasBodyChanged(state, 'c1', '# New content')).toBe(true);
  });
});

describe('updateBodyHash', () => {
  it('adds hash for new content', () => {
    const state = makeState();
    stateService.updateBodyHash(state, 'c1', '# Some body');

    expect(state.bodyHashByContentId['c1']).toBeDefined();
    expect(typeof state.bodyHashByContentId['c1']).toBe('string');
    expect(state.bodyHashByContentId['c1'].length).toBe(64); // SHA-256 hex
  });

  it('updates hash for changed content', () => {
    const state = makeState();
    stateService.updateBodyHash(state, 'c1', '# First');
    const firstHash = state.bodyHashByContentId['c1'];

    stateService.updateBodyHash(state, 'c1', '# Second');
    const secondHash = state.bodyHashByContentId['c1'];

    expect(firstHash).not.toBe(secondHash);
  });

  it('removes hash when body is null', () => {
    const state = makeState();
    stateService.updateBodyHash(state, 'c1', '# Body');
    expect('c1' in state.bodyHashByContentId).toBe(true);

    stateService.updateBodyHash(state, 'c1', null);
    expect('c1' in state.bodyHashByContentId).toBe(false);
  });

  it('produces consistent hash for the same content', () => {
    const stateA = makeState();
    const stateB = makeState();

    stateService.updateBodyHash(stateA, 'c1', '# Same');
    stateService.updateBodyHash(stateB, 'c1', '# Same');

    expect(stateA.bodyHashByContentId['c1']).toBe(stateB.bodyHashByContentId['c1']);
  });
});

describe('findEntryByPath', () => {
  it('finds entry by exact path', () => {
    const entry = makeEntry({ id: 'e1', localPath: 'notes/todo.md' });
    const state = makeState({ entries: { e1: entry } });

    const found = stateService.findEntryByPath(state, 'notes/todo.md');
    expect(found).toEqual(entry);
  });

  it('returns null for missing path', () => {
    const state = makeState({
      entries: { e1: makeEntry({ id: 'e1', localPath: 'notes/exists.md' }) },
    });

    expect(stateService.findEntryByPath(state, 'notes/nowhere.md')).toBeNull();
  });

  it('returns null when entries are empty', () => {
    const state = makeState();
    expect(stateService.findEntryByPath(state, 'anything')).toBeNull();
  });

  it('matches paths exactly (not as substring)', () => {
    const state = makeState({
      entries: { e1: makeEntry({ id: 'e1', localPath: 'notes/file.md' }) },
    });

    // 'notes/file' is a prefix but not the exact path
    expect(stateService.findEntryByPath(state, 'notes/file')).toBeNull();
  });
});

describe('findPathById', () => {
  it('returns localPath for known id', () => {
    const state = makeState({
      entries: { e1: makeEntry({ id: 'e1', localPath: 'notes/special.md' }) },
    });

    expect(stateService.findPathById(state, 'e1')).toBe('notes/special.md');
  });

  it('returns null for unknown id', () => {
    const state = makeState({
      entries: { e1: makeEntry({ id: 'e1', localPath: 'notes/known.md' }) },
    });

    expect(stateService.findPathById(state, 'unknown-id')).toBeNull();
  });

  it('returns null when entries are empty', () => {
    const state = makeState();
    expect(stateService.findPathById(state, 'e1')).toBeNull();
  });
});
