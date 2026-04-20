# Content naming (metadata vs body)

When writing API text, code comments, ADRs, and UI copy, use this vocabulary so **Firestore metadata** and **Storage
bytes** are not conflated.

- **Content** — The metadata record for something in the tree: name, `type`, `parentId`, `ownerId`, top-level
  timestamps, and (for notes) a nested **`body`** object (`uri`, `size`, `mimeType`, `createdAt`, **`updatedAt`**) in
  Firestore. The HTTP metadata DTO exposes a **public `body` summary** (no storage URI). Persisted in the Firestore
  **`content`** collection.
- **Content body** — The payload stored separately from that record (markdown, image bytes, audio, …), addressed by the
  internal **`body.uri`** object path after the first successful `PUT /api/content/:id/body`. Persisted in **Firebase
  Cloud Storage** (default bucket).

**Do not** use **“content item”** for the Firestore side; say **content** (or **content metadata** when you need to
stress that it is not the body).

**Do not** call the Storage object “the content” alone; say **content body** (or **body**) when the distinction matters.

TypeScript types keep the name `Content` (domain) and `ContentResponse` (HTTP metadata shape). OpenAPI summaries and descriptions
should follow the table above.

See also: [ADR 0002 — note body storage and API](../adr/0002-note-body-storage-and-api.md) (Storage layout and signed
URL behavior).
