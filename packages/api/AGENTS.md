# @sapie/api — Agent Instructions

NestJS backend with Firebase Admin, Firestore, and GCS blob storage.
See root [AGENTS.md](../../AGENTS.md) for project-wide context and MVP priorities.

## Architecture

- **Module → Controller → Service → Repository** pattern. Each domain (`content/`, `cards/`,
  `study/`) follows this structure.
- **Firestore repositories** in `src/<domain>/repositories/` — direct Firestore SDK calls,
  no ORM. Documents use `ownerId` for multi-tenancy.
- **GCS blob storage** for inline images: `POST /api/content/:contentId/blobs` uploads to
  `{ownerId}/content/{contentId}/blobs/{blobId}`. No Firestore subcollection for blobs.
- **Auth**: `auth.guard.ts` enforces Firebase Auth tokens. `auth.decorator.ts` extracts
  `OwnerId` from the verified token. `auth.middleware.ts` validates tokens on protected routes.
- **Validation**: `class-validator` DTOs in `src/<domain>/dto/`. Always add validation
  decorators to new endpoints.

## Testing

- **Classical TDD**: controller-first integration tests preferred. Avoid mockist service specs
  for orchestration code.
- **Test helpers** in `src/test-helpers/`:
  - `app.fixture.ts` — creates a NestJS testing module with emulator-backed services
  - `fake-auth.guard.ts` — bypasses Firebase Auth for unit tests
  - `fake-content-body-storage.service.ts` — in-memory storage for blob tests
  - `firestore.helper.ts` — clears collections between tests
- **Run**: `pnpm test:unit` (requires `sapie-firebase-test-emulator` container running — see
  root `ai_agent_guidelines.md` §Firebase emulators).

## Adding a new domain module

1. Create `src/<domain>/` with `entities/`, `dto/`, `controllers/`, `services/`,
   `repositories/`, `<domain>.module.ts`.
2. Register in `app.module.ts`.
3. Add controller spec(s) with `app.fixture.ts`.
4. Regenerate OpenAPI client after route changes: `cd packages/web && pnpm generate:api-client`.

## Blob storage (Story 75)

- Upload: `POST /api/content/:contentId/blobs` → `{ blobId, url }`
- Read: `GET /api/content/:contentId/blobs/:blobId` — streams with ownership check
- Delete cascade: soft-delete note → list GCS prefix → delete all objects
- `blobId` is 12-char nanoid. `expectedRevision` on `PUT /:id/body` is kept for concurrency
  control.
- `AttachmentService`, `AttachmentRepository`, `parse-attachment-urls-from-markdown` are
  **removed**.
