# Story 53: Create Notes

## Epic Reference

- [Epic 45: Content Management Foundation](../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../2-features/1-ready/47-feature-note_editing_and_management.md)

## User Story

As a user, I want to create notes and edit the title of them directly in the editor so that I can easily update and
organize my content.

## Details

- Add a menu button above the Content Explorer. When clicked, it will open a menu with the following options:
  - Create Note
  - Create Folder (we won't implement the folder creation for now)
- When the user clicks "Create Note", a modal opens with a form to create a new note. The form should show which path the note will be created in and have a title field.
- The Create Note modal should not allow the user to create a note in a path that already has a note with the same name.
- When the user clicks "Create" in the Create Note modal, the note is created and the user is redirected to the note editor.
- The note editor should have just a title field that is editable for now. When the user is editing a note's title and hit Enter, the note gets renamed and its title is updated in the Content Explorer and in the note editor.

## Tasks

- [x] **Task 1: [FE] Implement "New Content" Menu**:
  - Add a new menu button above the `ContentExplorer`.
  - The button will open a menu with "Create Note" and "Create Folder" options. "Create Folder" will be disabled.
- [x] **Task 2: [BE] Implement Note Creation Endpoint**:
  - Create a `POST /content` endpoint to create a new note.
  - It will accept `title` and `parentId`.
  - It must validate against duplicate names in the same location.
  - It must validate if the user is the owner of the parent folder.
- [ ] **Task 3: [FE] Implement "Create Note" Modal & Logic**:
  - On "Create Note" click, open a modal with a title input.
  - The creation path (based on selected folder or root) should be displayed.
  - On submission, call the backend, handle success/errors, refresh the content explorer, and navigate to the new note.
- [ ] **Task 4: [FE] Basic Note Editor with Editable Title**:
  - Create a view for the note editor that displays an editable title.
- [ ] **Task 5: [BE] Implement Note Renaming Endpoint**:
  - Create a `PATCH /content/:id` endpoint to update a note's title.
  - It must validate against duplicate names in the same location.
- [ ] **Task 6: [FE] Implement Title Renaming Logic**:
  - In the editor, on "Enter" after editing the title, call the renaming endpoint.
  - Update the UI in the editor and `ContentExplorer` on success.
  - Display an inline error message if an error occurs.
- [ ] **Task 7: [E2E] Write E2E Tests**:
  - Add Playwright tests for the note creation and renaming flows.
- [ ] **Task 8: [DOCS] Update Documentation**:
  - Update API documentation for the new/changed endpoints.
