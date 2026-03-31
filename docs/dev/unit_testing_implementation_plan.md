# Unit Testing Implementation Plan

This document is a step-by-step plan to implement the unit testing infrastructure described in
[Unit Testing — Sapie Implementation](unit_testing_sapie.md). Each step is small, independently
verifiable, and leaves the codebase in a working state.

All unit tests are co-located with their source files in `src/` and follow the `*.spec.ts`
naming convention. The existing Jest configuration in `package.json` requires no changes to
support this layout.

---

## Phase 1 — Project Cleanup

These steps require no running infrastructure. They are pure housekeeping and can be completed
and verified offline.

### Step 1 — Delete boilerplate test files from `test/`

The NestJS CLI generated two test files in `test/` that duplicate coverage already provided
by the co-located spec files in `src/`. Delete them:

- `test/app.e2e-spec.ts`
- `test/health/health.e2e-spec.ts`

The `test/` directory then contains only `jest-e2e.json`, which is kept for future real E2E
tests.

**Verify:** Run `pnpm test`. The two deleted files are no longer discovered (they were not
matched by the default Jest config anyway, since it uses `rootDir: "src"`). All existing tests
in `src/` still pass.

Status: Done

---

### Step 2 — Simplify test scripts in `package.json`

Remove `test:watch` and `test:all`. Keep `test:e2e` (reserved for future real E2E use).
Leave `test` unchanged for now — emulator env vars will be added in Phase 2.

```json
"test": "jest",
"test:e2e": "jest --config ./test/jest-e2e.json",
"test:cov": "jest --coverage",
"test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand"
```

**Verify:** Run `pnpm test`. All existing tests pass. Confirm `test:watch` and `test:all` are
gone from the scripts.

Status: Done

---

## Phase 2 — Firebase Emulator Test Container

### Step 3 — Create the test emulator Docker setup

Create a `docker-compose.test.yml` in the project root. Use a dedicated
`firebase.test-unit.json` for the test container so **host and container use the same
emulator ports** (the Emulator UI runs in the browser and follows URLs advertised by the
suite; remapping e.g. `8181:8080` breaks Firestore and the WebSocket `requests` channel).

Typical ports in that file (see repo root `firebase.test-unit.json`):

- Firestore HTTP: `8181`
- Firestore WebSocket (UI): `9160` (`websocketPort`; avoids host conflict with dev default `9150`)
- Auth: `9199`
- Emulator UI: `4001`
- Emulator Hub: `4410` (avoids clashing with a local dev hub on `4400`)
- Logging: `4510`

Use a custom `Dockerfile` based on `node:22-alpine` rather than a pre-built third-party image.
Install the Firebase CLI (pin the version) and OpenJDK (required by the emulators). Copy
`firebase.test-unit.json` and `.firebaserc` into the container and run
`firebase emulators:start --config firebase.test-unit.json`.

Apply a `tmpfs` mount to the Firestore data directory for in-memory speed and ephemeral data.

**Verify:** Run `docker compose -f docker-compose.test.yml up`. The emulator UI should be
accessible at `http://localhost:4001`. Confirm Firestore is reachable:

```bash
curl http://localhost:8181/
```

Confirm the dev emulator (if running) is unaffected on its own ports.

Status: Done

---

### Step 4 — Create helper scripts for the test container

Create two scripts:

- `scripts/start-test-emulator.sh` — starts the container if not already running
- `scripts/stop-test-emulator.sh` — stops and removes the container

The start script should check whether the container is already running and exit gracefully if
it is, supporting the long-lived container workflow.

**Verify:** Run `start-test-emulator.sh` twice. The second invocation should detect the
already-running container and not start a duplicate. Run `stop-test-emulator.sh` and confirm
the container exits. Run the start script again to confirm a clean restart.

Status: Done

---

### Step 5 — Wire the test suite to the test emulator

Update the `test` script in `package.json` to set the emulator environment variables:

```json
"test": "CURRENT_ENV=test FIREBASE_USE_EMULATOR=true FIRESTORE_EMULATOR_HOST=localhost:8181 FIREBASE_AUTH_EMULATOR_HOST=localhost:9199 GCLOUD_PROJECT=sapie-test jest"
```

**Verify:** With the test container running, run `pnpm test`. All existing tests pass. With
the container stopped, run `pnpm test` — expect the NestJS app to fail to initialise,
confirming the suite now depends on the emulator.

Status: Done

---

## Phase 3 — Test Helper Infrastructure

### Step 6 — Create the FakeAuthGuard

