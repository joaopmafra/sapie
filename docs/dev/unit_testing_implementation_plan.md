# Unit Testing Implementation Plan

This document is a step-by-step plan to implement the unit testing infrastructure described in
[Unit Testing — Sapie Implementation](unit_testing_sapie.md). Each step is small, independently
verifiable, and leaves the codebase in a working state.

---

## Phase 1 — Jest Configuration

These steps require no running infrastructure. They are pure configuration changes and can be
completed and verified offline.

### Step 1 — Rename existing test files

Rename the boilerplate NestJS test files from `*.e2e-spec.ts` to `*.spec.ts` to establish a
single consistent naming convention:

- `test/app.e2e-spec.ts` → `test/app.spec.ts`
- `test/health/health.e2e-spec.ts` → `test/health/health.spec.ts`

**Verify:** Run `pnpm test --config ./test/jest-e2e.json`. Expect zero tests found (the renamed
files no longer match the old `*.e2e-spec.ts` regex). This confirms the rename worked and that
the old config no longer picks them up.

---

### Step 2 — Merge Jest configurations

Update the Jest config in `package.json` to cover both `src/` and `test/`:

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "roots": ["<rootDir>/src", "<rootDir>/test"],
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": ["src/**/*.(t|j)s"],
  "coverageDirectory": "./coverage",
  "testEnvironment": "node"
}
```

**Verify:** Run `pnpm test`. All existing tests in both `src/` and `test/` should be discovered
and pass. Expect 3 suites: `app.controller.spec.ts`, `health.controller.spec.ts`,
`test/app.spec.ts`, `test/health/health.spec.ts`.

---

### Step 3 — Simplify test scripts

Update the `scripts` section in `package.json`. Remove `test:watch`, `test:e2e`, and `test:all`.
Add `test:unit` for fast `src/`-only runs. Leave the `test` script unchanged for now — emulator
env vars will be added in Phase 2.

```json
"test": "jest",
"test:unit": "jest --testPathPattern=src/",
"test:cov": "jest --coverage",
"test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand"
```

Keep `test:e2e` pointing to `test/jest-e2e.json` for future real E2E use:

```json
"test:e2e": "jest --config ./test/jest-e2e.json"
```

**Verify:** Run `pnpm test` and `pnpm test:unit`. Both should pass. `pnpm test:unit` should
only discover the tests under `src/`.

---

## Phase 2 — Firebase Emulator Test Container

### Step 4 — Create the test emulator Docker setup

Create a `docker-compose.test.yml` in the project root. The container re-uses the existing
`firebase.json` (which already defines which emulators to start and their internal ports), but
exposes them on host ports distinct from the dev emulator to allow both to run simultaneously:

- Firestore: container internal `8080` → host `8181`
- Auth: container internal `9099` → host `9199`
- Emulator UI: container internal `4000` → host `4001`

The container uses a `tmpfs` mount for the Firestore data directory to ensure in-memory speed
and ephemeral data. Use the `node:22-alpine` base image, install the Firebase CLI and JDK
(required by the emulators), and run `firebase emulators:start`.

> **Decision point:** Use a custom `Dockerfile` rather than a pre-built third-party image
> (`spine3/firebase-emulator`, etc.) for reliability — pre-built images may lag behind
> Firebase CLI releases. Pin the Firebase CLI version in the `Dockerfile` for reproducibility.

**Verify:** Run `docker compose -f docker-compose.test.yml up`. The emulator UI should be
accessible at `http://localhost:4001`. Firestore should respond to:

```
curl http://localhost:8181/
```

Confirm the dev emulator (if running) is unaffected on ports 8080/9099.

---

### Step 5 — Create helper scripts for the test container

Create two scripts:

- `scripts/start-test-emulator.sh` — starts the container if not already running
- `scripts/stop-test-emulator.sh` — stops and removes the container

The start script should check whether the container is already running (to support the
long-lived container workflow) and exit gracefully if it is.

**Verify:** Run `start-test-emulator.sh` twice in a row. The second invocation should detect
the already-running container and not start a duplicate. Run `stop-test-emulator.sh` and
confirm the container is gone. Run the start script again to confirm a clean restart.

---

### Step 6 — Wire the test suite to the test emulator

Update the `test` script in `package.json` to set the emulator environment variables:

```json
"test": "CURRENT_ENV=test USE_FIREBASE_EMULATOR=true FIRESTORE_EMULATOR_HOST=localhost:8181 FIREBASE_AUTH_EMULATOR_HOST=localhost:9199 GCLOUD_PROJECT=sapie-test jest"
```

**Verify:** With the test container running, run `pnpm test`. All existing tests should still
pass. With the container stopped, run `pnpm test` — expect the NestJS app bootstrap to fail
or the test suite to error, confirming the suite now depends on the emulator.

---

## Phase 3 — Test Helper Infrastructure

