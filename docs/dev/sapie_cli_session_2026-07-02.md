# Session 2026-07-02 — Lessons learned (Sapie CLI Phase 1)

## Nock v14 async lifecycle issue

When running multiple nock-using test suites together (api-client + pull + push),
nock emits `ECONNREFUSED` as unhandled rejections after suite completion. This
happens because nock interceptors are removed (`nock.cleanAll()`) while axios
keep-alive connections are still pending. The async error fires after Jest finishes
and crashes the runner.

**Mitigation (current):** `test/setup.ts` installs `process.prependListener('unhandledRejection')`
that suppresses only nock lifecycle error patterns. All other unhandled rejections
still fail via `process.exitCode = 1`.

**Recommendation for future:** Use Express fake servers instead of nock for CLI
integration tests (pull/push/smoke). Express avoids the async lifecycle issue
entirely. Nock is fine for unit-level api-client tests (single boundary, no
cross-suite interference). The smoke test and QA script already use Express.

## Express preferred over nock for integration tests

The smoke test (`test/smoke/cli.spec.ts`) and QA script (`test/qa/cli-qa.ts`)
both use Express fake servers. This is cleaner: no mock cleanup, no async event
race, random port per suite, inline handlers. For future CLI integration tests,
**prefer Express over nock**.

## `nock.disableNetConnect()` + `enableNetConnect('127.0.0.1')` does NOT cover `localhost`

When testing against `http://localhost:9999`, `enableNetConnect('127.0.0.1')` does
not allow the `localhost` hostname (which can resolve to IPv6 `::1`). The fix is
to either use `127.0.0.1` in both the client URL and the `enableNetConnect` call,
or not use `disableNetConnect` at all.

## Rename detection: delete+create instead of rename+patch

When a note directory is renamed to a different path (e.g., `Old.md` → `New.md`),
the push service detects it as **delete+create** (1 created, 1 deleted) rather than
**rename** (1 renamed). This means the rename is not a single PATCH — it's DELETE + POST,
and the new note gets a new content ID.

**Root cause:** Change detection iterates creates first (finds new path → create),
then deletes (finds old path missing → delete), then renames (entries present in
BOTH state and local). By the time rename runs, the entry is already marked for deletion.

**Fix:** Reorder change detection — detect renames before creates/deletes.

**Severity:** Low for Phase 1. Content is preserved (delete+create keeps data).
Deferred to Phase 2 or a Phase 1 follow-up.

## Root scripts must be updated for new packages

When adding `packages/cli/`, we updated:
- `scripts/verify-all.sh`
- `scripts/lint-all.sh`
- `scripts/format-all.sh`
- `scripts/verify-all-test-unit.sh`
- Root `package.json` (added `test:cli`)

Any future package must follow this pattern.

## Agent skills format

Agent skills live in `.cursor/skills/<name>/SKILL.md`. The format is:
- `# Skill: <Title>` header
- Plain text + code blocks
- No YAML frontmatter or metadata needed
- Referenced from `.cursor/skills/` directory listing

## QA pattern: fake server + execFile

The most reliable way to test the full CLI binary end-to-end is:
1. Stand up an Express server on `app.listen(0, '127.0.0.1')` (random port)
2. Write `.sapie/config.json` + `.sapie/auth.json` with fake credentials
3. Run `node dist/index.js <command> --workspace <tmpdir>` via `child_process.execFile`
4. Read state.json and filesystem to verify results

This avoids the need for real Firebase credentials during QA.
