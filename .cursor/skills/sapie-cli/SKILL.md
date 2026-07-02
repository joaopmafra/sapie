# Skill: Sapie CLI development

How to extend the `@sapie/cli` package — add subcommands, API endpoints, and tests.

Full reference: `packages/cli/AGENTS.md` (architecture, test approach, canonical hash rules).

## Scaffold a new subcommand

1. Create `packages/cli/src/commands/<name>.ts`:
   ```typescript
   import { ApiClient } from '../lib/api/api-client';
   import { AuthService } from '../lib/auth/auth.service';

   interface Opts { workspaceRoot: string; config: { apiBaseUrl: string; firebaseApiKey: string }; }

   export async function myCommand(opts: Opts): Promise<void> {
     const authService = new AuthService({ apiKey: opts.config.firebaseApiKey });
     const api = new ApiClient(opts.config.apiBaseUrl);
     api.setTokenProvider(() => authService.getValidToken(opts.workspaceRoot));
     // ... command logic ...
     console.log('Done.');
   }
   ```
2. Register in `packages/cli/src/index.ts`:
   ```typescript
   .command('mycommand', 'Description', (y) => y.option('workspace', { type: 'string' }),
     async (args) => myCommand({ workspaceRoot: resolveWorkspaceRoot(args.workspace), config: loadConfig(args.workspace) }))
   ```
3. If calling new API endpoints, add methods to `ApiClient` in `src/lib/api/api-client.ts`.
4. Write tests in `packages/cli/test/<area>/<name>.spec.ts`.

## Add a new API endpoint to api-client.ts

```typescript
// 1. Add types to src/lib/api/types.ts (mirror backend DTOs)
export interface MyResponse { id: string; name: string; }

// 2. Add method to ApiClient
async getMyResource(id: string): Promise<MyResponse> {
  const { data } = await this.http.get<MyResponse>(`/content/${id}/my-resource`);
  return data;
}
```

Pattern for 404-as-null:
```typescript
async getBody(id: string): Promise<string | null> {
  try {
    const { data } = await this.http.get<string>(`/content/${id}/body`, { responseType: 'text' });
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
```

## Test patterns

### Pure function tests (hashing, state logic)
```typescript
// test/state/hashing.spec.ts — no I/O, no mocks needed
import { computeBodyHash } from '../../src/lib/state/hashing';

describe('computeBodyHash', () => {
  it('same content → same hash', () => {
    expect(computeBodyHash('# Hello')).toBe(computeBodyHash('# Hello'));
  });
  it('CRLF → LF normalization', () => {
    expect(computeBodyHash('a\r\nb')).toBe(computeBodyHash('a\nb'));
  });
});
```

### Filesystem tests (token-store, state.service)
```typescript
// test/auth/token-store.spec.ts — real fs against os.tmpdir()
import * as os from 'os';
import * as path from 'path';

describe('token-store', () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'test-')); });
  afterEach(() => { fs.rmSync(workspaceRoot, { recursive: true, force: true }); });

  it('round-trip write → read', async () => { /* ... */ });
});
```

### HTTP boundary tests (api-client) — use nock
```typescript
// test/api/api-client.spec.ts — nock at the HTTP boundary
import nock from 'nock';
import { ApiClient } from '../../src/lib/api/api-client';

describe('ApiClient', () => {
  let client: ApiClient;
  beforeEach(() => { client = new ApiClient('http://localhost:9999/api'); nock.cleanAll(); });
  afterEach(() => { nock.cleanAll(); });

  it('getRoot returns ContentResponse', async () => {
    nock('http://localhost:9999').get('/api/content/root').reply(200, { id: 'x', ... });
    const result = await client.getRoot();
    expect(result.id).toBe('x');
  });
});
```

### Integration tests (pull, push, smoke) — prefer Express

**Express is preferred for integration tests.** It avoids nock's async lifecycle issues:

