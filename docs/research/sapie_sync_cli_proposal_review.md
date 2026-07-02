# Sapie Sync CLI Proposal — Review Findings

Review of [`sapie_sync_cli_proposal.md`](sapie_sync_cli_proposal.md) (v4) against the actual API code.
Every claim below is grounded in a read source file; line references included.

## Verdict

The design is sound and mostly API-accurate — the core round-trip (auth → pull → edit → push)
is buildable on the existing REST surface with **no backend changes in Phase 1**. Two correctness
gaps and one config omission must be fixed in the proposal before implementation. Nothing is a
show-stopper.

## Verified correct (no change needed)

- **All Phase 1 routes exist and match.** `GET /root`, `GET /:id/children`, `GET /:id/body`,
  `POST /`, `PATCH /:id`, `PUT /:id/body?expectedRevision=`, `DELETE /:id?cascade=true`, and card
  CRUD (`content.controller.ts`, `card.controller.ts`). Route declaration order puts `/root` and
  `/roots` before `:id`, so no shadowing (`content.controller.ts:541,583,620`).
- **Deck creation via `POST /api/content` with `type:'deck'` works** and auto-denormalizes
  `folderId` from the parent note — the CLI does **not** supply `folderId`
  (`content.service.ts:99-101,119-129`). `CreateContentRequest.type` accepts the full `ContentType`
  enum incl. `deck` (`content.dto.ts:180-182`).
- **Decks are discoverable via `/children`.** `findByParentIdAndOwnerId` returns directory + note +
  **deck** (`content.service.ts:49-54`) — pull can walk a note's children to find decks. (The
  endpoint's Swagger text says "folders and notes" only; that summary is stale — see finding 4.)
- **Body revision token is exposed.** `ContentResponse.body.updatedAt` (`content.dto.ts:34-40`) is
  the exact string `PUT …/body` expects as `expectedRevision`
  (`content.service.ts:324-335`). The CLI's `SyncEntry.bodyUpdatedAt` maps to it 1:1. First save
  uses `expectedRevision=""`.
- **Card study state is enforced read-only by the API.** `createCard`/`updateCard` accept only
  `front`/`back` (`card.controller.ts:253-262,333-348`; `card.service.ts:22-29,38-58`). Proposal's
  "only front/back pushable" is correct and backend-guaranteed.
- **Auth model matches.** Guard verifies Firebase ID tokens via `Bearer` header
  (`auth.guard.ts:39,58-72`). REST-based login keeps the CLI Firebase-SDK-free as claimed.

## Correctness gaps (fix in the proposal)

1. **Card reordering cannot be pushed — the feature is impossible as designed.**
   `Card` has no `order`/`position` field (`card.entity.ts:9-26`); `findByDeckId` sorts by
   `createdAt` ascending (`card-repository.service.ts:38`); PATCH mutates only `front`/`back`.
   Local array order is therefore **read-only** on the backend. The proposal's `sapie deck move`
   (Phase 2) and the risk-table mitigation "push as individual PATCH calls" are silent no-ops.
   → **Action:** drop reorder sync, OR add a backend `order` field + PATCH support as an explicit
   proposal item. Recommend dropping for now (MVP).

2. **Rename has no concurrency guard — `expectedRevision` covers bodies only.**
   `PATCH /:id` performs no revision check (`content.controller.ts:159-179`,
   `content.service.ts:145-192`); only `PUT …/body` does. A web-side rename between `pull` and
   `push` is silently clobbered by the CLI's stale name. The proposal claims `expectedRevision` is
   the Phase 1 safety net for concurrent web edits — true for body bytes, **false for renames,
   creates, deletes**.
   → **Action:** state this Phase 1 gap explicitly; the real mitigation is the Phase 3 lock. Until
   then, document that metadata changes are last-writer-wins.

3. **CLI config is missing the Firebase Web API key + auth domain.**
   `.sapie/config.json` in the proposal has only `apiBaseUrl`, but the Firebase Auth REST calls
   (`signInWithPassword`, `signInWithIdp`, `securetoken`) all require `?key=<WEB_API_KEY>`, and
   Google sign-in needs the `authDomain`/`projectId`. The web reads these from
   `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / … (`web/src/lib/firebase/config.ts:7-14`).
   The web API key is **not secret** (public by design), so it can live in `config.json` or ship as
   an env-keyed default.
   → **Action:** add `firebaseApiKey`, `firebaseAuthDomain` (and optionally an
   `authEmulatorHost` override — web supports `VITE_FIREBASE_AUTH_EMULATOR_HOST`,
   `config.ts:36-43`) to the config schema.

## Smaller findings

4. **`POST /api/content` and `GET /:id/children` Swagger summaries under-document reality.**
   Create says "note or folder"; children says "folders and notes." Both actually handle decks
   (verified above). The proposal is correct to use them for decks — add a one-line note so a reader
   working from the public OpenAPI isn't misled. (Separately: the API's Swagger text is worth fixing,
   but that's a repo chore, not a proposal blocker.)

5. **Pull's "filter out `deleted:true`" step is redundant.** `findByParentIdAndOwnerId` already
   excludes soft-deleted children (`content-repository.service.ts:81-83`). Drop the step.

6. **`DELETE` is soft-delete; GCS bytes remain.** Controller doc: "Cloud Storage objects … are NOT
   deleted" (`content.controller.ts:483-486`). Push uses it correctly, but the proposal should say
   "soft-delete" so no one assumes blob/body bytes are purged.

7. **Phase 2 markdown link translation targets the wrong URL scheme.** The proposal assumes inline
   images are `![alt](blob:<blobId>)`. The real stored form is an **absolute** URL
   `${apiBaseUrl}/api/content/{contentId}/blobs/{blobId}` (`web/src/lib/content/attachment-body-url.ts:7-18`;
   emitted by the editor at `web/src/pages/note-body-editor/use-note-image-handlers.ts:42-43`).
   Phase 1 (raw bytes) is unaffected — these URLs round-trip verbatim. But the `MarkdownService`
   design in Phase 2 must parse/rewrite `/api/content/:id/blobs/:blobId`, not a `blob:` scheme.
   `parseBlobUrl` already encodes the canonical regex to reuse.

8. **Note-as-`.md/`-directory can collide with a folder literally named `X.md`.** Content names
   permit `.` (`IsContentNameSafeForFileName` forbids only `\ / : * ? " < > |` + control chars).
   A folder `Foo.md` (plain dir `Foo.md/`) and a note `Foo` (→ `Foo.md/`) map to the same path.
   Rare, but the `.md` suffix is not a sound type discriminator. → Consider a reserved marker
   (e.g. the presence of `index.md` inside) as the note discriminator, or reject the ambiguous case.

9. **Deck name has two sources of truth:** the file name (`decks/<name>.json`) and the JSON `name`
   field. Define which wins on push (recommend: file name is authoritative for rename detection;
   JSON `name` is display-only and ignored / kept in sync on pull).

10. **Empty notes 404 on body read.** `GET /:id/body` returns 404 when no body was ever saved
    (`content.service.ts:249-251`). Pull must treat 404 as an empty `index.md`; push of that note's
    first body uses `expectedRevision=""`. Make this explicit in the pull algorithm.

## Bottom line

Proceed to Phase 1. Apply edits for findings 1–3 (real gaps) and fold 4–10 as clarifying notes.
The API is ready; the corrections are to the proposal's assumptions, not to the backend.
