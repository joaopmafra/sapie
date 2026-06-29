# Skill: Implement a Sapie story end-to-end

Complete lifecycle for shipping a story: pick from backlog → implement backend (Classical TDD) → implement frontend → format/lint/typecheck → run tests → browser smoke test → move PM files → log adoption.

## Prerequisites

- Read the full story file in `docs/pm/`
- Read related research docs and ADRs referenced in the story
- Check the test infrastructure is running (see [Test Infrastructure](#test-infrastructure))

## Workflow

### 1. Scope and prepare

1. Read the story from `docs/pm/3-stories/1-ready/`
2. Move it to `docs/pm/4-in-progress/`
3. Read dependencies (linked stories and docs)
4. Understand the acceptance criteria — these define "done"

### 2. Backend (Classical TDD)

Follow test patterns in `packages/api/src/content/controllers/`:

- **Fixture**: extend `ContentControllerFixture` with helper methods for new endpoints
- **Tests**: write `it(...)` blocks in `content.controller.spec.ts` FIRST, then implement
- **Controller**: add routes to `content.controller.ts` following the existing decorator pattern
- **Service**: add business logic to `content.service.ts`, storage ops to `content-body-storage.service.ts`
- **Module**: register new providers in `content.module.ts`

Verification:
```bash
cd packages/api && pnpm test -- --testPathPattern="content.controller"
cd packages/api && pnpm verify:types
```

### 3. Frontend

Frontend changes are mostly in:
- `packages/web/src/lib/content/` — services, hooks, types, query keys
- `packages/web/src/pages/` — page components and their subdirectories
- `packages/web/src/components/` — shared UI components

Verification:
```bash
cd packages/web && pnpm test -- --testPathPattern="<relevant-pattern>"
cd packages/web && pnpm verify:types
```

### 4. Code quality

Run the full verification chain — format first (fixes most issues), then lint, then type check:

```bash
# Package-level
cd packages/api && pnpm run format && pnpm run lint && pnpm verify:types
cd packages/web && pnpm run format && pnpm run lint && pnpm verify:types

# Or repo-level
pnpm run verify
```

### 5. Browser smoke test

Only when the change is user-visible or you touched the API contract.

**If the dev stack is not running:**
```bash
# Start local-dev (Vite + NestJS + Firebase emulators)
bash scripts/dev-local.sh
# Takes ~30s-60s. Emulators on ports: UI 4002, Auth 9100, Firestore 9200, Storage 9199
# Web: http://localhost:5173, API: http://localhost:3000
```

**Create a test user** (only needed once per emulator session):
```bash
curl -s -X POST \
  http://localhost:9100/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sapie.dev","password":"test1234","returnSecureToken":true}'
```

**Browser testing with OMP's built-in browser tool:**

```javascript
// 1. Open the app
browser.open({ url: "http://localhost:5173/", viewport: { width: 1280, height: 800 } })

// 2. Explore the page with ariaSnapshot
let snapshot = await tab.ariaSnapshot()
// snapshot is YAML — read it to find [ref=eN] ids

// 3. Interact — use refs from the latest snapshot
await tab.click("aria-ref=e15")     // click a button by its aria ref
await tab.fill("aria-ref=e17", "text") // fill a textbox
await tab.type("aria-ref=e117", "content") // type into editor

// 4. Wait for async operations
await new Promise(r => setTimeout(r, 2000))

// 5. Re-snapshot after navigation or dialog opens
snapshot = await tab.ariaSnapshot()

// 6. Screenshot for visual verification
await tab.screenshot()
```

**Important**: after login, the browser session persists across `run` calls. Use `tab.goto()` to navigate.

### 6. Final verification

```bash
# Run full test suite
pnpm run test

# Verify format + lint + types
pnpm run verify
```

Fix any failures before claiming work is done.

### 7. PM hygiene

- Move the story from `docs/pm/4-in-progress/` to `docs/pm/5-done/`
- Update `docs/pm/last_pbi_number.md` if it was a new story
- Update `docs/research/ai_workflow/ai_workflow_adoption_log.md` with a one-line change log entry
- If the story introduced a new API endpoint, update `docs/adr/` or `docs/dev/content_naming.md` as appropriate

### 8. Don't commit

Stage changes for the user to review. Never `git commit` or `git push`.

## Test Infrastructure

### Stack variants

| Purpose | Compose file | Active container | Key ports |
|---------|-------------|------------------|-----------|
| API unit tests | `compose.test-unit.yml` | `sapie-firebase-test-emulator` | UI 4001, Auth 9098, Storage 9199 |
| Local dev (host) | `compose.local-dev.yml` | `sapie-firebase-local-dev` | UI 4002, Auth 9100, Firestore 9200, Storage 9199 |
| Full emulator | `compose.emulator.yml` | `sapie-firebase-full-emulator` | UI 4000, Hosting 5000, Functions 5001 |

### Checking status

```bash
# Which containers are running?
docker ps --filter "name=sapie" --format '{{.Names}} {{.Status}}'

# Is the API responding?
curl -s http://localhost:3000/api/health

# Is Vite serving?
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/

# Is the Auth emulator responding?
curl -s http://localhost:9100/  # local-dev
curl -s http://localhost:9098/  # test-unit
```

### Running tests

```bash
# API (requires test-unit emulator running)
cd packages/api && pnpm test

# Web (no emulator needed — HTTP requests are mocked)
cd packages/web && pnpm test

# Single test file for fast feedback
cd packages/api && pnpm test -- --testPathPattern="content.controller"
cd packages/web && pnpm test -- --testPathPattern="NoteEditorPage"
```

## Blob storage model (Story 75 — current)

Images are stored as blobs under GCS directories, per-content:

```
POST /api/content/:contentId/blobs → 201 { blobId, url }
GET  /api/content/:contentId/blobs/:blobId → image bytes
DELETE /api/content/:id → soft-deletes note, deletes GCS prefix blobs

GCS: {ownerId}/content/{contentId}/blobs/{blobId} (12-char nanoid)
Markdown: ![alt](/api/content/{contentId}/blobs/{blobId})
```

No Firestore. No reconcile. No attachment subcollection.

## Parallel implementation pattern

Backend and frontend changes can run in parallel via `task` subagents when they:
- Touch different packages (api vs web)
- Share a settled API contract
- Each agent runs its own tests

Pass the API contract in the agent's `context`, not in the assignment.

## Common pitfalls

- **Check emulator ports** — local-dev and test-unit use DIFFERENT port namespaces. Auth on 9100 for local-dev, 9098 for test-unit. Don't mix them up.
- **FirebaseUI login flow** — "Sign in with email" → enter email → Next → enter password → Sign In. Two steps, not one.
- **MDXEditor content** — `tab.type` works for entering text. Use keyboard events, not direct DOM manipulation.
- **Vite proxy** — Vite proxies `/api` to `http://localhost:3000` in dev mode. Browser tests go through Vite, API tests go direct.
- **OMP browser filter** — OMP's built-in `browser` tool filters out browser MCP servers (Playwright MCP, Chrome DevTools MCP) by default. Use the built-in `browser` directly.
- **Never commit** — stage changes, let the user review and commit.
