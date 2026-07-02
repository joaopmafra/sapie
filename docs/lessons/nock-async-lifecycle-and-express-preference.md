# Nock v14 async lifecycle + Express preference

**Date:** 2026-07-02
**Context:** Sapie CLI Phase 1 integration tests (`pull.service.spec.ts`, `push.service.spec.ts`)

## Problem

When multiple nock-using Jest test suites run together, nock v14 emits `ECONNREFUSED` as
an **unhandled rejection** after suite completion. The test runner crashes even though all
individual tests pass.

**Root cause:** nock interceptors are removed (`nock.cleanAll()` in `afterEach`) while
axios keep-alive HTTP connections are still pending. The async socket error fires after
Jest finishes and is not caught by any test.

**Reproduction:** Run `npx jest` with both `test/sync/pull.service.spec.ts` and
`test/sync/push.service.spec.ts` in the same run. Each passes individually; together they
crash.

## Current mitigation

`packages/cli/test/setup.ts` installs a process-level handler:

```typescript
process.prependListener('unhandledRejection', (reason) => {
  const msg = String(reason);
  if (['ECONNREFUSED', 'NetConnectNotAllowedError', 'Nock: No match for request'].some(p => msg.includes(p))) {
    return; // suppress nock lifecycle artifacts
  }
  console.error('[UNHANDLED REJECTION]', reason);
  process.exitCode = 1;
});
```

This suppresses only nock-specific patterns. Real unhandled rejections still fail the suite.

## Recommendation

**Use Express fake servers instead of nock for CLI integration tests** (pull, push, smoke).
Stand up `app.listen(0, '127.0.0.1')` with a random port per suite. This avoids the async
lifecycle issue entirely.

Nock remains acceptable for unit-level `api-client` tests where each test makes a single
HTTP request and there's no cross-suite interference.

### Express pattern (preferred for integration tests)

```typescript
import express from 'express';
import http from 'http';

let server: http.Server;
let apiUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.get('/content/root', (_, res) => res.json({ id: 'r', type: 'directory', ... }));
  // ... more routes ...

  return new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) apiUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(() => { server.close(); });
```

## See also

- `packages/cli/test/setup.ts` — the suppression handler
- `packages/cli/test/smoke/cli.spec.ts` — Express-based integration test example
- `packages/cli/AGENTS.md` § Nock vs Express
- [localhost IPv6 gotcha](nock-localhost-ipv6-gotcha.md) — another nock pitfall
