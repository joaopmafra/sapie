# Content naming (metadata vs body)

When writing API text, code comments, ADRs, and UI copy, use this vocabulary so **Firestore metadata** and **Storage
bytes** are not conflated.

- **Content** — The metadata record for something in the tree: name, `type`, `parentId`, `ownerId`, top-level
  timestamps, and (for notes) a nested **`body`** object (`uri`, `size`, `mimeType`, `createdAt`, **`updatedAt`**) in
  Firestore. The HTTP metadata DTO exposes a **public `body` summary** (no storage URI). Persisted in the Firestore
  **`content`** collection. Examples: folders (`directory`), notes (`note`), flashcard decks (`deck`).
- **Blob** — An **inline image** stored as an immutable object in Cloud Storage under the note's GCS prefix
  **`{ownerId}/content/{contentId}/blobs/{blobId}`** (12-char nanoid). **Not** tree content — no Firestore document,
  no `content.name`, no sidebar node. Whole–part with the parent note. Uploaded via
  `POST /api/content/:contentId/blobs`, served via `GET /api/content/:contentId/blobs/:blobId`.
- **Content body** — The payload stored separately from metadata (markdown for notes). Addressed by internal
  **`body.uri`** after `PUT /api/content/:id/body`. Persisted in **Firebase Cloud Storage**.

**Do not** use **“content item”** for the Firestore side; say **content** (or **content metadata** when you need to
stress that it is not the body).

**Do not** call inline images **`type: image` content** — that was an interim Story 71 model, replaced by note
attachments (Story 74), then simplified to the **blob** model ([Story 75](../pm/5-done/75-story-blob_storage_model_refactor.md)).

**Do not** call the Storage object "the content" alone; say **content body** or **blob** when the
distinction matters. Do not use "attachment" — the term was retired in Story 75.
TypeScript types keep the name `Content` (domain) and `ContentResponse` (HTTP metadata shape). OpenAPI summaries and
descriptions should follow the terms above.

See also:

- [ADR 0002 — note body storage and API](../adr/0002-note-body-storage-and-api.md)
- [note_image_embedding.md](../research/note_editor/note_image_embedding.md) — blob model and API
- [Blob storage model proposal](../research/note_editor/blob_storage_model_proposal.md) — full design rationale
