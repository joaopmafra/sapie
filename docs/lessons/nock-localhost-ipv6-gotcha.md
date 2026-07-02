# Nock: `disableNetConnect('127.0.0.1')` does not cover `localhost`

**Date:** 2026-07-02
**Context:** Attempted to use `nock.disableNetConnect()` to prevent accidental real HTTP
calls during Sapie CLI tests.

## Problem

```typescript
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');
// ... later ...
nock('http://localhost:9999').get('/api/content/root').reply(200, { ... });
// This nock interceptor will NOT match — "Disallowed net connect for localhost:9999"
```

The `enableNetConnect('127.0.0.1')` call only allows connections to the IPv4 loopback
address `127.0.0.1`. It does **not** allow the hostname `localhost`, which can resolve to
the IPv6 loopback `::1` on systems with IPv6 enabled.

Since the `ApiClient` is configured with `http://localhost:9999`, Node's DNS resolution
returns `::1`, which nock blocks because only `127.0.0.1` was allowed.

## Solution

**Option A: Use `127.0.0.1` everywhere** (recommended for tests)

```typescript
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

const client = new ApiClient('http://127.0.0.1:9999/api');
nock('http://127.0.0.1:9999').get('/api/content/root').reply(200, { ... });
```

**Option B: Skip `disableNetConnect`** (simpler, but allows real network on unmocked calls)

```typescript
// No disableNetConnect — nock interceptors still work,
// but unmocked requests will hit real network
nock('http://localhost:9999').get('/api/content/root').reply(200, { ... });
```

**Option C: Allow both hostnames**

```typescript
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');
nock.enableNetConnect('localhost');
```

## Recommendation

Use **Option B** (skip `disableNetConnect`) unless you need strict "no real network"
enforcement. The risk of an unmocked request hitting a real server is low in test
environments, and this avoids the IPv4/IPv6 confusion entirely.

If you do use `disableNetConnect`, use `127.0.0.1` (not `localhost`) in both the client
URL and `enableNetConnect`.

## See also

- [Nock async lifecycle + Express preference](nock-async-lifecycle-and-express-preference.md)
- `packages/cli/AGENTS.md` § Nock gotchas