```typescript
// test/smoke/cli.spec.ts — Express fake server
import express from 'express';

beforeAll(async () => {
  const app = express();
  app.get('/content/root', (_, res) => res.json({ id: 'root-1', type: 'directory', ... }));
  app.get('/content/:id/children', (req, res) => { /* ... */ });
  // ... more routes ...

  return new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
});

afterAll(() => { server.close(); });
```

Nock is acceptable for unit-level api-client tests (single HTTP boundary).

### Nock gotchas

1. **Async lifecycle:** nock v14 emits `ECONNREFUSED` as unhandled rejections when
   interceptors are removed while axios keep-alive connections are pending.
   `test/setup.ts` suppresses these specific patterns.

2. **`disableNetConnect('127.0.0.1')` does NOT cover `localhost`** — `localhost` can
   resolve to IPv6 `::1`. Use `127.0.0.1` everywhere, or skip `disableNetConnect`.

### QA testing pattern (manual)

When testing the full CLI binary against a fake server:

1. Stand up Express on `app.listen(0, '127.0.0.1')`
2. Write `.sapie/config.json` + `.sapie/auth.json` (fake token, future expiry)
3. Run `node dist/index.js <cmd> --workspace <tmpdir>` via `child_process.execFile`
4. Read state.json and filesystem to verify results

See `test/qa/cli-qa.ts` for the full example. No real Firebase credentials needed.

## Canonical hash rules

### Body hash
1. UTF-8 decode. Strip BOM (`\uFEFF`). Normalize `\r\n` → `\n`, `\r` → `\n`.
2. SHA-256. Trailing whitespace preserved.

### Card hash
1. Extract `(id, front, back)`, sort by id (nulls last → front → back).
2. Join tuples with `\t`, join lines with `\n`. SHA-256.

A test must verify: parse JSON → serialize → parse → same hash as original (reformat-proof).

## Known issues

### Rename detection: delete+create instead of rename+patch

When a note directory is renamed on disk (e.g., `Old.md` → `New.md`), the push service
detects it as **delete + create** rather than a single **rename** PATCH. Root cause:
change detection runs creates first, deletes second, renames third — by the time rename
checks run, the old entry is already marked for deletion.

**Impact:** Low. Content is preserved (delete+create on server). The rename becomes two
operations, and the note gets a new content ID. Fix: reorder change detection. Deferred
to Phase 3.

## PR convention

- One PR per phase or sub-task group. Example seams: scaffold+config → auth+api-client+state → pull → push → smoke.
- Every PR must pass `cd packages/cli && pnpm run verify:all && pnpm test` before merging.
- Commit format: `type(cli): description`.

## Key files

| File | Purpose |
|------|---------|
| `src/index.ts` | yargs command router |
| `src/commands/*.ts` | command handlers — login, logout, pull, push, status, deck |
| `src/lib/api/api-client.ts` | typed axios wrapper + ApiError |
| `src/lib/api/types.ts` | API response/request wire shapes |
| `src/lib/auth/auth.service.ts` | Firebase Auth REST API (email + Google OAuth) |
| `src/lib/auth/oauth-server.ts` | local HTTP callback server for Google OAuth |
| `src/lib/auth/token-store.ts` | .sapie/auth.json I/O |
| `src/lib/markdown/markdown.service.ts` | blob URL translation (regex-based) |
| `src/lib/state/state.service.ts` | .sapie/state.json I/O + hash comparison |
| `src/lib/state/hashing.ts` | SHA-256 canonical hashing |
| `src/lib/sync/pull.service.ts` | recursive pull engine + blob URL transform |
| `src/lib/sync/push.service.ts` | change detection + push engine + blob URL transform |
| `src/lib/sync/status.service.ts` | dry-run change detection |
| `src/lib/workspace/workspace.service.ts` | filesystem I/O |
| `src/lib/workspace/agents-md.ts` | AGENTS.md + .gitignore generator |
| `test/setup.ts` | nock unhandled rejection + exception suppression |
| `test/qa/cli-qa.ts` | manual QA test script |