Create `src/test-helpers/fake-auth.guard.ts`. The fake guard:

- Reads a user ID from a `X-Test-User-Id` request header.
- Constructs a minimal object with `uid` set to that value and attaches it to `request.user`.
- Always returns `true`.

**Verify:** Update the existing `src/health/health.controller.spec.ts` to bootstrap `AppModule`
using `overrideProvider(AuthGuard).useClass(FakeAuthGuard)` and make a real HTTP request via
`supertest`. Run `pnpm test` and confirm the test passes. This validates the override wiring
before any new tests are written.

Status: Pending

---

### Step 7 — Create the Firestore clear helper

Create `src/test-helpers/firestore.helper.ts` with a `clearFirestoreData()` function that
calls:

```
DELETE http://localhost:{FIRESTORE_PORT}/emulator/v1/projects/{PROJECT_ID}/databases/(default)/documents
```

Port and project ID are read from the `FIRESTORE_EMULATOR_HOST` and `GCLOUD_PROJECT` env vars.

**Verify:** Write a temporary test that seeds a document directly via the Firestore Admin SDK,
calls `clearFirestoreData()`, then reads the same collection and asserts it is empty.

Status: Pending

---

### Step 8 — Create a shared test app factory

Create `src/test-helpers/app.helper.ts` with a `createTestApp()` function that:

1. Builds `AppModule` with `overrideProvider(AuthGuard).useClass(FakeAuthGuard)`.
2. Initialises the NestJS application.
3. Returns the `INestApplication` instance.

Update `src/health/health.controller.spec.ts` and `src/app.controller.spec.ts` to use
`createTestApp()` and add `clearFirestoreData()` in their `beforeEach`.

**Verify:** Run `pnpm test`. All existing tests pass using the shared factory.

Status: Pending

---

## Phase 4 — First Real Tests for ContentController

At this point the infrastructure is complete. These steps write the first meaningful tests
against real application behaviors. All tests go in
`src/content/controllers/content.controller.spec.ts`.

### Step 9 — Test: create root directory

First test: `GET /api/content/root` creates and returns the root directory for the authenticated
user.

- `beforeEach`: call `clearFirestoreData()`.
- Request: `GET /api/content/root` with `X-Test-User-Id: user-1`.
- Assert: 200, body has `type: "directory"`, `parentId: null`, `ownerId: "user-1"`.
- Call the endpoint a second time with the same user and assert the same document ID is
  returned (idempotent — no duplicate root directory created).

**Verify:** Run `pnpm test`. New test passes.

Status: Pending

---

### Step 10 — Test: create a note (happy path)

- Seed a parent directory via `GET /api/content/root` as `user-1`.
- `POST /api/content` with `{ name: "My Note", parentId: <rootId> }` and
  `X-Test-User-Id: user-1`.
- Assert: 201, body has `name: "My Note"`, `type: "note"`, `ownerId: "user-1"`.

**Verify:** Run `pnpm test`. New test passes.

Status: Pending

---

### Step 11 — Test: duplicate name is rejected

- Create a note named `"My Note"` under the root directory.
- Attempt to create a second note with the same name in the same parent.
- Assert: 409 Conflict.

**Verify:** Run `pnpm test`. New test passes.

Status: Pending

---

### Step 12 — Test: wrong owner is rejected

- `GET /api/content/root` as `user-1` to create the root directory.
- `POST /api/content` as `user-2` with `parentId` set to `user-1`'s root directory ID.
- Assert: 403 Forbidden.

**Verify:** Run `pnpm test`. New test passes.

Status: Pending

---

### Step 13 — Test: list content

- Create two notes under the root directory as `user-1`.
- Create one note under a separate root directory as `user-2`.
- `GET /api/content?parentId=<user-1-root>` as `user-1`.
- Assert: 200, body contains exactly the two notes belonging to `user-1`, not `user-2`'s note.

**Verify:** Run `pnpm test`. All tests pass.

Status: Pending

---

## Phase 5 — Documentation Cleanup

### Step 14 — Resolve open questions in unit_testing_sapie.md

Update `docs/dev/unit_testing_sapie.md` to replace the **Open Questions** section with the
actual decisions made during implementation:

- Docker image choice (custom Dockerfile, Firebase CLI version pinned).
- Test data seeding approach (state seeded via API endpoints, not direct Firestore writes).
- Jest global setup (env vars inline in `test` script; `clearFirestoreData()` called in
  `beforeEach`).

**Verify:** Read through the document and confirm it accurately reflects the implemented state.

Status: Pending
