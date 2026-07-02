import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ApiClient } from '../../src/lib/api/api-client';
import { detectStatus, formatStatusOutput, StatusChange } from '../../src/lib/sync/status.service';
import { writeState, createEmptyState } from '../../src/lib/state/state.service';
import { computeBodyHash } from '../../src/lib/state/hashing';

const API_URL = 'http://localhost:19997';

describe('detectStatus', () => {
  let workspaceRoot: string;
  let api: ApiClient;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sapie-status-'));
    api = new ApiClient(API_URL);
  });

  afterEach(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  async function createDir(dirPath: string): Promise<void> {
    await fs.mkdir(path.join(workspaceRoot, dirPath), { recursive: true });
  }

  async function createFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(workspaceRoot, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  // S1: detects new note
  it('detects new note not in state', async () => {
    const state = createEmptyState('root-1');
    await writeState(workspaceRoot, state);

    await createDir('New Note.md');
    await createFile('New Note.md/index.md', '# Hello');

    const result = await detectStatus(api, workspaceRoot);
    const creates = result.changes.filter((c) => c.type === 'create');
    expect(creates.length).toBeGreaterThan(0);
    expect(creates.some((c) => c.localPath.includes('New Note.md'))).toBe(true);
  });

  // S2: detects modified body
  it('detects modified body when hash changed', async () => {
    const state = createEmptyState('root-1');
    const body = '# Original';
    state.bodyHashByContentId['note-1'] = computeBodyHash('# Different');
    state.entries['note-1'] = {
      id: 'note-1',
      type: 'note',
      name: 'MyNote',
      parentId: 'root-1',
      updatedAt: '2024-01-01T00:00:00.000Z',
      bodyUpdatedAt: '2024-01-01T00:00:00.000Z',
      localPath: 'MyNote.md',
    };
    await writeState(workspaceRoot, state);

    await createDir('MyNote.md');
    await createFile('MyNote.md/index.md', body);

    const result = await detectStatus(api, workspaceRoot);
    const modifies = result.changes.filter((c) => c.type === 'modify');
    expect(modifies.length).toBeGreaterThan(0);
    expect(modifies.some((c) => c.localPath === 'MyNote.md')).toBe(true);
  });

  // S3: detects rename
  it('detects rename when directory name differs from state', async () => {
    const state = createEmptyState('root-1');
    state.entries['note-1'] = {
      id: 'note-1',
      type: 'note',
      name: 'OldName',
      parentId: 'root-1',
      updatedAt: '2024-01-01T00:00:00.000Z',
      bodyUpdatedAt: '2024-01-01T00:00:00.000Z',
      localPath: 'NewName.md',
    };
    await writeState(workspaceRoot, state);

    await createDir('NewName.md');
    await createFile('NewName.md/index.md', '# content');

    const result = await detectStatus(api, workspaceRoot);
    const renames = result.changes.filter((c) => c.type === 'rename');
    expect(renames.length).toBeGreaterThan(0);
    // The rename is detected because the local dir name 'NewName.md' doesn't match the entry's sanitized name
    // sanitizeName('OldName', 'note') = 'OldName.md', but the directory is 'NewName.md'
  });

  // S5: detects deleted content
  it('detects deleted content still in state but not on disk', async () => {
    const state = createEmptyState('root-1');
    state.entries['note-1'] = {
      id: 'note-1',
      type: 'note',
      name: 'DeletedNote',
      parentId: 'root-1',
      updatedAt: '2024-01-01T00:00:00.000Z',
      bodyUpdatedAt: '2024-01-01T00:00:00.000Z',
      localPath: 'DeletedNote.md',
    };
    await writeState(workspaceRoot, state);

    // Don't create the directory on disk

    const result = await detectStatus(api, workspaceRoot);
    const deletes = result.changes.filter((c) => c.type === 'delete');
    expect(deletes.length).toBeGreaterThan(0);
    expect(deletes.some((c) => c.localPath === 'DeletedNote.md')).toBe(true);
  });

  // S7: empty workspace with no state
  it('returns empty changes when no state file exists', async () => {
    const result = await detectStatus(api, workspaceRoot);
    expect(result.changes.length).toBe(0);
  });

  // S8: no changes when workspace matches state
  it('returns no changes when workspace matches state', async () => {
    const state = createEmptyState('root-1');
    state.entries['note-1'] = {
      id: 'note-1',
      type: 'note',
      name: 'MyNote',
      parentId: 'root-1',
      updatedAt: '2024-01-01T00:00:00.000Z',
      bodyUpdatedAt: '2024-01-01T00:00:00.000Z',
      localPath: 'MyNote.md',
    };

    // Create the note on disk with matching content hash
    const body = '# unchanged';
    await createDir('MyNote.md');
    await createFile('MyNote.md/index.md', body);
    state.bodyHashByContentId['note-1'] = computeBodyHash(body);

    await writeState(workspaceRoot, state);

    const result = await detectStatus(api, workspaceRoot);
    expect(result.changes.length).toBe(0);
  });
});

describe('formatStatusOutput', () => {
  it('formats create, modify, delete, rename changes', () => {
    const changes: StatusChange[] = [
      { type: 'create', localPath: 'NewNote.md', detail: 'new note' },
      { type: 'modify', localPath: 'ExistingNote.md', detail: 'modified body' },
      { type: 'delete', localPath: 'OldNote.md', detail: 'deleted' },
      { type: 'rename', localPath: 'Renamed.md', detail: '→ OldName.md → Renamed.md (renamed)' },
    ];
    const output = formatStatusOutput({ changes });
    expect(output).toContain('+ NewNote.md');
    expect(output).toContain('~ ExistingNote.md');
    expect(output).toContain('- OldNote.md');
    expect(output).toContain('→ Renamed.md');
    expect(output).toContain('change');
  });

  it('reports no changes when empty', () => {
    const output = formatStatusOutput({ changes: [] });
    expect(output).toContain('No local changes');
  });

  it('includes deck card changes', () => {
    const changes: StatusChange[] = [
      {
        type: 'deck_cards',
        localPath: 'Note.md/decks/Ch1.json',
        detail: 'cards: +2 −1',
        cardChanges: { added: 2, removed: 1 },
      },
    ];
    const output = formatStatusOutput({ changes });
    expect(output).toContain('~ Note.md/decks/Ch1.json');
    expect(output).toContain('cards: +2 −1');
  });
});
