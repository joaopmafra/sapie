# Sapie CLI — development guide

`packages/cli/` — `@sapie/cli`, the `sapie` binary for syncing content between the Sapie backend
and a local filesystem workspace.

Full design: [sapie_sync_cli_proposal.md](../research/sapie_sync_cli_proposal.md)

## Quick start

```bash
cd packages/cli
pnpm install
pnpm run build          # tsc
pnpm run dev            # tsx src/index.ts <command>
pnpm test               # jest (93 tests, 7 suites)
pnpm run verify:all     # types + lint + format
```

## Architecture

- **Entry point**: `src/index.ts` — yargs command router
- **Commands**: `src/commands/` — thin shims that parse args, wire services, report results
- **Services**: `src/lib/` — the real logic (auth, API client, state, sync engines, workspace I/O)
- **No Firebase SDK** — auth is pure REST. No Firebase emulator needed for tests.

## Test approach

**Classical TDD at the service boundary.** Tests exercise services through their public API.
Fakes only at external boundaries:

| Boundary | Fake |
|----------|------|
| HTTP (Sapie API) — unit tests | nock interceptors |
| HTTP (Sapie API) — integration tests | Express fake server |
| Filesystem | `os.tmpdir()` subdirectories |

**No Firebase emulator needed.** CLI tests run standalone against nock/Express + real fs.

### Test files

| File | Tests | Style | HTTP fake |
|------|-------|-------|------------|
| `test/state/hashing.spec.ts` | 24 | Pure functions | — |
| `test/state/state.service.spec.ts` | 22 | fs round-trip | — |
| `test/auth/token-store.spec.ts` | 10 | fs round-trip | — |
| `test/api/api-client.spec.ts` | 20 | HTTP boundary | nock |
| `test/sync/pull.service.spec.ts` | 7 | Integration | nock |
| `test/sync/push.service.spec.ts` | 9 | Integration | nock |
| `test/smoke/cli.spec.ts` | 1 | E2E round-trip | Express |
| `test/qa/cli-qa.ts` | — | Manual QA script | Express |

### HTTP faking: Express preferred for integration tests

**Use Express for service-level integration tests** (pull, push, smoke). Stand up
`app.listen(0, '127.0.0.1')`, write inline handlers. This is the pattern used by
`test/smoke/cli.spec.ts` and `test/qa/cli-qa.ts`.

Nock is acceptable for unit-level api-client tests (single HTTP boundary). It has
two known gotchas documented in `packages/cli/AGENTS.md`:

1. **Async lifecycle:** emits `ECONNREFUSED` as unhandled rejection when interceptors
   are removed while axios keep-alive is pending. Suppressed via `test/setup.ts`.
2. **`disableNetConnect('127.0.0.1')` does NOT cover `localhost`** — `localhost` can
   resolve to IPv6 `::1`. Use `127.0.0.1` everywhere, or skip `disableNetConnect`.

## Canonical hash rules

### Body hash (`computeBodyHash`)
1. UTF-8 decode → strip BOM (`\uFEFF`) → normalize `\r\n` → `\n`, `\r` → `\n`
2. SHA-256. Trailing whitespace is preserved (two trailing spaces = markdown line break).

### Card hash (`computeCardHash`)
1. Extract `(id, front, back)` from each card, ignore study state.
2. Sort by `id` (nulls last, then `front`, then `back`).
3. Join tuples with `\t`, join lines with `\n`. SHA-256.

A test verifies: parse JSON → serialize → parse → same hash as original (reformat-proof).

## Adding a new subcommand

1. Create `src/commands/<name>.ts`
2. Register in `src/index.ts`
3. Add API endpoints to `lib/api/api-client.ts` if needed
4. Write tests in `test/<area>/<name>.spec.ts`
5. Run `pnpm test && pnpm verify:all`

## Known issues

### Rename detection: delete+create instead of rename+patch

When a note directory is renamed on disk (e.g., `Old.md` → `New.md`), the push service
detects it as **delete + create** rather than a single **rename** PATCH.

**Root cause:** change detection runs creates first, deletes second, renames third —
by the time rename checks run, the old entry is already marked for deletion.

**Impact:** Low. Content is preserved (delete+create on server). The rename becomes two
operations instead of one, and the note gets a new content ID on the server.

**Fix:** reorder change detection to run renames before creates/deletes. Deferred to
Phase 2 or a follow-up.

## Local workspace structure

```
~/sapie-workspace/
  .sapie/config.json    # apiBaseUrl, firebaseApiKey
  .sapie/auth.json      # tokens (gitignored, 600)
  .sapie/state.json     # sync state
  AGENTS.md             # auto-generated AI instructions
  My Contents/          # root folder
    FolderA/            # folder → plain dir
    NoteB.md/           # note → dir with .md suffix
      index.md          # body
      decks/Deck.json   # child decks
```

**Discriminator**: directory with `index.md` = note; without = folder.

## PR slicing

- One PR per phase or sub-task group.
- Every PR must pass `pnpm run verify:all && pnpm test` in `packages/cli/`.
- Commit format: `type(cli): description`.