### Step 7 — Create the FakeAuthGuard

Create `test/helpers/fake-auth.guard.ts`. The fake guard:

- Reads a user ID from a `X-Test-User-Id` request header.
- Constructs a minimal object with `uid` set to that value and attaches it to `request.user`.
- Always returns `true`.

**Verify:** Write a minimal test (can be temporary, in `test/helpers/`) that bootstraps
`AppModule` with `overrideProvider(AuthGuard).useClass(FakeAuthGuard)`, makes a request to
`GET /api/health` with `X-Test-User-Id: user-123`, and asserts a 200 response. The guard being
in place does not affect the health endpoint, but the test confirms the override wiring works.

---

### Step 8 — Create the Firestore clear helper

Create `test/helpers/firestore.helper.ts` with a `clearFirestoreData()` function that calls:

```
DELETE http://localhost:{FIRESTORE_PORT}/emulator/v1/projects/{PROJECT_ID}/databases/(default)/documents
```

Port and project ID should be read from the same env vars used by the test suite
(`FIRESTORE_EMULATOR_HOST`, `GCLOUD_PROJECT`).

**Verify:** Write a test that seeds a document directly via the Firestore Admin SDK, calls
`clearFirestoreData()`, then reads the collection and asserts it is empty.

---

### Step 9 — Create a shared test app factory

Create `test/helpers/app.helper.ts` with a `createTestApp()` function that:

1. Builds `AppModule` with `overrideProvider(AuthGuard).useClass(FakeAuthGuard)`.
2. Initialises the NestJS application.
3. Returns the `INestApplication` instance.

Update the existing `test/app.spec.ts` and `test/health/health.spec.ts` to use
`createTestApp()` and add `clearFirestoreData()` in their `beforeEach`.

**Verify:** Run `pnpm test`. All existing tests should pass using the shared factory.

---

## Phase 4 — First Real Tests for ContentController

At this point, the infrastructure is complete. These steps write the first meaningful tests
against real application behaviors using the emulator.

### Step 10 — Test: create root directory

Write `test/content/content.spec.ts`. First test: `GET /api/content/root` creates and returns
the root directory for the authenticated user.

- `beforeEach`: call `clearFirestoreData()`.
- Request: `GET /api/content/root` with `X-Test-User-Id: user-1`.
- Assert: 200, body has `type: "directory"`, `parentId: null`, `ownerId: "user-1"`.
- Call the endpoint a second time with the same user. Assert the same document ID is returned
  (idempotent — no duplicate root directory created).

**Verify:** Run `pnpm test`. New test passes.

---

### Step 11 — Test: create a note (happy path)

Add to `test/content/content.spec.ts`:

- Seed a parent directory by calling `GET /api/content/root` first (reuse the root).
- Request: `POST /api/content` with `{ name: "My Note", parentId: <rootId> }` and
  `X-Test-User-Id: user-1`.
- Assert: 201, body has `name: "My Note"`, `type: "note"`, `ownerId: "user-1"`.

**Verify:** Run `pnpm test`. New test passes.

---

### Step 12 — Test: duplicate name is rejected

Add to `test/content/content.spec.ts`:

- Create a note named `"My Note"` under the root directory.
- Attempt to create a second note with the same name and same parent.
- Assert: 409 Conflict.

**Verify:** Run `pnpm test`. New test passes.

---

### Step 13 — Test: wrong owner is rejected

Add to `test/content/content.spec.ts`:

- `GET /api/content/root` as `user-1` to create the root directory.
- `POST /api/content` as `user-2` with `parentId` set to `user-1`'s root directory ID.
- Assert: 403 Forbidden.

**Verify:** Run `pnpm test`. New test passes.

---

### Step 14 — Test: list content

Add to `test/content/content.spec.ts`:

- Create two notes under the root directory as `user-1`.
- Create one note under the root directory as `user-2` (using a different root).
- `GET /api/content?parentId=<user-1-root>` as `user-1`.
- Assert: 200, body contains exactly the two notes belonging to `user-1`, not `user-2`'s note.

**Verify:** Run `pnpm test`. New test passes. Run `pnpm test:unit` to confirm the `src/`
boilerplate tests still pass independently of the emulator.

---

## Phase 5 — Documentation Cleanup

### Step 15 — Resolve open questions in unit_testing_sapie.md

Update `docs/dev/unit_testing_sapie.md` to replace the **Open Questions** section with the
actual decisions made during implementation:

- Docker image choice (custom Dockerfile, specific Firebase CLI version used).
- Test data seeding approach (root directory created via API, no direct Firestore writes in
  tests).
- Jest global setup (env vars in `test` script, `beforeEach` calls `clearFirestoreData()`).
- File structure for test doubles (`test/helpers/`).

**Verify:** Read through the document and confirm it accurately reflects the implemented state.
