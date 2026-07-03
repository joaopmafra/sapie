import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

import { push } from '../../src/lib/sync/push.service';
import { ApiClient } from '../../src/lib/api/api-client';
import { ContentResponse, ContentType } from '../../src/lib/api/types';
import { SyncState, SyncEntry } from '../../src/lib/state/sync-state';
import { computeBodyHash, computeBlobHash } from '../../src/lib/state/hashing';

const API_BASE = 'http://localhost:19999';

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
  content: string | Buffer
): Promise<void> {
  const dir = path.dirname(relativePath);
  await ensureDir(workspaceRoot, dir);
  await fs.writeFile(path.join(workspaceRoot, relativePath), content);
}

async function readStateFile(workspaceRoot: string): Promise<SyncState> {
  const raw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
  return JSON.parse(raw) as SyncState;
}

/** Create a note: ensure directory + write index.md. */
async function createNote(workspaceRoot: string, localPath: string, body: string): Promise<void> {
  await writeFile(workspaceRoot, `${localPath}/index.md`, body);
}

// ── Tests ────────────────────────────────────────────────────────────

describe('push blobs', () => {
  let workspaceRoot: string;
  beforeAll(() => {
    nock.cleanAll();
  });
  let api: ApiClient;

  /** Mock the lock endpoints to simulate API not supporting locks (Phase 3 compat). */
  function nockNoLock(): void {
    nock(API_BASE).post('/sync/lock').reply(404);
    nock(API_BASE).delete('/sync/lock').query(true).reply(204);
  }

  beforeEach(() => {
    workspaceRoot = path.join(
      os.tmpdir(),
      `sapie-push-blobs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    api = new ApiClient(API_BASE);
    nockNoLock();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ── Test 1: Push with new local blob ───────────────────────────

  it('uploads new local blob, remaps blobId, and updates body URL', async () => {
    const blobData = Buffer.from('fake png data');
    const oldBody = '# Hello';
    const newBody = '# Hello\n![img](blobs/local-1)';

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: computeBodyHash(oldBody) },
      blobHashByContentId: {},
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);
    await createNote(workspaceRoot, noteEntry.localPath, newBody);
    await writeFile(workspaceRoot, `${noteEntry.localPath}/blobs/local-1.png`, blobData);

    // Mock blob upload — API returns different blobId
    const nockBlob = nock(API_BASE)
      .post(`/content/${noteEntry.id}/blobs`, blobData)
      .reply(201, { blobId: 'new-id', url: `/api/content/${noteEntry.id}/blobs/new-id` });

    // Mock body update — body must have remapped URL
    const expectedBody = '# Hello\n![img](/api/content/note-1/blobs/new-id)';
    const nockBody = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, expectedBody)
      .query({ expectedRevision: noteEntry.bodyUpdatedAt })
      .reply(200, makeContentResponse({ id: noteEntry.id }));

    const result = await push(api, workspaceRoot);

    expect(result.blobsUploaded).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(nockBlob.isDone()).toBe(true);
    expect(nockBody.isDone()).toBe(true);

    // Verify local blob file renamed
    const oldBlobPath = path.join(workspaceRoot, noteEntry.localPath, 'blobs', 'local-1.png');
    const newBlobPath = path.join(workspaceRoot, noteEntry.localPath, 'blobs', 'new-id.png');
    await expect(fs.access(oldBlobPath)).rejects.toThrow();
    await expect(fs.access(newBlobPath)).resolves.toBeUndefined();

    // Verify state has new blob hash
    const updatedState = await readStateFile(workspaceRoot);
    expect(updatedState.blobHashByContentId[noteEntry.id]).toBeDefined();
    expect(updatedState.blobHashByContentId[noteEntry.id]['new-id']).toBe(
      computeBlobHash(blobData)
    );
    expect(updatedState.blobHashByContentId[noteEntry.id]['local-1']).toBeUndefined();
  });

  // ── Test 2: Push with unchanged blob ──────────────────────────

  it('skips upload for blob with matching hash in state', async () => {
    const blobData = Buffer.from('known blob bytes');
    const blobHash = computeBlobHash(blobData);
    const bodyContent = '![img](blobs/known-blob)';
    const bodyHash = computeBodyHash(bodyContent);

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: bodyHash },
      blobHashByContentId: {
        [noteEntry.id]: { 'known-blob': blobHash },
      },
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);
    await createNote(workspaceRoot, noteEntry.localPath, bodyContent);
    await writeFile(workspaceRoot, `${noteEntry.localPath}/blobs/known-blob.png`, blobData);

    // No mock for POST /content/note-1/blobs — if called, nock rejects → test fails

    // Body gets pushed because URL transform changes the hash
    const expectedBody = '![img](/api/content/note-1/blobs/known-blob)';
    const nockBody = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, expectedBody)
      .query({ expectedRevision: noteEntry.bodyUpdatedAt })
      .reply(200, makeContentResponse({ id: noteEntry.id }));

    const result = await push(api, workspaceRoot);

    expect(result.blobsUploaded).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(nockBody.isDone()).toBe(true);
  });

  // ── Test 3: Push with changed blob bytes ──────────────────────

  it('re-uploads blob when bytes change and removes old blobId key', async () => {
    const oldBlobData = Buffer.from('old data');
    const newBlobData = Buffer.from('new different data');
    const oldBlobHash = computeBlobHash(oldBlobData);
    const bodyContent = '![img](blobs/old-blob)';
    const bodyHash = computeBodyHash(bodyContent);

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: bodyHash },
      blobHashByContentId: {
        [noteEntry.id]: { 'old-blob': oldBlobHash },
      },
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);
    await createNote(workspaceRoot, noteEntry.localPath, bodyContent);
    // Write blob with NEW data (different from state hash)
    await writeFile(workspaceRoot, `${noteEntry.localPath}/blobs/old-blob.png`, newBlobData);

    const nockBlob = nock(API_BASE)
      .post(`/content/${noteEntry.id}/blobs`, newBlobData)
      .reply(201, {
        blobId: 're-uploaded-id',
        url: `/api/content/${noteEntry.id}/blobs/re-uploaded-id`,
      });

    const expectedBody = '![img](/api/content/note-1/blobs/re-uploaded-id)';
    const nockBody = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, expectedBody)
      .query({ expectedRevision: noteEntry.bodyUpdatedAt })
      .reply(200, makeContentResponse({ id: noteEntry.id }));

    const result = await push(api, workspaceRoot);

    expect(result.blobsUploaded).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(nockBlob.isDone()).toBe(true);
    expect(nockBody.isDone()).toBe(true);

    // Old blobId removed from state, new one present
    const updatedState = await readStateFile(workspaceRoot);
    const blobHashes = updatedState.blobHashByContentId[noteEntry.id];
    expect(blobHashes['old-blob']).toBeUndefined();
    expect(blobHashes['re-uploaded-id']).toBe(computeBlobHash(newBlobData));
  });

  // ── Test 4: Push with orphan blob on disk ─────────────────────

  it('skips orphan blobs not referenced in markdown', async () => {
    const blobData = Buffer.from('orphan data');
    const bodyContent = '# No blobs here';
    const bodyHash = computeBodyHash(bodyContent);

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: bodyHash },
      blobHashByContentId: {},
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);
    await createNote(workspaceRoot, noteEntry.localPath, bodyContent);
    // Create orphan blob file (not referenced in body)
    await writeFile(workspaceRoot, `${noteEntry.localPath}/blobs/orphan.png`, blobData);

    // No blob upload should happen. Body hash matches → no body push either.
    // No mocks needed beyond lock (already set in beforeEach).

    const result = await push(api, workspaceRoot);

    expect(result.blobsUploaded).toBe(0);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  // ── Test 5: Push with 413 from API ────────────────────────────

  it('reports error and continues on 413 blob upload', async () => {
    const blobData = Buffer.from('too big data');
    const oldBody = '# Hello';
    const newBody = '# Hello\n![img](blobs/big-blob)';

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: computeBodyHash(oldBody) },
      blobHashByContentId: {},
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);
    await createNote(workspaceRoot, noteEntry.localPath, newBody);
    await writeFile(workspaceRoot, `${noteEntry.localPath}/blobs/big-blob.png`, blobData);

    // Mock blob upload returning 413
    const nockBlob = nock(API_BASE)
      .post(`/content/${noteEntry.id}/blobs`, blobData)
      .reply(413, { detail: 'Blob exceeds 2 MiB limit' });

    // Body gets pushed with untransformed URL (replace was never called)
    const expectedBody = '# Hello\n![img](blobs/big-blob)';
    const nockBody = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, expectedBody)
      .query({ expectedRevision: noteEntry.bodyUpdatedAt })
      .reply(200, makeContentResponse({ id: noteEntry.id }));

    const result = await push(api, workspaceRoot);

    expect(result.blobsUploaded).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.some((e) => e.includes('big-blob'))).toBe(true);
    expect(nockBlob.isDone()).toBe(true);
    expect(nockBody.isDone()).toBe(true);
  });

  // ── Test 6: Push forces body update when blobs change ─────────

  it('forces body update when blobs are added even if non-blob text is unchanged', async () => {
    const blobData = Buffer.from('new blob');
    // Body text (non-blob parts) is the same as stored hash
    const textOnly = '# Same text\nSome content';
    const bodyWithBlob = '# Same text\nSome content\n![img](blobs/new-blob)';
    const textOnlyHash = computeBodyHash(textOnly);

    const rootEntry = makeRootEntry();
    const noteEntry = makeNoteEntry({ bodyUpdatedAt: '2024-06-01T00:00:00.000Z' });
    const state: SyncState = {
      version: 1,
      lastSyncAt: '2024-06-01T00:00:00.000Z',
      rootId: rootEntry.id,
      bodyHashByContentId: { [noteEntry.id]: textOnlyHash },
      blobHashByContentId: {},
      entries: {
        [rootEntry.id]: rootEntry,
        [noteEntry.id]: noteEntry,
      },
    };
    await createStateFile(workspaceRoot, state);
    await createNote(workspaceRoot, noteEntry.localPath, bodyWithBlob);
    await writeFile(workspaceRoot, `${noteEntry.localPath}/blobs/new-blob.png`, blobData);

    const nockBlob = nock(API_BASE)
      .post(`/content/${noteEntry.id}/blobs`, blobData)
      .reply(201, { blobId: 'new-blob', url: `/api/content/${noteEntry.id}/blobs/new-blob` });

    const expectedBody = '# Same text\nSome content\n![img](/api/content/note-1/blobs/new-blob)';
    const nockBody = nock(API_BASE)
      .put(`/content/${noteEntry.id}/body`, expectedBody)
      .query({ expectedRevision: noteEntry.bodyUpdatedAt })
      .reply(200, makeContentResponse({ id: noteEntry.id }));

    const result = await push(api, workspaceRoot);

    expect(result.blobsUploaded).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(nockBlob.isDone()).toBe(true);
    expect(nockBody.isDone()).toBe(true);
  });
});
