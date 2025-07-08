# Story 60: Denormalize Folder Data for Frontend Optimization

## User Story

As a developer, I want to denormalize folder data by including a `childrenCount` field, so that the frontend can avoid
making unnecessary API calls for empty folders and improve UI stability.

## Epic Reference

- [Epic 45: Content Management Foundation](../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 46: Content Navigation & Organization](../2-features/2-to-refine/46-feature-content_navigation_and_organization.md)

## Original Discussion

When we try to fetch the children of an empty folder, the folder expands showing the dummy node; then quickly it closes
again because no children were returned in the endpoint call. I think that's not good usability. Some time ago I was
thinking of a way to optimize Firebase queries to load contents. I think we can both fix the usability issue I have
pointed out and optimize the queries by making the folders also have the metadata of all its children, denormalizing the
database. This way when we fetch a folder, we will be able to know if it has children. The only problem I see with this
approach is if the folder has a big number of children, but we can think of ways to optimize that. I haven't implemented
that yet because I think it's a premature optimization.

## Problem Statement

Currently, the content explorer UI attempts to lazy-load children for any folder, even if it's empty. This results in a
poor user experience where the folder expands to show a "Loading..." message, only to immediately collapse again when
the API returns no children. This also causes an unnecessary API call for every empty folder a user clicks on.

## Proposed Solution

To resolve this, we will denormalize our Firestore data model. Each `directory` document will store a `childrenCount`
field, representing the number of direct descendants it has.

The frontend will use this field to determine whether to display an expansion icon next to a folder. If `childrenCount`
is greater than 0, the icon is shown, and lazy-loading is enabled. If it is 0, no icon is shown, and the folder is
correctly displayed as empty without being expandable.

## Acceptance Criteria

- [ ] The `Content` entity and Firestore data model are updated to include an optional `childrenCount` field for
  directories.
- [ ] Backend logic is updated to maintain the `childrenCount` when content is created, deleted, or moved.
- [ ] The `GET /api/content/root` and `GET /api/content?parentId=:id` endpoints include the `childrenCount` field for
  directory items.
- [ ] The `ContentExplorer` component on the frontend uses the `childrenCount` to conditionally render the expansion
  icon.
- [ ] Folders with a `childrenCount` of 0 do not show an expansion icon and are not expandable.
- [ ] Folders with a `childrenCount` greater than 0 show an expansion icon and lazy-load their children upon expansion.
- [ ] The "flicker" issue for empty folders is resolved.

## Technical Requirements

- [ ] Update Firestore security rules if necessary.
- [ ] Modify `ContentService` on the backend to manage the `childrenCount` updates. This may require batch writes or
  transactions to ensure data consistency.
- [ ] Update `ContentExplorer.tsx` on the frontend to incorporate the new logic.
- [ ] Ensure all existing tests pass and add new tests for the `childrenCount` logic if applicable.

## Tasks

- [ ] **Backend**:
    - [ ] Update the `Content` entity in `packages/api` to include `childrenCount`.
    - [ ] Modify services responsible for content creation/deletion to update `childrenCount` on the parent document.
    - [ ] Write a migration script to backfill `childrenCount` for existing folders (optional, for existing
      environments).
- [ ] **Frontend**:
    - [ ] Update the `TreeNode` interface in `ContentExplorer.tsx` to include `childrenCount`.
    - [ ] Modify the component to use `childrenCount` to determine if a node is expandable, replacing the "dummy node"
      logic for this specific purpose. 
