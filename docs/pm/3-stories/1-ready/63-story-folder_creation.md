# Story 63: Folder Creation

## Description

As a user, I want to create folders in my content tree so that I can organise my notes by study domain
(e.g. AI Engineering, DSA, System Design, DevSecOps).

## Details

- The "New" menu in the navigation drawer already has a "Create Folder" item, but it is currently disabled.
  This story enables it.
- Clicking "Create Folder" opens a modal identical in layout to the "Create Note" modal: shows the
  current path (location where the folder will be created) and a name input field.
- Validation: a folder with the same name cannot exist in the same parent directory.
- On success, the new folder appears immediately in the content tree and is expanded/selected.
- Folders can be created inside other folders (nesting is already supported by the tree).
- Folders cannot be created inside notes (notes are leaf nodes with no valid child types at this stage).

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [ ] [Story 53](../../4-in-progress/53-story-create_notes.md) — Must be complete. The "New" menu and
  `CreateNoteModal` pattern are reused here.
- [ ] [Story 62](./62-story-tanstack_query_refactor.md) — TanStack Query must be in place so folder creation
  invalidates only the affected parent's children query.

## Acceptance Criteria

- [ ] "Create Folder" in the "New" menu is enabled and opens a creation modal.
- [ ] The modal displays the current path and accepts a folder name.
- [ ] A folder with a duplicate name in the same parent is rejected with a clear error message.
- [ ] On success, the new folder appears in the content tree without a full tree re-fetch.
- [ ] The new folder is selected in the tree after creation.
- [ ] Attempting to create a folder with a note selected as parent correctly creates in the note's parent
  folder (same behaviour as note creation).

## Technical Requirements

- [ ] The existing `POST /api/content` endpoint currently hardcodes `type: ContentType.NOTE`. It must be
  updated to accept an optional `type` field (defaulting to `NOTE` for backwards compatibility).
- [ ] The backend must validate that a directory can only be created inside another directory (not inside
  a note).

## Tasks

### Backend

- [ ] **[BE] Update `POST /api/content` to support `type` parameter**
    - Add optional `type` field to `CreateContentDto` (values: `note` | `directory`; default: `note`).
    - Update `ContentService.create()` to accept and use the `type` parameter.
    - Add validation: if `type === 'directory'`, the parent must also be a directory. Return 400 otherwise.
    - Duplicate name check already exists — no changes needed.

### Frontend

- [ ] **[FE] Enable "Create Folder" menu item in `NavigationDrawer`**
    - Remove the `disabled` prop from the "Create Folder" `MenuItem`.
    - Wire `onClick` to open the folder creation modal (new state: `folderModalOpen`).

- [ ] **[FE] Create `CreateFolderModal` component**
    - Clone the structure of `CreateNoteModal`.
    - Calls `useCreateFolder()` mutation hook (add to `content-hooks.ts`).
    - `useCreateFolder()` calls `POST /api/content` with `type: 'directory'`, invalidates
      `contentQueryKeys.children(parentId)` on success.
    - On success: close modal, select the new folder in the tree, expand it.

### Testing

- [ ] **[E2E] Folder creation flow**
    - Create a folder at root level and verify it appears in the tree.
    - Create a nested folder and verify the hierarchy.
    - Attempt to create a duplicate folder name and verify the error message.

### Documentation

- [ ] **[DOCS]** Update API documentation for the updated `POST /api/content` endpoint.
