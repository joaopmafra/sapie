# ADR 0002: Note body storage, metadata API, and test strategy

## Status

Accepted (amended 2026-04-19 — Story 66 nested `body` metadata)

## Date

2026-04-10

## Context

**Vocabulary:** Firestore holds **content** (metadata); Storage holds the **content body** (blob). See
[Content naming](../dev/content_naming.md).

Story 55 (note content editor) requires storing **markdown bytes** outside Firestore, loading them via **short-lived
read URLs**, and **auto-saving** from the client. We also needed consistency with **Classical TDD** (real collaborators +
emulator fakes), **no production data** yet (staging only), and **portable** metadata so a future move to another object
store (e.g. S3) does not require rewriting stored URLs in Firestore.

**Story 66** requires a clear separation between **metadata edits** (e.g. rename) and **body byte changes**, so clients
can refetch cheap metadata often while **skipping** redundant Storage downloads when the body version is unchanged.

## Decision

### 1. Split create vs body write (two API steps)

- **`POST /api/content`** (and existing create flows) persist **metadata only**; notes start with **`body: null`** until
  the first save.
- **`PUT /api/content/:id/body`** accepts a **raw body** and writes the object, then updates Firestore **`body`** (nested
  object) including **`body.updatedAt`**, and updates top-level **`updatedAt`** for general “content touched” semantics.

We **do not** add a separate server-side “body status” enum (`pending` / `fulfilled`). **`body` null vs non-null** is
enough: the client tracks dirty/editor state; the server answers whether a Storage object exists.

### 2. Firestore stores a nested `body` object (internal path + public summary on HTTP)

- Preferred Firestore shape: **`body: { uri, size, mimeType, createdAt, updatedAt }`** where **`uri`** is the
  provider-agnostic object key inside the configured default bucket: `{ownerId}/content/{contentId}` (no `gs://` or
  `https://` prefix).
- **HTTP `ContentResponse` for notes** exposes a **public summary only**:
  **`body: { mimeType, size, createdAt, updatedAt } | null`** — **no** storage URI on the wire.
- **Top-level `updatedAt`** changes on rename and other metadata updates and **must not** substitute for
  **`body.updatedAt`** when deciding whether body bytes changed.
- **Directories** omit **`body`** on the wire; persisted documents use **`body: null`** (or omit).

### 3. Read path: signed URL contract, separate from metadata `GET`

- **`GET /api/content/:id`** remains **metadata only** (no inline body bytes).
- **`GET /api/content/:id/body/signed-url`** returns **`{ signedUrl, expiresAt }`** (ISO-8601). The browser **fetches**
  markdown from `signedUrl` (not proxied through the API for every byte).
- **Signed URL lifetime:** **10 minutes** (security vs refresh cost). Clients should treat **403/401** on `fetch(signedUrl)`
  as **expired URL**: obtain a **new** signed URL and retry while **`body.updatedAt`** is unchanged.

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

- **Client** must implement the two-step load (`GET` metadata → `GET` …/body/signed-url → `fetch` markdown) and debounced
  **`PUT` …/body** as in Story 55. TanStack Query should key **note body bytes** by **`body.updatedAt`** (or equivalent)
  so **rename-only** metadata refetches do not force redundant downloads.
- **Environments** with older flat Firestore fields must **migrate or wipe** data; the API expects nested **`body`**
  only.
- **CI / developers** must run the **test-unit** Compose stack (including Storage on **9199**) for `packages/api`
  **`pnpm test`** when exercising body endpoints; see **`scripts/emulator-test-unit-start.sh`**.
- **Observability:** emulator “signed” URLs are **not** cryptographically identical to production signed URLs; tests
  assert behavior (e.g. successful `fetch` of markdown), not URL format parity.

## Related documentation (names only; paths may move)

- `docs/pm/4-in-progress/55-story-note_content_editor.md` — product scope and acceptance criteria
- `docs/pm/4-in-progress/66-story-content_body_subdocument_and_client_cache.md` — nested `body`, cache policy
- `docs/dev/unit_testing_sapie.md` — test-unit ports, Storage emulator, optional fake
- `docs/dev/unit_testing_strategy.md` — Classical vs mockist, layered Nest testing
- `docs/adr/0001-firebase-emulators-docker-compose.md` — Compose profiles and port discipline
- `packages/api/README.md` — `FIREBASE_STORAGE_*` env vars and test behavior
