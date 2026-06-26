# Feature 47: Note Editing & Management

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Description

Provide users with the ability to edit notes efficiently, including editable titles, content editing, save status, and access to common actions.

## Stories

- [Story 53: Create Notes](../../5-done/53-story-create_notes.md)
- [Story 54: Display and Update Note Save Status](../../3-stories/2-to-refine/54-story-save_status_display.md)
- [Story 55: Implement Note Content Editor](../../5-done/55-story-note_content_editor.md) — textarea + autosave MVP; Phases 4–5 remaining
- [Story 66: Content body subdocument and client cache](../../5-done/66-story-content_body_subdocument_and_client_cache.md) — nested `body` + TanStack policy (after 55)
- [Story 67: Rich note content editor (MDXEditor)](../../5-done/67-story-rich_note_content_editor_mdx.md) — after 55 + 66
- [Story 71: Inline images in notes](../../5-done/71-story-inline_images_in_notes.md) — research Phase A; after 67
- [Story 72: Content body read via Service Worker](../../3-stories/2-to-refine/72-story-content_body_read_via_service_worker.md) — research Phases B–E; after 71
- [Story 73: Uniform body reads and image orphan cleanup](../../3-stories/2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md) — research Phase F; after 72 + 64
- [Story 65: Note body concurrency and conflict resolution](../../3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) — scheduled after 67 unless reprioritized
- [Story 56: Add Common Actions Menu Button to Note Editor](../../3-stories/2-to-refine/56-story-common_actions_menu.md)
