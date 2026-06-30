# Architecture review cycle

When a story involves a non-trivial design decision (new storage model, API contract, domain model change), use a structured review cycle before implementation:

## When to use

- Changing a storage model or data layout
- Introducing a new domain concept with API surface
- Replacing an existing subsystem
- A design choice with trade-offs that merit explicit documentation

## Cycle

1. **Critique** — Write a short critique of the current approach. What problems does it have? What assumptions are shaky? File under `docs/research/<area>/<topic>_critique.md`.

2. **Proposal** — Design the replacement. Cover: storage layout, API routes, data flow, edge cases, what's removed, what's deferred. Keep it concrete — use route tables, path templates, bullet lists. File under `docs/research/<area>/<topic>_proposal.md`.

3. **Review** — Pass the proposal to a strong reasoning model (Opus, DeepSeek V4 Pro, or the OMP SLOW model). The review should identify: gaps, missed edge cases, inconsistencies, over-engineering, and alignment with MVP priorities. File the review under `docs/research/<area>/<topic>_review_and_road_ahead.md`.

4. **Settle** — Mark the review's findings as "Resolved — implemented as Story N" or "Deferred — will address in Story M". Update the proposal status to "Accepted".

5. **Implement** — Write the story with acceptance criteria derived from the settled proposal. The story references the proposal doc, not vice versa.

## Example: Blob storage model (Story 75)

- Critique: `docs/research/note_editor/attachment_storage_model_critique.md` — 6 problems with Story 74 attachment subcollection model
- Proposal: `docs/research/note_editor/blob_storage_model_proposal.md` — GCS-only, directory-per-content, single POST
- Review: `docs/research/note_editor/blob_storage_model_review_and_road_ahead.md` — Opus review, marked resolved
- Implemented as Story 75 (`docs/pm/5-done/75-story-blob_storage_model_refactor.md`)
