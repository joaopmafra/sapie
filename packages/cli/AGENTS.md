# @sapie/cli — Agent Instructions

`@sapie/cli` — the `sapie` binary that syncs the Sapie content tree to a local filesystem workspace.

See root [AGENTS.md](../../AGENTS.md) for project-wide context and MVP priorities.
Full design: [docs/research/sapie_sync_cli_proposal.md](../../docs/research/sapie_sync_cli_proposal.md).

## Architecture

- **Entry point**: `src/index.ts` — yargs command router (`login`, `logout`, `pull`, `push`, `status`, `deck`)
- **Commands**: thin shims in `src/commands/` — parse args, wire services, report results
- **Services** (the real logic):
  - `lib/api/api-client.ts` — typed axios wrapper with Firebase token injection, error handling
  - `lib/auth/auth.service.ts` — Firebase Auth REST API (email/password + Google OAuth sign-in)
  - `lib/auth/oauth-server.ts` — local HTTP callback server for Google OAuth flow
  - `lib/auth/token-store.ts` — read/write `.sapie/auth.json` (600 perms, gitignored)
  - `lib/markdown/markdown.service.ts` — blob URL translation (regex-based, mdast-indirection layer)
  - `lib/state/state.service.ts` — read/write `.sapie/state.json`, hash comparison
  - `lib/state/hashing.ts` — SHA-256 canonical hashing (LF-normalized bodies, sorted card data)
  - `lib/sync/pull.service.ts` — recursive tree walk, write to disk, blob URL transform
  - `lib/sync/push.service.ts` — change detection, CRUD orchestration, blob URL transform
  - `lib/sync/status.service.ts` — dry-run change detection (reuses push logic)
  - `lib/workspace/workspace.service.ts` — filesystem I/O (notes as `.md/` dirs, decks as JSON)
  - `lib/workspace/agents-md.ts` — AGENTS.md + .gitignore generation on first pull
- **No Firebase SDK** — auth is pure REST. API client is plain axios.

## Local workspace structure

```
~/sapie-workspace/
  .sapie/config.json    # apiBaseUrl, firebaseApiKey, firebaseAuthDomain
  .sapie/auth.json      # tokens (gitignored, 600 perms)
  .sapie/state.json     # sync state
  AGENTS.md             # auto-generated AI agent instructions
  .gitignore
  My Contents/          # root folder
    FolderA/            # folder → plain directory
    NoteB.md/           # note → directory with .md suffix
      index.md          # note body (markdown)
      decks/            # child decks
        DeckName.json   # deck JSON with cards array
```

**Discriminator**: a directory with `index.md` is a note; without one, it's a folder.
Notes win if a folder and note would collide on the same path.

## Testing

- **Classical TDD at the service boundary.** Tests exercise services through their public API.
  Fakes only at external boundaries (HTTP via nock, filesystem via `os.tmpdir()`).
- **nock for HTTP mocking** — creates fake HTTP interceptors per test, cleaned up in `afterEach`.
  Known gotcha: nock v14 emits async `ECONNREFUSED` after suite completes when interceptors
- **Test files** in `test/`:
  - `test/state/hashing.spec.ts` — 24 pure-function tests
  - `test/state/state.service.spec.ts` — 22 tests (fs round-trip + hash detection)
  - `test/auth/token-store.spec.ts` — 10 tests (fs round-trip)
  - `test/auth/google-auth.spec.ts` — 5 tests (OAuth server lifecycle)
  - `test/api/api-client.spec.ts` — 20 tests (nock HTTP boundary)
  - `test/markdown/markdown.service.spec.ts` — 25 tests (blob URL transform, validate, find)
  - `test/sync/pull.service.spec.ts` — 7 integration tests (nock + fs)
  - `test/sync/push.service.spec.ts` — 9 integration tests (nock + fs)
  - `test/sync/status.service.spec.ts` — 9 tests (change detection, format output)
  - `test/commands/deck.spec.ts` — 9 tests (deck subcommands)
  - `test/smoke/cli.spec.ts` — 1 smoke test (Express fake server)

## Adding a new subcommand

1. Create `src/commands/<name>.ts` — parse args, call service, report results.
2. Register in `src/index.ts` with `.command(<name>, <desc>, <builder>, <handler>)`.
3. If it calls new API endpoints, add methods to `lib/api/api-client.ts`.
4. Write tests in `test/<area>/<name>.spec.ts`.
5. Run `pnpm test && pnpm verify:all` before committing.

## Adding a new API endpoint to api-client.ts

1. Add the response/request types to `lib/api/types.ts` (mirroring the backend DTOs).
2. Add the method to `ApiClient` — use the existing pattern: typed `this.http.get<T>(...)`.
3. Handle 404 specially if needed (see `getBody` for the pattern).
4. Add tests in `test/api/api-client.spec.ts` against nock.

## Canonical hash rules

These are the rules that make diffs consistent across JSON reformatting and OS line endings:

### Body hash (`computeBodyHash`)
1. Decode bytes as UTF-8.
2. Strip leading BOM (`\uFEFF`) if present.
3. Normalize line endings: `\r\n` → `\n`, bare `\r` → `\n`.
4. SHA-256. Trailing whitespace is preserved.

### Card hash (`computeCardHash`)
1. Extract `(id, front, back)` from each card (ignore study state).
2. Sort by `id` (nulls last, then by `front`, then `back`).
3. Join each tuple with `\t`, join tuples with `\n`.
4. SHA-256.

## Nock vs Express for integration tests

**Express is preferred for service-level integration tests** (pull, push, smoke).
Stand up `app.listen(0, '127.0.0.1')` with a random port per suite, write inline
handlers. This avoids nock's async lifecycle issue entirely and is the pattern used
by `test/smoke/cli.spec.ts` and `test/qa/cli-qa.ts`.

Nock is acceptable for unit-level api-client tests (single HTTP boundary, one
interceptor per test, no cross-suite interference).

### Nock gotchas

1. **Async lifecycle:** nock v14 emits `ECONNREFUSED` as unhandled rejections when
   interceptors are removed while axios keep-alive connections are pending. Suppressed
   via `test/setup.ts`. Only manifests when multiple nock-using suites run together.

2. **`disableNetConnect('127.0.0.1')` does NOT cover `localhost`.** `localhost` can
   resolve to IPv6 `::1` while `enableNetConnect` only allows IPv4. Either use
   `127.0.0.1` in both the client URL and `enableNetConnect`, or skip `disableNetConnect`.

## Known issues

### Rename detection: delete+create instead of rename+patch

When a note directory is renamed to a completely different path (e.g., `Old.md` →
`New.md`), the push service detects it as **delete + create** rather than a **rename**.
Root cause: change detection runs creates first, deletes second, renames third — by the
time rename checks run, the old entry is already marked for deletion.

**Impact:** Low. Content is preserved (delete+create on server). The rename becomes two
operations instead of one, and the note gets a new content ID. Fix: reorder change
detection to run renames before creates/deletes.

**Tracked in:** `docs/pm/test_plans/sapie_cli_phase1_qa.md` §Known issue.
