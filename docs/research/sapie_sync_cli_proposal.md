# Sapie Sync CLI — Feature Proposal (v4)

## Summary

A new package `packages/cli/` — `@sapie/cli` — that synchronizes the user's content tree between Sapie's backend and a local filesystem directory. The local copy serves as a **versioned backup** (managed via Git) and as a **lightweight editing surface for AI agents**, providing a simpler alternative to the planned MCP server for the immediate term.

**Core command:** `sapie` with subcommands: `login`, `logout`, `pull`, `push`, `status`, `deck`.

**Design principle:** The local filesystem is a **mirror**, not the source of truth. Sapie's backend always owns the authoritative state.

---

## Motivation

1. **Versioned backup.** Syncing to a local Git repo provides immediate version history.
2. **AI agent editing surface.** AI agents read/write files natively. The CLI bridges to Sapie.
3. **Batch operations.** Bulk creation, renames, reorganization.
4. **Offline editing.** Write without a browser; push when back online.

---

## Local Directory Structure

```
~/sapie-workspace/              # any path the user chooses
  AGENTS.md                     # auto-generated instructions for AI agents
  .gitignore                    # auto-generated
  .sapie/
    config.json                 # API base URL
    auth.json                   # Firebase tokens (gitignored)
    state.json                  # sync state (see schema below)
  My Contents/                  # root folder (named after Sapie root)
    DSA/                        # folder → plain directory
      Arrays.md/                # note → directory with `.md` suffix
        index.md                # note body (markdown)
        blobs/                  # inline images (deferred)
        decks/                  # child decks
          Ch1 Questions.json
      Linked Lists.md/
        index.md
        decks/
          Linked List Ops.json
```

**Rules:**

- **Folder → plain directory.**
- **Note → directory ending in `.md`.** Contains `index.md` (body), `blobs/` (deferred), `decks/`.
- **Deck → `.json` file** inside `decks/`. File name = deck name.
- **Card → object** in the deck JSON's `cards` array.

### Why notes are directories

1. Notes can have children (decks, blobs). A flat file can't hold children.
2. No clash with tooling files. A root `AGENTS.md` file and a note named "AGENTS" coexist — the note becomes `AGENTS.md/` directory, the tooling file stays `AGENTS.md`.
3. Renders in markdown editors via `index.md`.

### Markdown Link Translation (Phase 2)

Notes may reference inline images (`![alt](blob:<blobId>)`) and, in the future, other notes. These URLs must be translated between remote and local forms.

The CLI uses a **service class** wrapping a markdown AST library:

```typescript
// packages/cli/src/lib/markdown/markdown.service.ts
interface MarkdownService {
  transformUrls(markdown: string, fn: (url: string, nodeType: 'link' | 'image') => string): string;
  findImageUrls(markdown: string): string[];
  validate(markdown: string, knownBlobIds?: Set<string>): ValidationIssue[];
}
```

Implementation uses `mdast-util-from-markdown` + `mdast-util-to-markdown` + `mdast-util-gfm` (the micromark ecosystem — lightweight, ESM). The service class is an **indirection layer** so the underlying library can be swapped without changing callers.

This lives in the CLI until a second consumer exists (the API for orphan blob detection). At that point it's extracted to `@sapie/markdown`. See [Shared Packages](#shared-packages--the-firebasepnpm-constraint).

**Phase 1 note:** Link translation is deferred to Phase 2. Phase 1 syncs raw markdown bytes without transformation — sufficient for AI-generated content where agents don't embed images yet.

---

## Sync State Schema

