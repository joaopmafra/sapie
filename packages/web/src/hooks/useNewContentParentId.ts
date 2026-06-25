import { ContentType, useContentItem, useRootDirectory } from '../lib/content';

import { useActiveContentRoute } from './useActiveContentRoute';

/**
 * Resolves the parent folder for "New note" / "New folder" from the current URL.
 */
export function useNewContentParentId(): string {
  const { noteId, folderId } = useActiveContentRoute();
  const { data: root } = useRootDirectory();
  const { data: note } = useContentItem(noteId);
  const { data: folder } = useContentItem(folderId);

  if (folderId && folder?.type === ContentType.DIRECTORY) {
    return folder.id;
  }

  if (noteId && note?.parentId) {
    return note.parentId;
  }

  return root?.id ?? '';
}
