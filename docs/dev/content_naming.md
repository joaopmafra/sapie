# Content naming (metadata vs body)

When writing API text, code comments, ADRs, and UI copy, use this vocabulary so **Firestore metadata** and **Storage
bytes** are not conflated.

- **Content** — The metadata record for something in the tree: name, `type`, `parentId`, `ownerId`, top-level
  timestamps, and (for notes) a nested **`body`** object (`uri`, `size`, `mimeType`, `createdAt`, **`updatedAt`**) in
  Firestore. The HTTP metadata DTO exposes a **public `body` summary** (no storage URI). Persisted in the Firestore
  **`content`** collection. Examples: folders (`directory`), notes (`note`), flashcard decks (`deck`).
- **Note attachment** — Metadata for an **inline image** (and future immutable blobs) stored in subcollection
  **`content/{noteId}/attachments/{attachmentId}`**. **Not** tree content — no `content.name`, no sidebar node.
  Whole–part with the parent note. Bytes in Cloud Storage; read via
  `GET /api/content/:noteId/attachments/:attachmentId/body`.
- **Content body** — The payload stored separately from metadata (markdown, image bytes, …). For **content** records:
  addressed by internal **`body.uri`** after `PUT /api/content/:id/body`. For **attachments**: addressed by attachment
  `uri` after `PUT /api/content/:noteId/attachments/:attachmentId/body`. Persisted in **Firebase Cloud Storage**.

**Do not** use **“content item”** for the Firestore side; say **content** (or **content metadata** when you need to
stress that it is not the body).

**Do not** call inline images **`type: image` content** — that was an interim Story 71 model replaced by **note
attachments** ([Story 74](../pm/3-stories/1-ready/74-story-dedicated_attachment_storage_model.md)).

**Do not** call the Storage object “the content” alone; say **content body** or **attachment body** when the
distinction matters.

TypeScript types keep the name `Content` (domain) and `ContentResponse` (HTTP metadata shape). OpenAPI summaries and
descriptions should follow the terms above.

See also:

- [ADR 0002 — note body storage and API](../adr/0002-note-body-storage-and-api.md)
- [note_image_embedding.md](../research/note_editor/note_image_embedding.md) — attachment model and API
