# 61 - Refactor Root Directory Creation

## Description

As a developer, I want to refactor the root directory creation to happen upon user creation, so that the application is
more efficient and scalable.

## Details

Currently, the root directory is created on-demand when a user accesses the content section for the first time. This is
inefficient as it requires a check on every access. This story proposes to change this logic to create the root
directory when a new user is created in Firebase. The user's entity should then be updated to store a reference to this
root directory ID. This will simplify content access logic and improve performance.

## Epic

- [45-epic-content_management_foundation](pm/1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Acceptance Criteria

- [ ] When a new user is created, a root directory is automatically created for them.
- [ ] The user's record in the database contains the ID of their root directory.
- [ ] The API endpoint to get the root directory retrieves the ID from the user's record.
- [ ] Existing users are not negatively affected (a migration plan might be needed).

## Technical Requirements

- [ ] Use Firebase Authentication triggers to initiate the root directory creation.
- [ ] Store the root directory ID in the user's Firestore document.
- [ ] Modify the backend services to use this new approach.

## Tasks

### Implementation

- [ ] Implement a Firebase Authentication trigger (`onCreate`) to create a root directory for new users.
- [ ] Update the user's data in Firestore to include the root directory ID.
- [ ] Refactor `ContentController` and `RootDirectoryService` to get the root directory ID from the user's data.

### Testing

- [ ] Add unit/integration tests for the new user creation trigger.
- [ ] Update E2E tests for content access to ensure they still pass.

### Documentation

- [ ] Update architecture and technical documentation to reflect the new root directory creation flow. 
