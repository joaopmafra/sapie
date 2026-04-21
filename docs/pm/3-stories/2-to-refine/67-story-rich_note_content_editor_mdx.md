# Story 67: Rich note content editor (MDXEditor)

## Description

Ship a **rich markdown editor** using **`@mdxeditor/editor`** as the **default** note body surface: visual editing with
the markdown features listed below. **Keep** the existing **plain multiline editor (textarea)** from
[Story 55](../../5-done/55-story-note_content_editor.md) as a **second implementation** behind the same contract (see
**Dual implementation** below) for **fast, stable frontend unit tests** and for **local debugging** when isolating issues
between app wiring and MDXEditor.

**Product stance (unchanged):** **no raw-markdown or “source” mode** exposed to end users in the shipped UI. The textarea
path is **not** a user-facing “simple editor” toggle unless product explicitly adds that later; it exists for tests and
developer-controlled switching (e.g. env), so typical users only see the rich editor.

Reuse existing hooks, query keys, autosave, save status, unmount flush, and `PUT /api/content/:id/body` behavior for
**both** implementations.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [Story 55](../../5-done/55-story-note_content_editor.md) — Phases **0–5** complete (load path, save, autosave,
  in-flight save behavior, auth/cache boundaries as defined there).
- [Story 66](../../5-done/66-story-content_body_subdocument_and_client_cache.md) — **strongly preferred** complete first so
  the content DTO and TanStack cache policy are stable before MDXEditor integration.

## Dual implementation (plain textarea + MDXEditor)

### Goals

- **Rich (default in production):** MDXEditor with the plugin set in Scope; this is what users interact with after Story 67.
- **Plain (tests + troubleshooting):** Current textarea behavior preserved as `PlainNoteBodyEditor` (or equivalent name),
  implementing the **same props contract** as the rich editor so `NoteEditorPage` (or a thin `NoteBodyEditor` wrapper)
  does not branch on save logic.

### Shared contract (engineering checklist)

- [ ] Introduce a **single abstraction** (e.g. `NoteBodyEditor` + `NoteBodyEditorProps`) used by the note page: controlled
      **markdown string** in/out, and any callbacks the save pipeline already needs (e.g. change handlers, blur if
      required). **Do not** duplicate autosave / `useSaveNoteBody` / status machine inside each editor.
- [ ] **Production default:** rich editor (MDXEditor). Selecting plain is **not** a normal in-app user preference; use a
      **build-time or env switch** (e.g. `import.meta.env.VITE_NOTE_EDITOR === 'plain'`) documented in `packages/web`
      README or dev docs so developers can reproduce “textarea only” locally.
- [ ] **Unit tests:** Prefer the **plain** implementation for tests that focus on **orchestration** (load, debounce,
      save status, retry, unmount flush, query behavior). Keep those tests **fast and deterministic**.
- [ ] **MDXEditor tests:** Add a **small, focused** set of tests that mount the **rich** implementation (smoke, markdown
      round-trip or export behavior you care about). Accept that the rich suite may be slower; do not rely on plain-only
      tests to prove MDXEditor correctness.
- [ ] **Consistency:** Document that both implementations must produce **acceptable markdown** for the same logical content
      where applicable; if MDXEditor normalizes whitespace or syntax, add fixtures or one shared golden example so plain vs
      rich do not silently drift on `PUT` payloads.

### Non-goals for this story

- Shipping a **user-visible** “switch to plain text” control (unless product files a follow-up).
- Two different save pipelines or duplicate TanStack key logic.

## Scope (formerly Story 55 Phase 6)

- [ ] Install **`@mdxeditor/editor`**; theme and layout consistent with the note shell.
- [ ] Plugins: headings, bold, italic, ordered/unordered lists, code blocks + syntax highlighting, links; **no** raw
      markdown mode for users in the **rich** editor UI.
- [ ] Extract / keep **plain** textarea editor as one implementation; implement **rich** MDXEditor as the other; **compose**
      behind one wrapper + env/default selection on `NoteEditorPage` (or equivalent).
- [ ] **Reuse** `useSaveNoteBody`, query keys, autosave, save status machine, unmount flush, and Retry for **both**
      implementations.
- [ ] React tests: extend or adjust drivers; **prefer plain editor** for orchestration-heavy tests; add minimal **rich**
      tests; keep HTTP fakes at the boundary per project norms.

## Out of scope

- Math / LaTeX (unchanged; defer).
- Multi-tab / conflict UX — [Story 65](../2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md).

## Acceptance Criteria

- [ ] Opening a note shows its body in the **rich** editor by default (loaded via signed URL → fetch markdown) when a body
      exists.
- [ ] Opening a note with **no body yet** shows an empty editor with a sensible placeholder; no error for “missing
      body.”
- [ ] **Rich** editor supports headings, bold, italic, ordered/unordered lists, code blocks with syntax highlighting, and
      links.
- [ ] No user-facing **raw markdown** editing mode in the shipped product UI; textarea remains **developer/test** oriented
      per **Dual implementation**.
- [ ] **Plain** textarea implementation remains available behind the shared contract and is used for **orchestration**
      unit tests (or explicitly documented test helper) so CI does not depend on MDXEditor for every save-path test.
- [ ] **Env or build switch** documented: developers can run the app with **plain** editor to isolate wiring vs MDXEditor
      issues.
- [ ] Auto-save, save status, retry, unmount flush, and navigation behavior remain consistent with Story 55 intent for
      **both** implementations (unless explicitly superseded by Story 65 later).

## Risks and decisions

- **DTO churn:** Prefer completing [Story 66](../../5-done/66-story-content_body_subdocument_and_client_cache.md) before heavy
  MDXEditor integration so the public metadata shape and cache invalidation rules are stable. If schedule forces overlap,
  branch carefully and coordinate OpenAPI/client regeneration.
- **Raw markdown:** Do not ship a user-facing “source” or raw-markdown mode; product stance is visual editing only for
  end users. The textarea is a **maintainer/test** tool, not a product surface.
- **Implementation drift:** Plain and rich may serialize markdown differently. Mitigate with shared fixtures, at least one
  test or check on the rich path, and clear comments on any intentional normalization.

## References

- MVP objective — rich editor and features: [`docs/plans/mvp_objective.md`](../../../plans/mvp_objective.md)