```typescript
// .sapie/state.json
interface SyncState {
  version: 1;
  lastSyncAt: string;                 // ISO 8601
  rootId: string;                     // Sapie root folder ID
  bodyHashByContentId: Record<string, string>;  // SHA-256 of last-synced body bytes
  entries: Record<string, SyncEntry>;           // keyed by content ID
}

interface SyncEntry {
  id: string;
  type: 'directory' | 'note' | 'deck';
  name: string;
  parentId: string | null;
  updatedAt: string;                  // ISO 8601 — metadata timestamp
  bodyUpdatedAt: string | null;       // ISO 8601 — body bytes (null for dirs / no body)
  localPath: string;                  // relative path from workspace root
}

// Deck entries carry card tracking for diff detection:
interface DeckSyncEntry extends SyncEntry {
  type: 'deck';
  cardIds: string[];                  // ordered list of card IDs
  cardHash: string;                   // SHA-256 of JSON cards array
}
```

---

## Configuration

```json
// .sapie/config.json
{
  "apiBaseUrl": "https://api.sapie.dev/api"
}
```

Auth tokens in `.sapie/auth.json` (gitignored, `600` permissions).

---

## Authentication

### Email/Password (Phase 1)

```
$ sapie login
Email: user@example.com
Password: ********
✓ Logged in as user@example.com
```

Uses Firebase Auth REST API (`signInWithPassword`). The user must have an email/password credential linked to their Firebase account.

### Google Sign-In (Phase 2)

1. `sapie login` starts a local HTTP server on a random port.
2. Opens browser to Google OAuth consent screen with `redirect_uri=http://localhost:<port>/callback`.
3. Callback receives the Google ID token.
4. Exchanges with Firebase Auth REST API (`signInWithIdp`) → Firebase ID token + refresh token.
5. Stores in `.sapie/auth.json`.

Same pattern as `gcloud auth login`. Phase 1 uses `--method email` as the fallback for headless/CI.

### Token Refresh

On every API call: check expiry, refresh via `securetoken.googleapis.com` if within 5 min of expiry. Transparent.

`sapie logout` deletes `.sapie/auth.json`.

---

## Commands

### `sapie pull`

Fetches the entire content tree and writes to the local workspace.

**Algorithm:**

1. Auth (refresh if needed).
2. `GET /api/content/root` → root folder.
3. Recursively walk:
   - Folder: `GET /api/content/:id/children` → list children.
   - Note: `GET /api/content/:id/body` → write to `index.md`.
   - Deck: `GET /api/content/:deckId/cards` → write JSON to `decks/`.
   - Filter out `deleted: true`.
4. Create local directory structure.
5. Generate `AGENTS.md` and `.gitignore` if absent (first run only — never overwrite user edits).
6. Write `.sapie/state.json`.
7. Report: `✓ Pulled 3 folders, 12 notes, 2 decks (5 new, 12 unchanged)`.

**First run:** Creates workspace directory + `.sapie/` if needed.

### `sapie push`

Detects local changes and pushes to the API.

**Phases (in order):**

