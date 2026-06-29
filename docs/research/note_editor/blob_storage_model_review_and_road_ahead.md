# Blob storage model — review and road ahead

**Status:** Resolved — implemented as Story 75 (2026-06-29). The blob refactor was done ahead of the review's "defer" recommendation because the user wanted clean image URLs before creating real notes. 155 tests pass, types clean.

**Related**

- [Blob storage model proposal](./blob_storage_model_proposal.md) — the proposal under review
- [Attachment storage model critique](./attachment_storage_model_critique.md) — the critique that originated the proposal
- [Note image embedding research](./note_image_embedding.md) — current image spec and phases
- [MVP objective](../../plans/mvp_objective.md) — required features and priority order
- [Story 74 — Dedicated attachment storage model](../../pm/3-stories/1-ready/74-story-dedicated_attachment_storage_model.md) — the shipped model
- [Simplicity is the key](../../dev/xp_simplicity_is_the_key.md)

## TL;DR

- The blob proposal is **technically sound and genuinely simpler** than the shipped Story 74 model. If/when we touch image storage again, this is the right direction.
- But the proposal is **not on the critical path to the current objective** (flashcard decks + study mode for daily use). It is the **third** rework of image storage (Story 71 → 74 → proposed 75), and image storage already *works*.
- **Recommendation: defer the blob refactor.** Go straight from "images work" to the features that are still missing and that the daily study routine actually depends on: **content deletion → flashcard decks → study mode → result tracking**. None of those depend on the image storage model.
- Revisit the blob model later — it is pre-production, low-risk, and cleanly swappable, so deferring costs us nothing.

## Part 1 — Is the proposal a good design?

Yes. On the merits it is a clear improvement over the shipped Story 74 model.

### What it gets right

- **One round-trip instead of three.** `POST /blobs` replaces `POST attachment → PUT body → PUT markdown`. Fewer serial steps means fewer partial-state windows (Firestore doc without bytes, bytes without reference, etc.).
- **No Firestore subcollection.** For an immutable blob, `mimeType`/`size`/timestamps are all GCS object metadata. A per-image Firestore document that is read once (during reconcile) and never queried, sorted, or paginated is dead weight. Removing it is correct.
- **No regex reconcile.** `parseReferencedAttachmentIds` scanning markdown to decide which blobs are alive is the most fragile part of the current model (URL-encoding, code blocks, future path changes). The proposal deletes the whole mechanism: the **GCS prefix is the authoritative blob list**, which is strictly better than parsing text.
- **Delete is trivial.** "List the prefix, delete the objects" replaces subcollection-cascade logic. The stated ordering (soft-delete the note first, then delete blobs) is the right safety choice — a leaked blob costs bytes, a wrongly-deleted blob costs content.
- **Decouples `expectedRevision` from attachments.** Concurrency control on `PUT /body` becomes a pure concurrency concern and can ship (or not) independently.

### Things to verify before implementing (not blockers)

- **`blobId` uniqueness within the prefix.** A 12-char nanoid plus a cheap exists-check (or accept the astronomically low collision risk) is fine; just make the choice explicit.
- **The GET endpoint still streams through the API server.** Same cost/latency profile as today — acceptable for MVP; Service Worker caching (Stories 72–73) is the eventual win, unchanged by this proposal.
- **Orphan-on-failed-save is now accepted, not cleaned up.** Story 74 actively cleaned staged attachments on 409; the blob model lets the orphan live under the note's prefix until the note is deleted. This is consistent with "storage is cheap" and is fine for a single user — just note it is a deliberate trade, not an oversight.

### One nuance worth correcting

Critique problem #4 ("URL couples images to note identity") is **only partially addressed**. The proposed URL still embeds `contentId`: `/api/content/{contentId}/blobs/{blobId}`. The proposal's own comparison table is honest about this ("NoteId in display URL: Yes").

That is acceptable because in this codebase a **note move changes `parentId`/`folderId`, not the immutable `contentId`** — so moving a note does *not* require rewriting image markdown. The only residual coupling is *copy* (a copied note would need fresh blobs), which is not an MVP concern. So the nuance does not weaken the proposal; it just means "portability" is narrower than the critique implied.

