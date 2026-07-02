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
pnpm test               # jest (92 tests, 6 suites)
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
| HTTP (Sapie API) | nock interceptors |
| Filesystem | `os.tmpdir()` subdirectories |

**No Firebase emulator needed.** CLI tests run standalone against `nock` + real fs.

### Test files

| File | Tests | Style |
|------|-------|-------|
| `test/state/hashing.spec.ts` | 24 | Pure functions |
| `test/state/state.service.spec.ts` | 22 | fs round-trip + hash detection |
| `test/auth/token-store.spec.ts` | 10 | fs round-trip |
| `test/api/api-client.spec.ts` | 20 | nock HTTP boundary |
| `test/sync/pull.service.spec.ts` | 7 | nock + fs integration |
| `test/sync/push.service.spec.ts` | 9 | nock + fs integration |
| `test/smoke/cli.spec.ts` | 1 | End-to-end binary call + round-trip |

### Nock vs Express trade-off

Integration tests (`pull`, `push`) use **nock** for HTTP mocking. Nock v14 has a known async
lifecycle issue: interceptors emit `ECONNREFUSED` as unhandled rejections when removed while
axios keep-alive connections are pending. `test/setup.ts` suppresses these specific patterns.

If nock becomes too painful for a new test, switch to **Express**:
stand up `app.listen(0, '127.0.0.1')`, write inline handlers, use a real TCP connection.
This avoids the async cleanup issue at the cost of slightly more setup boilerplate.

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