1. **Acquire lock** — `POST /api/sync/lock`. Abort if already locked and not expired. (Phase 3; Phase 1–2 skip — rely on `expectedRevision` only.)
2. **Detect changes** — walk local tree, compare against `state.json`:
   - New file/dir → `POST /api/content`
   - Modified `index.md` → `PUT /api/content/:id/body?expectedRevision=...`
   - Renamed directory → `PATCH /api/content/:id`
   - Deleted file/dir → `DELETE /api/content/:id?cascade=true`
   - Deck card changes → card CRUD (see [Deck & Card Syncing](#deck--card-syncing))
3. **Apply in order:** creates → renames → body updates → card changes → deletes.
4. **Release lock** — `DELETE /api/sync/lock`. (Phase 3)
5. **Update state** — write `.sapie/state.json`.
6. Report: `✓ Pushed: 2 created, 3 updated, 1 renamed, 1 deleted, 2 conflicts`.

**Change detection (priority order):**
1. Existence vs. state (new/deleted).
2. Content hash (SHA-256) vs. `bodyHashByContentId` in state.
3. mtime vs. `lastSyncAt` (fallback).
4. Name mismatch.

**Conflict handling:** `409 Conflict` from `expectedRevision` → skip file, report, continue. After push, user runs `pull` to resolve.

### `sapie status` (Phase 2)

Dry-run push. Shows what changed without applying.

```
$ sapie status
Changes to push:
  + AI Engineering/GPT Architecture.md/            (new note)
  ~ DSA/Arrays.md/index.md                         (modified body)
  ~ DSA/Linked Lists.md/ → DSA/Lists.md/           (renamed)
  + DSA/Arrays.md/decks/Ch1 Questions.json         (new deck)
  ~ DSA/Arrays.md/decks/Ch1 Questions.json         (cards: +2 −1)
  - Old Notes/Scratchpad.md/                       (deleted)
  ! DSA/Sorting.md/index.md                        (conflict: remote modified)

4 changes, 1 conflict — run `sapie pull` to resolve.
```

### `sapie deck` (Phase 2)

Local-only JSON manipulation. Offline. Changes pushed via `sapie push`.

```
sapie deck create "Note.md/" --name "Ch1 Questions"
sapie deck ls "Note.md/decks/Ch1 Questions.json"
sapie deck add "..." --front "Q" --back "A"
sapie deck edit "..." --index 2 --front "Updated Q"
sapie deck rm "..." --index 2
sapie deck move "..." --from 3 --to 0
```

Phase 1 users edit deck JSON files directly — the format is documented in AGENTS.md.

---

## Deck & Card Syncing

### Local format

```json
// DSA/Arrays.md/decks/Ch1 Questions.json
{
  "name": "Ch1 Questions",
  "cards": [
    {
      "id": "abc123",
      "front": "What is an array?",
      "back": "A contiguous block of memory.",
      "dueDate": "2026-07-05T00:00:00.000Z",
      "interval": 2,
      "repetitions": 1,
      "lastResult": "know",
      "lastStudied": "2026-07-03T00:00:00.000Z",
      "correctCount": 1,
      "incorrectCount": 0
    }
  ]
}
```

- `id`: Sapie card ID. `null` for new (unpushed) cards.
- Study state fields (`dueDate`, `interval`, `repetitions`, `lastResult`, `lastStudied`, `correctCount`, `incorrectCount`): **read-only**. Never pushed. Populated on pull for reference only. Study happens on Sapie Web.
- Card order in the array is preserved.

### Push diff

1. Load deck JSON + previous `cardIds` + `cardHash` from state.
2. Skip if `cardHash` unchanged (fast path).
3. Cards with `id: null` → `POST /api/content/:deckId/cards`.
4. Cards with known `id` but changed `front`/`back` → `PATCH`.
5. `cardIds` no longer present → `DELETE`.
6. After each API call, update local `id` (for new cards) and state.

### Deck creation on push

New `.json` in `decks/` → `POST /api/content` with `type: 'deck'`, `parentId: <noteId>`.

---

## Pessimistic Locking (Phase 3)

```
Firestore: locks/{ownerId}

{
  ownerId: string,
  lockedAt: Timestamp,
  expiresAt: Timestamp,      // lockedAt + 5 min
  resourceIds: string[],
  operation: 'sync-push',
  instanceId: string,        // random UUID
}
```

**API endpoints:**

- `POST /api/sync/lock` — acquire (409 if already locked and not expired)
- `DELETE /api/sync/lock` — release
- `GET /api/sync/lock` — check status

**Limitations (documented):**
- Web UI does not check locks — `expectedRevision` is the safety net for concurrent web edits.
- Single user-level lock (no per-resource locking).
- Lock-aware web UI middleware is deferred (tracked in `docs/research/sapie_sync_locking_roadmap.md`).

---

## AGENTS.md & .gitignore

Generated on first `pull` at workspace root. Never overwritten if the user has edited them.

### AGENTS.md content

- Directory structure explanation (folders vs. notes vs. decks)
- How to edit notes (edit `index.md` files)
- How to create decks (create JSON in `decks/`, or use `sapie deck` after Phase 2)
- Deck JSON format reference
- Sync commands reference (`pull`, `push`, `status`)
- Git workflow suggestion

### .gitignore

```gitignore
# Sapie sync state
.sapie/auth.json
.sapie/state.json

# OS
.DS_Store
Thumbs.db

# Editor
*.swp
*.swo
*~
```

Content files (notes, decks) are intentionally **not** gitignored — they are the versioned payload.

---

## API Changes Required

### New endpoints (Phase 3 only)

```
POST   /api/sync/lock
DELETE /api/sync/lock
GET    /api/sync/lock
```

### No other changes

The existing REST API fully supports the CLI. No batch endpoints, no `?type=` filter, no new content endpoints.

---

## Shared Packages & the Firebase/pnpm Constraint

### The constraint

This project does **not** use pnpm workspaces. Packages are installed independently ([development_environment_setup.md](../dev/development_environment_setup.md#firebase-and-monorepo-tooling)). Firebase Cloud Functions packages only `packages/api/` on deploy — workspace dependencies would be missing at runtime.

### Approach

Shared code starts in the CLI. Extraction happens only when a **second consumer** exists.

| Phase | Markdown AST | Validation | Where |
|-------|-------------|------------|-------|
| 1 | Not used (raw bytes) | Inline in CLI | `packages/cli/src/lib/` |
| 2 | `MarkdownService` class in CLI | Inline in CLI | `packages/cli/src/lib/` |
| 3 | Extract to `@sapie/markdown` | Extract to `@sapie/validation` | Shared packages |

When extraction happens:
- Packages are pure TypeScript with **zero Firebase dependencies**.
- The API consumes them via a build step that copies/bundles the shared source into its `dist/`.
- The specific bundling strategy is designed at extraction time.

### `@sapie/markdown` (Phase 3, future)

```typescript
interface MarkdownService {
  transformUrls(markdown: string, fn: (url: string, nodeType: 'link' | 'image') => string): string;
  findImageUrls(markdown: string): string[];
  validate(markdown: string, knownBlobIds?: Set<string>): ValidationIssue[];
}
```

### `@sapie/validation` (Phase 3, future)

Extracted from `packages/api/src/content/validation/`. Pure functions only.

---

## Implementation Phases

Each phase is a **complete, usable vertical slice** — following the pattern from [iterative_development_example_note_editor.md](../dev/iterative_development_example_note_editor.md). Tests are written **within each phase** for the behavior that phase introduces, per [TDD baby steps](../dev/tdd_baby_steps.md) and [contributing guidelines](../dev/contributing_guidelines.md) (classical school, fakes at external boundaries).

### Phase 1: Make it work (skateboard)

**What you can do:** Full round-trip sync. Login with email, pull your content tree (notes, folders, decks), edit files with AI agents, push changes back, commit to Git.

**What's deferred:** Google login, markdown link translation, `sapie status`, `sapie deck` subcommands, pessimistic locking, shared packages, blob sync.

| # | Task | Tests |
|---|------|-------|
| 1.1 | Scaffold `packages/cli/` (package.json, tsconfig, yargs entry point) | — |
| 1.2 | Auth: email/password login, token refresh, logout | Auth flow: success, wrong password, token expiry, refresh |
| 1.3 | API client: typed HTTP wrapper with token injection, error handling | Error responses → typed errors; token injection |
| 1.4 | State: read/write `.sapie/state.json`, content hashing | Round-trip: write → read → identical |
| 1.5 | `pull`: recursive tree walk, write notes + folders + decks to disk | Pull empty root, pull with notes+folders+decks, pull with deleted content filtered |
| 1.6 | `push`: change detection, CRUD for all content types, deck card diff | Create note, modify body, rename folder, delete with cascade, deck card add/update/delete, conflict 409 handling |
| 1.7 | `AGENTS.md` + `.gitignore` generation on first pull | First pull generates; second pull doesn't overwrite |
| 1.8 | End-to-end smoke test: pull → edit → push → pull → verify | Round-trip integrity |

**Test strategy:** The CLI's external boundary is the HTTP API. Tests use a fake HTTP server (e.g., `nock` or a lightweight Express server in test setup) that responds with known fixtures. State and file I/O are tested with real `fs` against temp directories. This follows the Classical school: real internal collaborators, fakes only at the network boundary.

### Phase 2: Make it right (bicycle)

**What you can do:** Everything from Phase 1, plus Google login, markdown images reference correctly between local and remote, preview changes with `status`, manage decks with `sapie deck` subcommands.

| # | Task | Tests |
|---|------|-------|
| 2.1 | Google Sign-In (OAuth callback server) | OAuth flow, callback parsing, token exchange errors |
| 2.2 | `MarkdownService` + link translation on pull/push | Remote→local URL transform, local→remote, round-trip identity (parse→serialize unchanged), image URL detection |
| 2.3 | `sapie status` (dry-run push) | Status output matches push actions; no mutations |
| 2.4 | `sapie deck` subcommands (create, ls, add, edit, rm, move) | Each subcommand: valid input, invalid index, file-not-found |

### Phase 3: Make it fast + safe (motorcycle)

**What you can do:** Everything from Phase 2, plus safe from concurrent CLI runs, faster pulls on large trees, streamlined code via shared packages.

| # | Task | Tests |
|---|------|-------|
| 3.1 | Lock API endpoints (`POST`/`DELETE`/`GET /api/sync/lock`) | Acquire, release, check, expired lock overwrite, concurrent acquire → 409 |
| 3.2 | Lock integration in `push` (acquire → phases → release) | Lock held during push, released on success/failure, `--abort` releases |
| 3.3 | Parallel body downloads on `pull` | Same results as sequential; faster on multi-note trees |
| 3.4 | Extract `@sapie/markdown` (when API needs it) | Existing tests pass after extraction |
| 3.5 | Extract `@sapie/validation` (when second consumer exists) | Existing tests pass after extraction |

### Deferred (not a phase — tracked for later)

These are explicitly **not** in any phase. They are separate enhancements tracked for when the need is concrete:

- **Blob/image sync** (download images on pull, upload new images on push, translate blob URLs in markdown). Requires the `MarkdownService` from Phase 2 + blob upload/download infrastructure. 2–3× complexity increase.
- **Lock-aware web UI middleware** (API rejects writes while a CLI lock is held). Requires lock endpoints from Phase 3 + frontend awareness.
- **Note-to-note linking** (when the feature exists in Sapie, add `note:<noteId>` URL translation to the `MarkdownService`).

---

## Decisions Settled

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deck file format | JSON | Universal for AI agents; `sapie deck` subcommands abstract editing for humans |
| Lock management | API endpoints | Keeps CLI Firebase-free; single place to evolve locking logic |
| Markdown library | `mdast-util-from-markdown` + `mdast-util-to-markdown` + `mdast-util-gfm` | Lightweight (~50KB), ESM, wrapped in service class for swappability |
| Blob sync | Deferred | 2–3× complexity; text + deck sync meets immediate needs |
| Card study state | Read-only locally | Study happens on Sapie Web; only `front`/`back` are pushable |
| `?type=` filter | Client-side | No API change; revisit if profiling shows need |
| Shared packages in Phase 1 | No | Firebase Functions can't resolve workspace deps; extract when second consumer exists |
| CLI name | `sapie` | Single binary with subcommands |
| Notes as directories | Yes (`.md/` suffix) | Enables children (decks, blobs); no clash with tooling files |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Large tree (1000+ notes) makes pull slow | Phase 3: parallelize body downloads. Client-side filtering avoids overhead. |
| Concurrent edits (web + CLI) | Phase 1–2: `expectedRevision` catches body conflicts. Phase 3: pessimistic locking. |
| Google OAuth callback fails (port blocked, headless) | `--method email` fallback; document port override |
| Markdown AST transformation corrupts content | Round-trip identity test: parse→serialize (no transforms) must produce identical output |
| Lock crash leaves stale lock | 5-min auto-expire; `sapie push --abort` for manual cleanup |
| Card reordering (user changes array order) | Detect via `cardIds` comparison; push as individual PATCH calls |
| Email/password not set up on Firebase account | Document how to add email/password provider in Firebase console |