**Verdict:** approve the design, defer the work.

## Part 2 — The meta-finding: this is a detour

### Where we actually are

Done and shipped (MVP priorities 1–4):

- Note creation (Story 53), TanStack Query refactor (Story 62)
- Note content editor + MDX rich editor (Stories 55 / 66 / 67)
- Folder creation (Story 63)
- Inline images: interim model (Story 71) → dedicated attachment model (Story 74)

Still missing (MVP priorities 5–10):

- **Content deletion** (Story 64) — written and ready, but **not implemented**
- **Flashcard decks + cards** (priority 6) — **no story exists**
- **Study mode** (priority 7) — **no story exists**
- **Study result tracking** (priority 8) — **no story exists**
- **Folder-level study** (priority 9) — **no story exists**
- **Responsive polish** (priority 10)

### The pattern

Image storage has now been designed three times: Story 71 (interim `ContentType.IMAGE`), Story 74 (Firestore subcollection + reconcile), and the proposed Story 75 (GCS-only blobs). Each iteration is a real improvement — and each one is investment in a feature that is **already working** and is **not what makes Sapie a study tool**.

Meanwhile, the features that define the objective — decks and study mode — have not been started and do not even have stories yet.

### Why image storage is not blocking the objective

- **Flashcard decks are content children** (`parentId = noteId`), not blobs. The blob proposal explicitly states decks are unaffected.
- **Study mode** operates on decks and cards. It never touches image storage.
- So the image model and the deck/study model are **orthogonal**. There is no technical dependency forcing the blob refactor before flashcards.

The success criteria in the MVP objective (create a deck, add cards, study it, track results, study a whole folder) can all be met on top of the *current* image storage. Refactoring images first delays every one of them.

## Part 3 — A clear road ahead

Recommended order, optimized for "usable study tool, soonest":

1. **Content deletion (Story 64).** Already ready. Needed for daily use (you will create junk while learning the tool). With the current model, attachment cascade is the subcollection delete; do not block this on the blob refactor.
2. **Write the flashcard deck story, then build it.** Deck as a `content` child of a note; create/rename/delete deck from the note editor's Attachments section; create/edit/delete cards (front/back markdown). Store the FSRS-ready card fields (`dueDate`, `interval`, `repetitions`, `lastResult`) now so study mode is a UI-only upgrade later.
3. **Study mode — single deck.** Front → reveal → "I know" / "I don't know"; re-queue "don't know" cards within the session; session ends when every card is known once.
4. **Study result tracking.** Per-card `lastStudied`, `correctCount`, `incorrectCount`, `lastResult`.
5. **Folder-level study ("Study all").** Uses the denormalized `folderId` on decks (per the settled design) to collect decks under a folder.
6. **Responsive pass** across editor, deck view, and study mode.

Image storage (the blob refactor) is **not in this list**. It is parallel, optional, and deferrable.

### When to revisit the blob model

Pull the blob proposal forward only if one of these becomes true:

- The Story 74 reconcile/`expectedRevision` path is causing **actual, reproducible bugs** in daily use (the save-loop observation is so far unreproduced) — then a timeboxed swap is justified.
- We are about to build the **MCP server** (which needs a clean `POST /blobs` upload surface) — the blob endpoint is a better foundation than the three-step attachment flow.
- We start **content versioning** — simpler, metadata-free blobs reduce what has to be versioned.

Until then, treat the proposal as an **approved, parked design**: keep the doc, mark it "approved – deferred", and do not open Story 75 ahead of the deck/study work.

Because the project is **pre-production**, there is no migration cost to deferring: when we do the swap, we drop dev/staging blob data and move on.

## Decision requested

The trade-off is: **(A)** spend ~1–2 days now swapping a working image model for a cleaner one, before any flashcard/study work, versus **(B)** leave image storage as-is and spend that time getting decks + study mode into daily use, revisiting the blob model only when MCP/versioning or a real bug forces it.

This doc recommends **(B)**.

## Change log

- **2026-06-29** — Initial review of the blob storage proposal and critique, with a recommended road ahead toward flashcard decks and study mode.
