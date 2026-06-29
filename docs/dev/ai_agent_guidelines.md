# AI agent guidelines

Rules for automated assistants (Cursor, Copilot, etc.) working on Sapie. Human contributors should read
[contributing_guidelines.md](contributing_guidelines.md) first. Product priority is always **MVP quickly**
([general.mdc](../../.cursor/rules/general.mdc), [mvp_objective.md](../plans/mvp_objective.md)).

## Delivery style

Prefer **small, end-to-end slices** ([iterative_development.md](iterative_development.md)): simplest thing that works,
then extend. Do not gold-plate architecture while the study tool is still incomplete.

## Story execution

- Read the full story before changing code.
- Follow task order; if you cannot, ask the user.
- Complete implementation, tests (when the story requires them), and documentation updates for tasks you touch.
- Check acceptance criteria before calling a task done.
- Mark checklist items in the story as you go; **do not** mark the whole story “done” — the human verifies and moves
  PM files.

## Verification after changes

Run scripts after substantive edits (exact names may vary; use repo scripts):

- `./scripts/format-lint-all.sh` after code changes
- `./scripts/verify-all.sh` before claiming work is clean
- `./scripts/verify-test-all.sh` when tests are part of the deliverable

If a script fails, fix or report before moving on.

## Firebase emulators (Docker Compose)

Copy-paste-oriented map (decisions and inventory: [
`docs/adr/0001-firebase-emulators-docker-compose.md`](../adr/0001-firebase-emulators-docker-compose.md)):

- **Full stack, `emulator` → `demo-emulator`**
    - Compose: [`compose.emulator.yml`](../../compose.emulator.yml)
    - Run: `pnpm emulator` → [`scripts/build-run-on-emulator.sh`](../../scripts/build-run-on-emulator.sh)
- **API unit tests**
    - Compose: [`compose.test-unit.yml`](../../compose.test-unit.yml)
    - Helpers:
        - [`scripts/emulator-test-unit-start.sh`](../../scripts/emulator-test-unit-start.sh)
        - [`scripts/emulator-test-unit-stop.sh`](../../scripts/emulator-test-unit-stop.sh)
        - [`scripts/emulator-test-unit-remove.sh`](../../scripts/emulator-test-unit-remove.sh)
- **Playwright E2E**
    - Compose: [`compose.test-e2e.yml`](../../compose.test-e2e.yml)
    - Run: `scripts/build-all.sh test-e2e` then `docker compose -f compose.test-e2e.yml up --build -d --wait`; same
      ports as full emulator — **one stack at a time**
- **Local hybrid dev**
    - Compose: [`compose.local-dev.yml`](../../compose.local-dev.yml)
    - Run: [`scripts/dev-local.sh`](../../scripts/dev-local.sh) (Ctrl+C to stop)

## Honesty and verification

**Do not claim what you have not verified.**

- Before marking a **test** task complete: run the relevant tests; they must pass. Inspecting code is not enough.
- Before claiming an endpoint or feature works: confirm it exists in the codebase (and run it when feasible).
- If something is deferred or unknown, say so — e.g. “implementation done, tests deferred per story,” “cannot run
  tests in this environment.”

Avoid confident language (“all tests pass,” “comprehensive coverage”) unless you actually ran the tests and checked the
scope.

### Repository hygiene

- Do **not** commit for the user; stage and let them review and commit.
- Delete files only when part of the task (e.g. rename removes the old path).
- Remove unused dependencies and dead code from abandoned approaches.

## Don’ts (summary)

- Multiple stories at once.
- Skipping lint/type failures.
- Marking test tasks complete without running tests.
- Unverified claims about behavior or coverage.

For test philosophy (Classical TDD on the API, E2E not maintained for MVP unless a story says otherwise), see
[contributing_guidelines.md](contributing_guidelines.md#testing-expectations) and
[unit_testing_sapie.md — controller-first, avoid mockist service specs](unit_testing_sapie.md#avoid-mockist-service-specs-for-orchestration-code).
## Browser testing (OMP built-in browser)

For user-visible changes and API smoke tests, use the OMP `browser` tool:

- `browser.open({ url, viewport })` — opens a tab; persists across `run` calls
- `tab.ariaSnapshot()` — returns YAML with `[ref=eN]` ids for all interactive elements
- `tab.click("aria-ref=eN")` — click by ref (must use ref from LATEST snapshot)
- `tab.fill("aria-ref=eN", "text")` — fill a textbox
- `tab.type("aria-ref=eN", "content")` — type keystrokes into an editor
- `tab.screenshot()` — capture visual state
- `tab.goto(url)` — navigate; clears element refs
- Re-snapshot after navigation, dialog opens, or form transitions

**FirebaseUI login** is two-step: email → Next → password → Sign In.
**MDXEditor** accepts real keyboard events via `tab.type`.

Test user for local-dev (create once per emulator session):
```bash
curl -s -X POST http://localhost:9100/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sapie.dev","password":"test1234","returnSecureToken":true}'
```

## Blob storage model (Story 75)

Images are GCS-only blobs, directory-per-content, no Firestore:

- `POST /api/content/:contentId/blobs` — one-step upload → `{ blobId, url }`
- `GET /api/content/:contentId/blobs/:blobId` — stream with ownership check
- Delete cascade: soft-delete note → list GCS prefix → delete all objects
- Markdown URL: `![alt](/api/content/{contentId}/blobs/{blobId})`
- `blobId` is 12-char nanoid, unique within content's GCS prefix
- GCS path: `{ownerId}/content/{contentId}/blobs/{blobId}`

`AttachmentService`, `AttachmentRepository`, `parse-attachment-urls-from-markdown` are **removed**.
`expectedRevision` on `PUT /:id/body` is **removed** (reconcile no longer exists).

## Test infrastructure quick reference

| Purpose | Container | Auth port | Storage port |
|---|------|------|---|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | 9199 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9199 |

```bash
docker ps --filter "name=sapie"  # check running stacks
curl -s http://localhost:3000/api/health  # API check
```

## Parallel story implementation

Backend and frontend can be implemented in parallel via `task` subagents when:
- They touch different packages (`packages/api` vs `packages/web`)
- Share a settled API contract (passed in the agent's `context`)
- Each agent runs its own tests independently

This cuts wall-clock time for full-stack stories.
