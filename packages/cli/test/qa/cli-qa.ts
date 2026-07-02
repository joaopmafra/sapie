/**
 * Sapie CLI Phase 1 — QA Test Suite
 *
 * Starts a fake Express API server and runs the CLI binary against it.
 * Run: cd packages/cli && npx tsx test/qa/cli-qa.ts
 */

import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import express from 'express';
import http from 'http';

const CLI = path.resolve(__dirname, '../../dist/index.js');
const NOW = '2024-06-01T00:00:00.000Z';
let nextId = 1;

interface TestResult {
  id: string;
  name: string;
  pass: boolean;
  detail?: string;
}

// ── Fake API Server ──
function createFakeServer() {
  const content = new Map<string, any>();
  const bodies = new Map<string, string>();

  const app = express();
  app.use(express.json());
  app.use(express.text({ type: 'text/*' }));

  function mkContent(overrides: Record<string, any> = {}) {
    const id = overrides.id || `id-${nextId++}`;
    return {
      id, name: 'Item', type: 'note', parentId: null, ownerId: 'qa-user',
      body: null, createdAt: NOW, updatedAt: NOW, ...overrides,
    };
  }

  app.get('/content/root', (_req, res) => {
    res.json(mkContent({ id: 'root-1', name: 'My Contents', type: 'directory', parentId: null }));
  });

  app.get('/content/:id/children', (req, res) => {
    const children: any[] = [];
    for (const [, c] of content) {
      if (c.parentId === req.params.id) children.push(c);
    }
    res.json(children);
  });

  app.get('/content/:id/body', (req, res) => {
    const body = bodies.get(req.params.id);
    if (body === undefined) return res.status(404).json({ title: 'Not Found', status: 404 });
    res.type('text/markdown').send(body);
  });

  app.post('/content', (req, res) => {
    const c = mkContent({ name: req.body.name, parentId: req.body.parentId, type: req.body.type || 'note' });
    content.set(c.id, c);
    res.status(201).json(c);
  });

  app.patch('/content/:id', (req, res) => {
    const c = content.get(req.params.id);
    if (!c) return res.status(404).json({ title: 'Not Found', status: 404 });
    if (req.body.name) c.name = req.body.name;
    c.updatedAt = new Date().toISOString();
    res.json(c);
  });

  app.put('/content/:id/body', (req, res) => {
    const c = content.get(req.params.id);
    if (!c) return res.status(404).json({ title: 'Not Found', status: 404 });
    const bodyStr = typeof req.body === 'string' ? req.body : String(req.body);
    bodies.set(req.params.id, bodyStr);
    c.body = { mimeType: 'text/markdown', size: bodyStr.length, createdAt: NOW, updatedAt: new Date().toISOString() };
    res.json(c);
  });

  app.delete('/content/:id', (_req, res) => { res.status(204).end(); });
  app.get('/content/:deckId/cards', (_req, res) => { res.json([]); });
  app.post('/content/:deckId/cards', (req, res) => {
    res.status(201).json({
      id: `card-${nextId++}`, deckId: req.params.deckId, ownerId: 'qa-user',
      front: req.body.front, back: req.body.back,
      dueDate: NOW, interval: 0, repetitions: 0,
      lastResult: null, lastStudied: null, correctCount: 0, incorrectCount: 0,
      createdAt: NOW, updatedAt: NOW,
    });
  });
  app.patch('/content/:deckId/cards/:cardId', (req, res) => {
    res.json({ id: req.params.cardId, deckId: req.params.deckId, front: req.body.front || '', back: req.body.back || '', createdAt: NOW, updatedAt: NOW });
  });
  app.delete('/content/:deckId/cards/:cardId', (_req, res) => { res.status(204).end(); });

  return { app, content, bodies };
}

