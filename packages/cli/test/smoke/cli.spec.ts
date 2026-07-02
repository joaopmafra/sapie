/**
 * End-to-end smoke test: full round-trip (pull → edit → push → pull → verify).
 *
 * Starts a lightweight Express server mimicking the Sapie API,
 * exercises the pull and push services directly. The services are
 * the same code path as the CLI commands (minus auth + AGENTS.md generation,
 * which are command-level concerns tested separately).
 *
 * Per proposal Phase 1.8: "Round-trip integrity".
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import express from 'express';
import http from 'http';

import { ApiClient } from '../../src/lib/api/api-client';
import { pull } from '../../src/lib/sync/pull.service';
import { push } from '../../src/lib/sync/push.service';

const now = '2024-06-01T00:00:00.000Z';

interface StoredContent {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  body?: { mimeType: string; size: number; createdAt: string; updatedAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface StoredApp {
  content: Map<string, StoredContent>;
  bodies: Map<string, string>;
  nextId: number;
}

let server: http.Server;
let apiUrl: string;
let api: ApiClient;
let workspaceRoot: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(express.text({ type: 'text/*' }));

  const store: StoredApp = {
    content: new Map(),
    bodies: new Map(),
    nextId: 1,
  };

  app.get('/content/root', (_req, res) => {
    res.json({
      id: 'root-1',
      name: 'My Contents',
      type: 'directory',
      parentId: null,
      ownerId: 'test-user',
      createdAt: now,
      updatedAt: now,
    });
  });

  app.get('/content/:id/children', (req, res) => {
    const children: StoredContent[] = [];
    for (const [, c] of store.content) {
      if (c.parentId === req.params.id) children.push(c);
    }
    res.json(children);
  });

  app.get('/content/:id/body', (req, res) => {
    const body = store.bodies.get(req.params.id);
    if (body === undefined) {
      res.status(404).json({ title: 'Not Found', status: 404 });
      return;
    }
    res.type('text/markdown').send(body);
  });

  app.post('/content', (req, res) => {
    const { name, parentId, type } = req.body;
    const id = `id-${store.nextId++}`;
    const content: StoredContent = {
      id,
      name,
      type: type || 'note',
      parentId,
      body:
        type === 'note'
          ? { mimeType: 'text/markdown', size: 0, createdAt: now, updatedAt: now }
          : undefined,
      createdAt: now,
      updatedAt: now,
    };
    store.content.set(id, content);
    res.status(201).json(content);
  });

  app.patch('/content/:id', (req, res) => {
    const content = store.content.get(req.params.id);
    if (!content) {
      res.status(404).json({ title: 'Not Found', status: 404 });
      return;
    }
    if (req.body.name) content.name = req.body.name;
    content.updatedAt = new Date().toISOString();
    res.json(content);
  });

  app.put('/content/:id/body', (req, res) => {
    const content = store.content.get(req.params.id);
    if (!content) {
      res.status(404).json({ title: 'Not Found', status: 404 });
      return;
    }
    const bodyStr: string = typeof req.body === 'string' ? req.body : req.body.toString();
    store.bodies.set(req.params.id, bodyStr);
    content.body = {
      mimeType: 'text/markdown',
      size: bodyStr.length,
      createdAt: now,
      updatedAt: new Date().toISOString(),
    };
    res.json(content);
  });

  app.delete('/content/:id', (_req, res) => {
    res.status(204).end();
  });

  app.get('/content/:deckId/cards', (_req, res) => {
    res.json([]);
  });

  app.post('/content/:deckId/cards', (req, res) => {
    res.status(201).json({
      id: `card-${store.nextId++}`,
      deckId: req.params.deckId,
      ownerId: 'test-user',
      front: req.body.front,
      back: req.body.back,
      dueDate: now,
      interval: 0,
      repetitions: 0,
      lastResult: null,
      lastStudied: null,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  app.patch('/content/:deckId/cards/:cardId', (req, res) => {
    res.json({
      id: req.params.cardId,
      deckId: req.params.deckId,
      front: req.body.front,
      back: req.body.back,
      createdAt: now,
      updatedAt: now,
    });
  });

  app.delete('/content/:deckId/cards/:cardId', (_req, res) => {
    res.status(204).end();
  });

  return new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        apiUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      } else {
        reject(new Error('Failed to get server address'));
      }
    });
    server.on('error', reject);
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(async () => {
  workspaceRoot = path.join(
    os.tmpdir(),
    `sapie-smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await fs.mkdir(workspaceRoot, { recursive: true });
  api = new ApiClient(apiUrl);
  api.setTokenProvider(async () => 'fake-token-for-smoke-test');
});

afterEach(async () => {
  await fs.rm(workspaceRoot, { recursive: true, force: true });
});

describe('CLI smoke test', () => {
  it('full round-trip: pull → edit → push → pull → verify', async () => {
    // ── Initial pull ──
    const pullResult1 = await pull(api, workspaceRoot);
    expect(pullResult1.folders).toBe(1);
    expect(pullResult1.notes).toBe(0);

    // Verify .sapie/state.json was written
    const statePath = path.join(workspaceRoot, '.sapie', 'state.json');
    const state1 = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    expect(state1.version).toBe(1);
    expect(state1.rootId).toBe('root-1');

    // ── Create a local note ──
    const noteDir = path.join(workspaceRoot, 'My Contents', 'Smoke Test.md');
    await fs.mkdir(noteDir, { recursive: true });
    const noteBody = '# Smoke Test\n\nThis is a smoke test note.\n';
    await fs.writeFile(path.join(noteDir, 'index.md'), noteBody);

    // ── Push ──
    const pushResult = await push(api, workspaceRoot);
    expect(pushResult.created).toBeGreaterThanOrEqual(1);
    expect(pushResult.errors).toHaveLength(0);

    // ── Edit the note locally ──
    const updatedBody = '# Smoke Test\n\nThis note was edited locally.\n';
    await fs.writeFile(path.join(noteDir, 'index.md'), updatedBody);

    // ── Push the edit ──
    const pushResult2 = await push(api, workspaceRoot);
    expect(pushResult2.updated + pushResult2.created).toBeGreaterThanOrEqual(1);

    // ── Pull again ──
    const pullResult2 = await pull(api, workspaceRoot);
    expect(pullResult2.notes).toBeGreaterThanOrEqual(1);

    // ── Verify round-trip integrity ──
    const finalBody = await fs.readFile(path.join(noteDir, 'index.md'), 'utf-8');
    expect(finalBody).toBe(updatedBody);

    // State is consistent after round-trip
    const state2 = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    expect(state2.version).toBe(1);
    const noteEntries = Object.values(state2.entries).filter(
      (e: { type: string }) => e.type === 'note'
    );
    expect(noteEntries.length).toBeGreaterThanOrEqual(1);
  });
});
