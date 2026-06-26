# Story 74: Dedicated attachment storage model

## Description

As a platform, we want inline note images stored in a model that matches their semantics (body attachments, not tree
content) so we do not overload `content.name` and sibling rules meant for folders, notes, and future named children.

## Details

Phase A (Story 71) stores inline images as **`type: image` content** with `parentId = noteId`, reusing `PUT …/body`
and `GET …/body`. **`content.name` is an opaque implementation detail** (`image-{random}.ext`); users identify images
by **content id in markdown**, not by name.

Research concludes the **likely long-term shape** is a dedicated **Firestore subcollection or collection** for note
attachments (metadata + GCS bytes), separate from tree navigation content. Exact choice is **not settled** — see
[note_image_embedding.md — Attachment storage model](../../../research/note_editor/note_image_embedding.md#attachment-storage-model-future).

**Why not now:** A separate attachment store would duplicate cross-cutting behaviour already planned for **content** —
especially [content versioning](../../../research/content_versioning.md), MCP write paths, soft-delete/cascade
([Story 64](../1-ready/64-story-content_deletion.md)), and orphan cleanup ([Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md)).
Phase A reuses `content` to ship inline images without building that twice.

**Migration:** Not a production concern — the app is pre-release (no production environment). Dev/staging data can be
reshaped or dropped when this story ships.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [ ] [Story 71](../4-in-progress/71-story-inline_images_in_notes.md) — Phase A interim `type: image` content (baseline behaviour).
- [ ] [Story 64](../1-ready/64-story-content_deletion.md) — soft-delete fields (inform cascade for attachments).
- [ ] [Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md) — orphan cleanup (may inform attachment lifecycle API).

## Acceptance Criteria

- [ ] Inline images are **not** tree `content` records (or `type: image` is removed / deprecated).
- [ ] Attachment metadata lives under a **documented Firestore shape** (subcollection, collection, or equivalent).
- [ ] Markdown continues to reference bodies via stable **`/api/content/{id}/body`** URLs (or documented successor).
- [ ] Orphan cleanup, note delete cascade, and (when applicable) **versioning** work for attachments without duplicating entire content stacks.
- [ ] Relationship to future **deck** children (tree vs attachment) is documented in research.

## Out of scope

- Flashcard deck implementation
- Content versioning UI / Trash
- Per-user storage quota UI (may consume attachment `body.size` aggregates either way)

## Technical Requirements

- [ ] Choose and document: subcollection vs top-level collection vs embedded array (research recommendation: subcollection
  for scale/concurrency).
- [ ] API routes for create/read/delete attachment bodies aligned with Stories 72–73 read path.
- [ ] Update orphan cleanup and delete cascade for the chosen model.
- [ ] Versioning/MCP: single attachment write path or explicit deferral with rationale.
- [ ] Remove or repurpose `GET …/children?attachments=true` if attachment listing moves off `content` children.

## Risks

- Duplicating versioning/soft-delete logic if not designed with [content_versioning.md](../../../research/content_versioning.md) up front.
- Deck product decision (tree child vs attachment) may constrain the attachment schema.

## Tasks

_To refine when this story is scheduled — after deck UX direction and Story 64/73 contracts are clearer._

- [ ] **[RESEARCH]** Finalize attachment schema and deck vs attachment split; amend [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md).
- [ ] **[BE]** Implement attachment storage + API; classical tests.
- [ ] **[FE]** Point upload/read/delete flows at new attachment API.
- [ ] **[DOCS]** Amend ADR 0002 if body read URLs or storage layout change.

## References

- [note_image_embedding.md — Attachment storage model (future)](../../../research/note_editor/note_image_embedding.md#attachment-storage-model-future)
- [content_naming.md](../../../dev/content_naming.md)
- [content_versioning.md](../../../research/content_versioning.md)
