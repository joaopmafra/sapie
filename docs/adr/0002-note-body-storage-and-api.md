# ADR 0002: Note body storage, metadata API, and test strategy

## Status

Accepted

## Date

2026-04-10

## Context

**Vocabulary:** Firestore holds **content** (metadata); Storage holds the **content body** (blob). See
[Content naming](../dev/content_naming.md).

Story 55 (note content editor) requires storing **markdown bytes** outside Firestore, loading them via **short-lived
read URLs**, and **auto-saving** from the client. We also needed consistency with **Classical TDD** (real collaborators +
emulator fakes), **no production data** yet (staging only), and **portable** metadata so a future move to another object
store (e.g. S3) does not require rewriting stored URLs in Firestore.

## Decision

### 1. Split create vs body write (two API steps)

- **`POST /api/content`** (and existing create flows) persist **metadata only** (`bodyUri` null until first save).
- **`PUT /api/content/:id/body`** accepts **raw markdown** (`Content-Type: text/plain`) and writes the object, then
  updates Firestore `bodyUri`, `size`, `updatedAt`.

We **do not** add a separate server-side “body status” enum (`pending` / `fulfilled`). **`bodyUri` null vs non-null**
is enough: the client tracks dirty/editor state; the server answers whether a Storage object exists.

### 2. Firestore stores a provider-agnostic object path (`bodyUri`)

- Field name **`bodyUri`** (replacing the earlier `contentUrl` name).
- Value is **only** the object key inside the configured default bucket:
  `{ownerId}/content/{contentId}` where `contentId` is the Firestore document id of the note.
- **No** `gs://` or `https://` prefix in Firestore so bucket or provider changes do not imply a metadata migration.

We did **not** implement migration from legacy `contentUrl` documents: nothing had shipped to production yet.

### 3. Read path: signed URL contract, separate from metadata `GET`

- **`GET /api/content/:id`** remains **metadata only** (no inline body bytes).
- **`GET /api/content/:id/body`** returns **`{ signedUrl, expiresAt }`** (ISO-8601). The browser **fetches** markdown
  from `signedUrl` (not proxied through the API for every byte).
- **Signed URL lifetime:** **10 minutes** (security vs refresh cost). Client caching guidance lives in Story 55 /
  TanStack plan (e.g. markdown `staleTime` strictly shorter than URL lifetime).

### 4. Storage emulator in test-unit + production-style signing caveat

- **`compose.test-unit.yml`** runs the **Storage** emulator on host port **9199** (distinct from hybrid local-dev
  Storage **9200**). **`FIREBASE_STORAGE_EMULATOR_HOST`** in **`packages/api/.env.test-unit`** must **omit** a scheme
  (per Firebase docs), e.g. `localhost:9199`.
- **`storage.test-unit.rules`** is **emulator-only**, permissive, for local/Jest; it is **not** a production ruleset.

The Firebase Storage **emulator** does not support Admin **`getSignedUrl`** the same way as production (signing expects
production-style credentials). When **`FIREBASE_STORAGE_EMULATOR_HOST`** is set, the API returns a **Firebase-style v0
HTTP download URL** (`…/v0/b/…/o/…?alt=media`) in the **`signedUrl`** field so the **response shape** matches production
and clients can still `fetch(signedUrl)`. Production continues to use real **V4 signed URLs** from the Admin SDK.

### 5. Default bucket name resolution

- Prefer **`FIREBASE_STORAGE_BUCKET`** when set.
- Otherwise derive **`${GCLOUD_PROJECT}.appspot.com`** so `storage.bucket()` is never called without a name in
  emulator and dev.

### 6. Classical tests for content body: emulator first, fake optional

- Default **`ContentControllerFixture`** uses the real **`ContentBodyStorageService`** against the **Storage emulator**
  (same philosophy as Firestore: emulator as a high-fidelity fake).
- **`ContentControllerFixture.withFakeContentBodyStorage()`** before **`init()`** swaps in **`FakeContentBodyStorageService`**
  for rare cases that are painful to reproduce in the emulator (escape hatch, not the default).
- We **avoid** parallel **mockist** `content.service.spec.ts`-style tests that stub `ContentRepository` when controller
  tests already cover behavior; see [Unit Testing — Sapie Implementation](../dev/unit_testing_sapie.md).

## Consequences

- **Client** must implement the two-step load (`GET` metadata → `GET` …/body → `fetch` markdown) and debounced
  **`PUT` …/body** as in Story 55.
- **Staging** environments that ever stored **`contentUrl`** only are not migrated by code; operators may clear or
  resave if needed before production.
- **CI / developers** must run the **test-unit** Compose stack (including Storage on **9199**) for `packages/api`
  **`pnpm test`** when exercising body endpoints; see **`scripts/emulator-test-unit-start.sh`**.
- **Observability:** emulator “signed” URLs are **not** cryptographically identical to production signed URLs; tests
  assert behavior (e.g. successful `fetch` of markdown), not URL format parity.

## Related documentation (names only; paths may move)

- `docs/pm/4-in-progress/55-story-note_content_editor.md` — product scope and acceptance criteria
- `docs/dev/unit_testing_sapie.md` — test-unit ports, Storage emulator, optional fake
- `docs/dev/unit_testing_strategy.md` — Classical vs mockist, layered Nest testing
- `docs/adr/0001-firebase-emulators-docker-compose.md` — Compose profiles and port discipline
- `packages/api/README.md` — `FIREBASE_STORAGE_*` env vars and test behavior
