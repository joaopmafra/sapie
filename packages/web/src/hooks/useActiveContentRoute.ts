import { useMatch } from 'react-router-dom';

/**
 * Derives the active note or folder id from the current URL.
 * The URL is the single source of truth for sidebar selection and main content.
 */
export function useActiveContentRoute() {
  const noteMatch = useMatch('/notes/:noteId');
  const folderMatch = useMatch('/folders/:folderId');

  const noteId = noteMatch?.params.noteId;
  const folderId = folderMatch?.params.folderId;
  const activeNodeId = noteId ?? folderId ?? null;

  return { noteId, folderId, activeNodeId };
}
