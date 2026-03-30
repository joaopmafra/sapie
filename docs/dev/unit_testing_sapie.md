# Unit Testing — Sapie Implementation

This document describes how the unit testing principles from
[Unit Testing Strategy](unit_testing_strategy.md) are applied to the Sapie API package
(`packages/api/`). It covers technology choices, infrastructure setup, test lifecycle, and the
rationale for each design decision.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Test Layer Architecture](#test-layer-architecture)
- [Firestore Emulator Setup](#firestore-emulator-setup)
- [Authentication in Tests](#authentication-in-tests)
- [Data Isolation Strategy](#data-isolation-strategy)
- [Test Lifecycle](#test-lifecycle)
- [Open Questions](#open-questions)

---

## Overview

The Sapie API is a NestJS application backed by Firebase (Firestore for storage, Firebase Auth
for authentication). Unit tests follow the **Classical TDD school**: behaviors are verified
through observable outputs, real dependencies are preferred over mocks, and fakes replace only
external system boundaries.

The primary external boundary in this project is **Firebase**. Rather than building hand-rolled
in-memory fakes for Firestore, we use the **official Firebase Emulator** running in a Docker
container as the test database. This gives us real Firestore semantics — query behavior,
constraint enforcement, index behavior — without the latency of a remote connection.

---

## Technology Stack

| Concern | Technology |
|---|---|
| Test runner | Jest (already configured in `packages/api/`) |
| HTTP test client | `supertest` (already available via `@nestjs/testing`) |
| Test module wiring | `@nestjs/testing` — `Test.createTestingModule()` |
| Firestore (test) | Firebase Emulator running in Docker with `tmpfs` |
| Authentication (test) | Fake `AuthGuard` injected via `overrideProvider()` |
| Data isolation | Firestore Emulator REST API (`DELETE /emulator/v1/...`) |

### Script Decisions

**`test:watch` is not provided.** The classical TDD workflow does not benefit from running
tests continuously on every file save. Tests are run deliberately as a checkpoint after
completing a meaningful unit of implementation — not as a background alarm between keystrokes.

Additionally, the emulator-backed test suite involves app bootstrap and I/O that makes it
unsuitable for tight watch-mode cycles. If narrow, fast in-memory tests are added to `src/` in
the future, watch mode over that subset can be invoked directly via
`jest --watch --testPathPattern=src/` without a dedicated script.

For the full rationale on watch mode and why it has poor signal-to-noise ratio in both mockist
and slower classical suites, see
[Watch Mode and the Limits of Mockist Tests](unit_testing_strategy.md#watch-mode-and-the-limits-of-mockist-tests).

---

## Test Layer Architecture

Following the Testing Pyramid, the Sapie API has three test layers:

### Unit Tests — Primary Layer

**What they cover:** Service behaviors. Every significant behavior in a service class
(business rules, validation, error cases, permission enforcement) has a corresponding unit test.

**How they run:** The full NestJS application is bootstrapped via `Test.createTestingModule()`
with `supertest` making real HTTP requests. This tests the complete request-handling stack
including DTO validation, guards, controllers, and services in one pass.

**What is replaced:** The `AuthGuard` is replaced by a fake (see
[Authentication in Tests](#authentication-in-tests)). Everything else — including Firestore
access via `FirebaseAdminService` — runs against the real emulator.

**Location:** `packages/api/src/**/*.spec.ts` (co-located with source files).

**Expected count and speed:** Many tests; execution in seconds (in-memory emulator).

### Integration Tests — Secondary Layer

> **Status: Not yet implemented. Reserved for future use.**

Integration tests would cover concerns that the emulator does not fully replicate — for
example, real Firebase Auth token verification flows, production Firestore security rules, or
cross-service behaviors that require a fully configured environment.

**Location (when implemented):** `packages/api/test/**/*.e2e-spec.ts`.

### E2E Tests — Playwright

> **Status: Deprioritized for MVP. Existing tests are not actively maintained.**

The Playwright E2E suite in `packages/test-e2e/` covers complete user journeys through the
browser. These are not considered part of the API unit testing strategy.

---

## Firestore Emulator Setup

### Why Docker + tmpfs

The Firebase CLI emulator is already used in the development environment. Running a **separate
emulator instance for tests in a Docker container** ensures:

- Tests never interfere with local development data.
- The test environment is consistent and reproducible across machines and CI.
- The container uses a `tmpfs` (in-memory filesystem) for Firestore data files, giving
  near-native in-memory speed without disk I/O.

### Container Configuration

The test emulator container must expose at minimum:

- **Firestore** on a port distinct from the development emulator (e.g. `8181` instead of
  `8080`) to prevent collisions when both are running simultaneously.
- **Firebase Auth** on a distinct port (e.g. `9199` instead of `9099`) for the same reason.
- **Emulator UI** (optional, e.g. port `4001`) for debugging test state.

The `tmpfs` mount should be applied to the Firestore data directory inside the container.
Relevant emulator flags for speed (`--innodb`-style equivalents for Firebase) include disabling
data export on exit, since test data is intentionally ephemeral.

### Environment Variables

Tests connect to the test emulator via environment variables. The test environment file
(`.env.test`, separate from the existing `.env.test-e2e`) must set:

```
CURRENT_ENV=test
USE_FIREBASE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=localhost:8181
FIREBASE_AUTH_EMULATOR_HOST=localhost:9199
GCLOUD_PROJECT=sapie-test
```

`FirebaseAdminService.onModuleInit()` already reads `FIRESTORE_EMULATOR_HOST` and
`FIREBASE_AUTH_EMULATOR_HOST` from `process.env` when `USE_FIREBASE_EMULATOR=true`, so no code
changes are required in the service to support the test container.

### Container Lifecycle

The emulator container is intended to be **long-lived** — started once and kept running between
`npm test` executions. This eliminates container startup time from the developer feedback loop:

- **First run:** container starts (one-time cost of ~10–15 seconds).
- **Subsequent runs:** container is already running; tests connect immediately.

A helper script (`scripts/start-test-emulator.sh`) should handle starting the container if it
is not already running, and a companion stop script should be provided for teardown.

Firestore data is **not** persisted between runs — the `tmpfs` filesystem is ephemeral by
design, and data is cleared before each test (see
[Data Isolation Strategy](#data-isolation-strategy)).

---

## Authentication in Tests

### The Problem

Every authenticated API endpoint in the Sapie API passes through `AuthGuard`, which:

1. Extracts the Bearer token from the `Authorization` header.
2. Calls `FirebaseAdminService.verifyIdToken()` to verify it with Firebase Auth.
3. Attaches the decoded token (containing `uid` and other claims) to `request.user`.

In tests, we need to control which user identity each request runs as — without the ceremony of
creating real Firebase Auth users and obtaining real ID tokens for every test.

### The Solution: Fake `AuthGuard`

The `AuthGuard` is replaced in the test module with a **fake guard** using NestJS's
`overrideProvider()` mechanism. The fake guard:

1. Reads a test user ID from a request header (e.g. `X-Test-User-Id`).
2. Constructs a minimal `DecodedIdToken`-shaped object with that UID.
3. Attaches it to `request.user`.
4. Always returns `true` (allows the request through).

This is the NestJS equivalent of Spring Boot's `@MockBean` on a security component. The overall
wiring in the test module looks like:

```
Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(AuthGuard)
  .useClass(FakeAuthGuard)
  .compile()
```

Tests then specify the user identity by passing `X-Test-User-Id: <uid>` as a request header.
Multi-user scenarios (e.g. testing that user A cannot access user B's notes) are trivial —
alternate the header value between requests.

### What This Does Not Test

The `AuthGuard` logic itself — token extraction from the header, the `verifyIdToken` call, error
handling for missing or invalid tokens — is not exercised by unit tests that use the fake guard.
That behavior is:

- Narrow and well-defined (no significant business logic).
- Verifiable in isolation with a small dedicated test if needed.
- Covered in production by Firebase Auth's own guarantees.

This is an explicit, deliberate trade-off in favor of test simplicity for the MVP phase.

---

## Data Isolation Strategy

### Requirement

Each test must start with a clean Firestore state. Tests must not share data or depend on
execution order.

### Solution: Emulator Clear API

The Firebase Firestore Emulator exposes a REST endpoint to delete all documents in a project's
database:

```
DELETE http://localhost:{FIRESTORE_PORT}/emulator/v1/projects/{PROJECT_ID}/databases/(default)/documents
```

This is an in-memory operation — it completes in milliseconds regardless of how much data was
present. It is called in the `beforeEach` hook of every test suite.

Because we are using a fake `AuthGuard` (not the real Firebase Auth emulator), there are no
Auth emulator users to clear.

### Why Not Container Restart

Restarting the container before each test run would add 10–15 seconds of startup latency per
`npm test` invocation, defeating the purpose of fast unit tests. The clear API call achieves
the same result in under 100ms.

### Why Not Database Transactions with Rollback

Firestore does not support multi-document transactions with rollback in the same way relational
databases do. The clear API is the idiomatic isolation mechanism for Firestore emulator tests.

---

## Test Lifecycle

A complete unit test run follows this sequence:

```
[One-time, before development session]
  Developer runs: scripts/start-test-emulator.sh
  → Docker container starts (or is found already running)
  → Firestore emulator comes up on port 8181
  → Container remains running indefinitely

[Per npm test invocation]
  Jest starts
  → NestJS app bootstrapped with FakeAuthGuard overriding AuthGuard
  → App connects to emulator at localhost:8181

  [Per test suite (describe block)]
    beforeEach:
      → HTTP DELETE to Firestore emulator clear endpoint
      → Firestore is empty

    [Per test (it block)]
      → Test seeds required data via HTTP requests or direct Firestore emulator API
      → Test makes HTTP request(s) with X-Test-User-Id header
      → Test asserts on HTTP response status and body

  Jest reports results
  → Container remains running for next invocation
```

---

## Open Questions

The following implementation details are not yet decided and must be resolved before the first
tests are written:

1. **Docker image choice.** Pre-built images (`spine3/firebase-emulator`,
   `tomasvotava/firebase-emulators`) vs. a custom `Dockerfile` built from the official Firebase
   CLI. See `docs/research/run_firebase_emulator_container.md`.

2. **Test data seeding approach.** Tests may need to seed Firestore with initial state before
   exercising behavior. Options:
   - Seed via the service's own API endpoints (slower, but tests the full stack).
   - Seed directly via the Firestore emulator's REST API (faster, bypasses business logic).
   - A test fixture helper that seeds via a direct Firestore Admin SDK connection.
   The choice affects how tightly tests are coupled to the service's write path.

3. **Jest global setup integration.** The Firestore clear call in `beforeEach` requires knowing
   the emulator host and project ID. Whether this configuration is read from environment
   variables or from a shared Jest global setup file is an implementation detail to decide.

4. **Naming and file structure for test doubles.** Where fake guard implementations, fixture
   helpers, and other test infrastructure live in the source tree.