// ── Helpers ──
function runCli(workspaceRoot: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args, '--workspace', workspaceRoot], {
      timeout: 10000,
      env: { ...process.env, HOME: os.homedir() },
    }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code || 1 : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function setupWorkspace(workspaceRoot: string, apiUrl: string) {
  const sapieDir = path.join(workspaceRoot, '.sapie');
  await fs.mkdir(sapieDir, { recursive: true });
  await fs.writeFile(path.join(sapieDir, 'config.json'), JSON.stringify({
    apiBaseUrl: apiUrl,
    firebaseApiKey: 'qa-fake-key',
    firebaseAuthDomain: 'qa-fake.firebaseapp.com',
  }));
  await fs.writeFile(path.join(sapieDir, 'auth.json'), JSON.stringify({
    idToken: 'qa-fake-id-token',
    refreshToken: 'qa-fake-refresh-token',
    email: 'qa@sapie.dev',
    localId: 'qa-user-id',
    expiresAt: Date.now() + 86400000,
  }), { mode: 0o600 });
}

// ── Main ──
async function main() {
  const results: TestResult[] = [];
  console.log('═'.repeat(60));
  console.log('Sapie CLI Phase 1 — QA Test Suite');
  console.log('═'.repeat(60));

  const { app } = createFakeServer();
  const server = await new Promise<http.Server>((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const addr = server.address();
  if (!addr || typeof addr !== 'object') throw new Error('No address');
  const apiUrl = `http://127.0.0.1:${addr.port}`;
  console.log(`Fake API: ${apiUrl}`);

  try {
    // ── TC-01: Help ──
    console.log('\n── TC-01: Help ──');
    const help = await runCli(os.tmpdir(), ['--help']);
    console.log(help.stdout.trim().split('\n').slice(0, 5).join('\n'));
    results.push({ id: 'TC-01', name: 'Help', pass: help.stdout.includes('login') && help.stdout.includes('pull') });

    // ── TC-02: Pull empty root ──
    console.log('\n── TC-02: Pull empty root ──');
    const ws1 = path.join(os.tmpdir(), `sapie-qa-${Date.now()}`);
    await fs.mkdir(ws1, { recursive: true });
    await setupWorkspace(ws1, apiUrl);
    const pull1 = await runCli(ws1, ['pull']);
    console.log(pull1.stdout.trim());
    const state1 = JSON.parse(await fs.readFile(path.join(ws1, '.sapie', 'state.json'), 'utf-8'));
    results.push({ id: 'TC-02', name: 'Pull empty root', pass: state1.version === 1 && state1.rootId === 'root-1' });

    // ── TC-03: Root dir exists ──
    console.log('\n── TC-03: Root directory ──');
    const rootStat = await fs.stat(path.join(ws1, 'My Contents'));
    results.push({ id: 'TC-03', name: 'Root directory', pass: rootStat.isDirectory() });

    // ── TC-07: AGENTS.md + .gitignore ──
    console.log('\n── TC-07: AGENTS.md + .gitignore ──');
    const agents = await fs.readFile(path.join(ws1, 'AGENTS.md'), 'utf-8');
    const gi = await fs.readFile(path.join(ws1, '.gitignore'), 'utf-8');
    results.push({ id: 'TC-07', name: 'AGENTS.md + .gitignore', pass: agents.includes('Sapie Workspace') && gi.includes('.sapie/auth.json') });

    // ── TC-08: Push create note ──
    console.log('\n── TC-08: Push — create note ──');
    const noteDir = path.join(ws1, 'My Contents', 'QA Note.md');
    await fs.mkdir(noteDir, { recursive: true });
    await fs.writeFile(path.join(noteDir, 'index.md'), '# QA Test Note');
    const pc = await runCli(ws1, ['push']);
    console.log(pc.stdout.trim());
    results.push({ id: 'TC-08', name: 'Push create', pass: pc.stdout.includes('created') });

    // ── TC-09: Push modify body ──
    console.log('\n── TC-09: Push — modify body ──');
    await fs.writeFile(path.join(noteDir, 'index.md'), '# QA Test Note\nModified!');
    const pe = await runCli(ws1, ['push']);
    console.log(pe.stdout.trim());
    results.push({ id: 'TC-09', name: 'Push modify', pass: pe.stdout.includes('updated') });

    // ── TC-10: Push rename ──
    console.log('\n── TC-10: Push — rename ──');
    const renamedDir = path.join(ws1, 'My Contents', 'QA Renamed.md');
    await fs.rename(noteDir, renamedDir);
    const pr = await runCli(ws1, ['push']);
    console.log(pr.stdout.trim());
    results.push({ id: 'TC-10', name: 'Push rename', pass: pr.stdout.includes('renamed') });

    // ── TC-11: Push delete ──
    console.log('\n── TC-11: Push — delete ──');
    await fs.rm(renamedDir, { recursive: true, force: true });
    const pd = await runCli(ws1, ['push']);
    console.log(pd.stdout.trim());
    results.push({ id: 'TC-11', name: 'Push delete', pass: pd.stdout.includes('deleted') });

    // ── TC-13: No state ──
    console.log('\n── TC-13: Push without state ──');
    const nsWs = path.join(os.tmpdir(), `sapie-qa-ns-${Date.now()}`);
    await fs.mkdir(nsWs, { recursive: true });
    await setupWorkspace(nsWs, apiUrl);
    await fs.rm(path.join(nsWs, '.sapie', 'state.json'), { force: true });
    const pns = await runCli(nsWs, ['push']);
    console.log(pns.stdout.trim());
    results.push({ id: 'TC-13', name: 'No state', pass: pns.stdout.includes('No .sapie/state.json') });
    await fs.rm(nsWs, { recursive: true, force: true }).catch(() => {});

    // ── TC-14: Full round-trip ──
    console.log('\n── TC-14: Full round-trip ──');
    const rtWs = path.join(os.tmpdir(), `sapie-qa-rt-${Date.now()}`);
    await fs.mkdir(rtWs, { recursive: true });
    await setupWorkspace(rtWs, apiUrl);
    await runCli(rtWs, ['pull']);
    const rtDir = path.join(rtWs, 'My Contents', 'RT.md');
    await fs.mkdir(rtDir, { recursive: true });
    await fs.writeFile(path.join(rtDir, 'index.md'), 'RT v1');
    await runCli(rtWs, ['push']);
    await fs.writeFile(path.join(rtDir, 'index.md'), 'RT v2');
    await runCli(rtWs, ['push']);
    await runCli(rtWs, ['pull']);
    const final = await fs.readFile(path.join(rtDir, 'index.md'), 'utf-8');
    results.push({ id: 'TC-14', name: 'Round-trip', pass: final === 'RT v2', detail: `body="${final}"` });
    await fs.rm(rtWs, { recursive: true, force: true }).catch(() => {});

    // ── TC-15: Second pull unchanged ──
    console.log('\n── TC-15: Second pull unchanged ──');
    const uw = path.join(os.tmpdir(), `sapie-qa-uc-${Date.now()}`);
    await fs.mkdir(uw, { recursive: true });
    await setupWorkspace(uw, apiUrl);
    await runCli(uw, ['pull']);
    const p2 = await runCli(uw, ['pull']);
    console.log(p2.stdout.trim());
    results.push({ id: 'TC-15', name: 'Pull unchanged', pass: p2.stdout.includes('unchanged') });
    await fs.rm(uw, { recursive: true, force: true }).catch(() => {});

    // Clean up ws1
    await fs.rm(ws1, { recursive: true, force: true }).catch(() => {});

  } finally {
    server.close();
  }

  // ── Report ──
  console.log('\n' + '═'.repeat(60));
  console.log('QA RESULTS');
  console.log('═'.repeat(60));
  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`${icon} ${r.id}: ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
    if (r.pass) passed++; else failed++;
  }
  console.log(`\n${passed}/${results.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('QA Suite crashed:', e); process.exit(1); });
