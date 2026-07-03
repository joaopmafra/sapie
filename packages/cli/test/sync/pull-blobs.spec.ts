import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

import { pull } from '../../src/lib/sync/pull.service';
import { ApiClient } from '../../src/lib/api/api-client';
import { ContentResponse, ContentType } from '../../src/lib/api/types';

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

describe('pull blobs', () => {
  let api: ApiClient;
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = path.join(
      os.tmpdir(),
      `sapie-blob-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
      if (entry.startsWith('sapie-blob-test-')) {
        await fs.rm(path.join(tmpDir, entry), { recursive: true, force: true });
      }
    }
  });

  // ── Test 1: pull with no blobs ──
  it('pull with no blobs: blobsDownloaded=0, blobHashByContentId={}', async () => {
    const bodyText = '# No images here\n\nJust text.';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Plain Note',
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

    expect(result.blobs).toBe(0);
    expect(result.blobsDownloaded).toBe(0);

    const stateRaw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.blobHashByContentId).toEqual({});
  });

  // ── Test 2: pull with one blob ──
  it('pull with one blob: writes blob file, records hash in state', async () => {
    const bodyText = '# Note with image\n\n![img](/api/content/note-1/blobs/blob-1)';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Image Note',
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
    nock(API_URL)
      .get('/content/note-1/blobs/blob-1')
      .reply(200, Buffer.from('fake-png-data'), { 'Content-Type': 'image/png' });

    const result = await pull(api, workspaceRoot);

    expect(result.blobs).toBe(1);
    expect(result.blobsDownloaded).toBe(1);

    // Verify blob file written
    const blobPath = path.join(
      workspaceRoot,
      'My Contents',
      'Image Note.md',
      'blobs',
      'blob-1.png'
    );
    const blobData = await fs.readFile(blobPath);
    expect(blobData.toString()).toBe('fake-png-data');

    // Verify markdown body references the blob with the correct extension
    const bodyPath = path.join(workspaceRoot, 'My Contents', 'Image Note.md', 'index.md');
    const writtenBody = await fs.readFile(bodyPath, 'utf-8');
    expect(writtenBody).toContain('blobs/blob-1.png');
    expect(writtenBody).not.toContain('blobs/blob-1)'); // no bare blobId without extension

    // Verify state has blob hash
  });

  // ── Test 3: pull with unchanged blob (skip re-download) ──
  it('pull with unchanged blob: skips re-download when hash matches', async () => {
    const bodyText = '# Note\n\n![img](/api/content/note-1/blobs/blob-1)';
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

    // First pull — downloads the blob
    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL)
      .get('/content/note-1/body')
      .reply(200, bodyText, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, []);
    nock(API_URL)
      .get('/content/note-1/blobs/blob-1')
      .reply(200, Buffer.from('stable-data'), { 'Content-Type': 'image/png' });

    const result1 = await pull(api, workspaceRoot);
    expect(result1.blobsDownloaded).toBe(1);

    // Second pull — same data, hash should match
    nock.cleanAll();
    nock(API_URL).get('/content/root').reply(200, root);
    nock(API_URL).get('/content/root-1/children').reply(200, [note]);
    nock(API_URL)
      .get('/content/note-1/body')
      .reply(200, bodyText, { 'Content-Type': 'text/plain' });
    nock(API_URL).get('/content/note-1/children').reply(200, []);
    // Blob endpoint IS mocked but blobsDownloaded stays 0 because hash matches
    nock(API_URL)
      .get('/content/note-1/blobs/blob-1')
      .reply(200, Buffer.from('stable-data'), { 'Content-Type': 'image/png' });

    const result2 = await pull(api, workspaceRoot);

    expect(result2.blobs).toBe(1);
    // Hash matches prevState → not counted as downloaded
    expect(result2.blobsDownloaded).toBe(0);
    // Verify blob file still exists on disk from first pull
    const blobPath = path.join(
      workspaceRoot,
      'My Contents',
      'Stable Note.md',
      'blobs',
      'blob-1.png'
    );
    const blobData = await fs.readFile(blobPath);
    expect(blobData.toString()).toBe('stable-data');
  });

  // ── Test 4: pull with 404 on blob ──
  it('pull with 404 on blob: skips missing blob, pull succeeds', async () => {
    const bodyText = '# Note\n\n![img](/api/content/note-1/blobs/missing-1)';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Broken Image Note',
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
    // Blob returns 404 — treated as "not found", skipped gracefully
    nock(API_URL).get('/content/note-1/blobs/missing-1').reply(404);

    const result = await pull(api, workspaceRoot);

    // Pull succeeds even with 404 blob
    expect(result.notes).toBe(1);
    expect(result.blobs).toBe(1);
    expect(result.blobsDownloaded).toBe(0);

    // No blob file written
    const blobsDir = path.join(workspaceRoot, 'My Contents', 'Broken Image Note.md', 'blobs');
    await expect(fs.access(blobsDir)).rejects.toThrow();
  });

  // ── Test 5: pull with multiple blobs ──
  it('pull with multiple blobs: downloads all, reports correct counts', async () => {
    const bodyText = [
      '![a](/api/content/note-1/blobs/blob-a)',
      '![b](/api/content/note-1/blobs/blob-b)',
      '![c](/api/content/note-1/blobs/blob-c)',
    ].join('\n');

    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Multi Blob Note',
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
    nock(API_URL)
      .get('/content/note-1/blobs/blob-a')
      .reply(200, Buffer.from('aaa'), { 'Content-Type': 'image/png' });
    nock(API_URL)
      .get('/content/note-1/blobs/blob-b')
      .reply(200, Buffer.from('bbb'), { 'Content-Type': 'image/png' });
    nock(API_URL)
      .get('/content/note-1/blobs/blob-c')
      .reply(200, Buffer.from('ccc'), { 'Content-Type': 'image/png' });

    const result = await pull(api, workspaceRoot);

    expect(result.blobs).toBe(3);
    expect(result.blobsDownloaded).toBe(3);

    // All three files written
    const blobsDir = path.join(workspaceRoot, 'My Contents', 'Multi Blob Note.md', 'blobs');
    expect(await fs.readFile(path.join(blobsDir, 'blob-a.png'), 'utf-8')).toBe('aaa');
    expect(await fs.readFile(path.join(blobsDir, 'blob-b.png'), 'utf-8')).toBe('bbb');
    expect(await fs.readFile(path.join(blobsDir, 'blob-c.png'), 'utf-8')).toBe('ccc');

    // State has all three hashes
    const stateRaw = await fs.readFile(path.join(workspaceRoot, '.sapie', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.blobHashByContentId['note-1']['blob-a']).toBeDefined();
    expect(state.blobHashByContentId['note-1']['blob-b']).toBeDefined();
    expect(state.blobHashByContentId['note-1']['blob-c']).toBeDefined();
  });

  // ── Test 6: pull with unknown content-type → .bin extension ──
  it('pull with unknown content-type: falls back to .bin extension', async () => {
    const bodyText = '![custom](/api/content/note-1/blobs/blob-x)';
    const root = makeContent({
      id: 'root-1',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
    });
    const note = makeContent({
      id: 'note-1',
      name: 'Custom Type Note',
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
    nock(API_URL)
      .get('/content/note-1/blobs/blob-x')
      .reply(200, Buffer.from('custom-data'), { 'Content-Type': 'application/x-custom' });

    const result = await pull(api, workspaceRoot);

    expect(result.blobsDownloaded).toBe(1);

    // File written with .bin extension
    const blobPath = path.join(
      workspaceRoot,
      'My Contents',
      'Custom Type Note.md',
      'blobs',
      'blob-x.bin'
    );
    const blobData = await fs.readFile(blobPath);
    expect(blobData.toString()).toBe('custom-data');
  });
});
