# @sapie/cli — Agent Instructions

`@sapie/cli` — the `sapie` binary that syncs the Sapie content tree to a local filesystem workspace.

See root [AGENTS.md](../../AGENTS.md) for project-wide context and MVP priorities.
Full design: [docs/research/sapie_sync_cli_proposal.md](../../docs/research/sapie_sync_cli_proposal.md).

## Architecture

- **Entry point**: `src/index.ts` — yargs command router (`login`, `logout`, `pull`, `push`)
- **Commands**: thin shims in `src/commands/` — parse args, wire services, report results
- **Services** (the real logic):
  - `lib/api/api-client.ts` — typed axios wrapper with Firebase token injection, error handling
  - `lib/auth/auth.service.ts` — Firebase Auth REST API (email/password sign-in, token refresh)
  - `lib/auth/token-store.ts` — read/write `.sapie/auth.json` (600 perms, gitignored)
  - `lib/state/state.service.ts` — read/write `.sapie/state.json`, hash comparison
  - `lib/state/hashing.ts` — SHA-256 canonical hashing (LF-normalized bodies, sorted card data)
  - `lib/sync/pull.service.ts` — recursive tree walk, write to disk
  - `lib/sync/push.service.ts` — change detection, CRUD orchestration
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
  are removed while axios keep-alive is pending. Suppressed via `test/setup.ts` pattern.
- **Real fs** — tests write to `os.tmpdir()` subdirectories, cleaned up in `afterEach`.
- **No emulator needed** — CLI tests don't touch Firebase. `pnpm test` runs standalone.
- **Test files** in `test/`:
  - `test/state/hashing.spec.ts` — 24 pure-function tests
  - `test/state/state.service.spec.ts` — 22 tests (fs round-trip + hash detection)
  - `test/auth/token-store.spec.ts` — 10 tests (fs round-trip)
  - `test/api/api-client.spec.ts` — 20 tests (nock HTTP boundary)
  - `test/sync/pull.service.spec.ts` — 7 integration tests (nock + fs)
  - `test/sync/push.service.spec.ts` — 9 integration tests (nock + fs)

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

For the `pull.service.spec.ts` and `push.service.spec.ts` integration tests, we use **nock**
because it's zero-config and fast. However, nock v14 has a known async lifecycle issue:
interceptors emit `ECONNREFUSED` as an unhandled rejection when removed while axios keep-alive
connections are pending. The `test/setup.ts` file suppresses these specific patterns.

If nock becomes too painful for future tests, the proposal offers **Express** as a fallback:
stand up `app.listen(0, '127.0.0.1')` with a random port per suite, write inline
`app.get(...)` handlers, and use a real TCP connection. This avoids the async cleanup issue
entirely at the cost of slightly more setup boilerplate.

## PR slicing convention

- **One PR per phase** (Phase 1, Phase 2, Phase 3) — each is a coherent vertical slice.
- Within a phase, group related sub-tasks (e.g., auth + api-client + state = one PR,
  pull + push = another). The proposal's sub-task numbering suggests natural seams.
- Each PR must pass `pnpm run verify` on the CLI package AND the root `pnpm run verify`
  before merging.
- Commit format: `type(scope): description` — e.g., `feat(cli): add pull command`,
  `fix(cli): nock lifecycle cleanup`.
