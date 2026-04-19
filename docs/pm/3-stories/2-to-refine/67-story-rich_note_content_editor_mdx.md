# Story 67: Rich note content editor (MDXEditor)

## Description

Replace the **plain multiline editor (textarea)** shipped for [Story 55](../../5-done/55-story-note_content_editor.md)
MVP with a **rich markdown editor** using **`@mdxeditor/editor`**: visual editing with the markdown features listed below;
**no raw-markdown mode** for end users. Reuse existing hooks, query keys, autosave, save status, unmount flush, and
`PUT /api/content/:id/body` behavior.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [Story 55](../../5-done/55-story-note_content_editor.md) — Phases **0–5** complete (load path, save, autosave,
  in-flight save behavior, auth/cache boundaries as defined there).
- [Story 66](../../4-in-progress/66-story-content_body_subdocument_and_client_cache.md) — **strongly preferred** complete first so
  the content DTO and TanStack cache policy are stable before MDXEditor integration.

## Scope (formerly Story 55 Phase 6)

- [ ] Install **`@mdxeditor/editor`**; theme and layout consistent with the note shell.
- [ ] Plugins: headings, bold, italic, ordered/unordered lists, code blocks + syntax highlighting, links; **no** raw
      markdown mode for users.
- [ ] Replace the textarea on `NoteEditorPage` while **reusing** `useSaveNoteBody`, query keys, autosave, save status
      machine, unmount flush, and Retry.
- [ ] React tests: extend or adjust drivers; keep HTTP fakes at the boundary per project norms.

## Out of scope

- Math / LaTeX (unchanged; defer).
- Multi-tab / conflict UX — [Story 65](../2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md).

## Acceptance Criteria

- [ ] Opening a note shows its body in the **rich** editor (loaded via signed URL → fetch markdown) when a body exists.
- [ ] Opening a note with **no body yet** shows an empty editor with a sensible placeholder; no error for “missing
      body.”
- [ ] Editor supports headings, bold, italic, ordered/unordered lists, code blocks with syntax highlighting, and links.
- [ ] No user-facing **raw markdown** editing mode.
- [ ] Auto-save, save status, retry, unmount flush, and navigation behavior remain consistent with Story 55 intent
      (unless explicitly superseded by Story 65 later).

## Risks and decisions

- **DTO churn:** Prefer completing [Story 66](../../4-in-progress/66-story-content_body_subdocument_and_client_cache.md) before heavy
  MDXEditor integration so the public metadata shape and cache invalidation rules are stable. If schedule forces overlap,
  branch carefully and coordinate OpenAPI/client regeneration.
- **Raw markdown:** Do not ship a user-facing “source” or raw-markdown mode; product stance is visual editing only.

## References

- MVP objective — rich editor and features: [`docs/research/mvp_objective.md`](../../../plans/mvp_objective.md)
