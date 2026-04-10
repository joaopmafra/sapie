# E2E main journeys — discussion summary and deferred work

**TODO:** This document needs a complete overhaul. Start by verifying the current state of E2E testing to see how we can 
improve from the current status.

**Status:** Planning only. **Not implemented.** TanStack Query refactor is proceeding **without** E2E improvements for
now. Revisit this document when E2E work resumes.

## Why this exists

Before a large client refactor (TanStack Query), we sketched a **small set of end-to-end tests** that exercise real user
flows through hosting, Auth, Functions/API, and Firestore emulators — without maintaining a separate Playwright “API
test” layer (the UI already drives the API).

## Decisions we agreed on

- **Scope**
    - Aim for a few **simple main-scenario** E2E tests, not a large regression suite.
    - No extra Playwright tests whose **primary job** is HTTP/API assertions.

- **Backbone journey (when implemented)**
    - **Log in** with FirebaseUI (email/password).
    - **Create a note** under the root directory.
    - **Rename the note**.

- **Test user**
    - Use **one blessed user** with **fixed email and password in constants**.
    - Do **not** use the dynamic `TEST_USERS` getters in `firebase-auth-utils.ts` for that user.

- **Ensuring the user exists**
    - **Option 2 (procedural):** e.g. Playwright **`globalSetup`** using the existing Auth emulator client helpers
      (`createTestUser` / sign-in on `email-already-in-use`).
    - No Auth emulator export/seed file for now.

- **Isolation**
    - E2E emulators are **fully isolated** from other stacks.
    - **Wiping all Firestore data** in the emulator project is acceptable.

- **Parallelism**
    - Run **all Playwright tests serially** (`workers: 1`, `fullyParallel: false`).
    - Aligns with API tests against emulators and avoids cross-test interference with one blessed user and shared UI
      state.

- **Firestore reset**
    - **Full** emulator clear between tests or files.
    - Exact hook (`beforeEach` vs `beforeAll`) still open.

## Implementation fit (current codebase)

**Already in place:**

- **Stack:** `compose.test-e2e.yml` — hosting, Functions, Auth (9099), Firestore (8080), project `demo-test-e2e`.
- **Auth helpers:** `packages/test-e2e/tests/helpers/firebase-auth-utils.ts` — connects to `127.0.0.1:9099`,
  create/sign-in users, tokens for API-style tests.
- **User journey in the app:** `ProtectedRoute` → `AppLayout` → `NavigationDrawer` with **New** → **Create Note** →
  `CreateNoteModal`; root is implied when nothing is selected (`selectedNodeId || 'root'`). Rename on `NoteEditorPage` (
  title click → field → save).
- **Post-wipe behavior:** `GET /api/content/root` is idempotent and **creates** the root directory if missing, so a full
  Firestore wipe + same Auth user still yields a fresh workspace on next load.
- **Firestore clear logic:** `packages/api/src/test-helpers/firestore.helper.ts` — `DELETE` against the Firestore
  emulator REST clear endpoint (used in-process from Jest/API tests today).

**Not aligned yet with the plan:**

- **Playwright:** `playwright.config.ts` uses `fullyParallel: true` and **`workers: 1` only when `CI`** — local runs can
  still parallelize.
- **No `globalSetup`** for blessed user or Firestore reset.
- **`TEST_USERS`** uses unique emails per read — **wrong shape** for a fixed blessed E2E user; add separate constants.
- **Firestore reset from Playwright:** the clear helper is **not** exposed as HTTP today; E2E would either duplicate the
  same DELETE URL on the host (`127.0.0.1:8080`, project `demo-test-e2e`) or add a **test-only API route** that wraps
  `clearFirestoreData()` (not built yet).
- **Selectors:** Some flows lack `data-testid`; journey tests may rely on roles/labels (e.g. button **New**, **Create
  New Note**) unless UI is hardened later.
- **Stale specs:** `content-workspace.spec.ts` has skipped “authenticated user” blocks with expectations that do not
  match the current **Workspace + drawer** UI.

## Open questions (for when work resumes)

1. **Reset mechanism:** Prefer **direct emulator DELETE** from `test-e2e` (no Nest change) vs a **test-only Nest
   endpoint** guarded for emulator/test-e2e only?
2. **Reset frequency:** `beforeEach` (stricter, slower) vs once per file / `beforeAll`?
3. **Consolidation:** Trim duplicate unauthenticated “redirect to login” tests across `app.spec.ts`,
   `auth/login.spec.ts`, and `content-workspace.spec.ts`?

## References

- E2E package: `packages/test-e2e/README.md`, `playwright.config.ts`
- Contributing (E2E not maintained during MVP unless a story requires it): `docs/dev/contributing_guidelines.md`
- TanStack Query plan: `docs/research/client_state_management/phase_1_tanstack_query.md`
- Firestore clear helper: `packages/api/src/test-helpers/firestore.helper.ts`
