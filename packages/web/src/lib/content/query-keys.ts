export const contentQueryKeys = {
  root: () => ['content', 'root'] as const,
  allChildren: () => ['content', 'children'] as const,
  children: (parentId: string) => ['content', 'children', parentId] as const,
  item: (id: string) => ['content', 'item', id] as const,
  /** Signed read URL for `GET /api/content/:id/body/signed-url`. */
  bodySignedUrl: (id: string) => ['content', 'body-signed-url', id] as const,
  /**
   * Client-only flag (never fetched): after a successful `PUT …/body`, the note editor stops enabling
   * the signed-URL query so `size` flipping from empty→non-empty does not trigger `GET …/body/signed-url`.
   * Scoped by a per-mount session id so leaving and re-entering the editor (or history navigation) clears suppression.
   */
  bodySignedUrlFetchSuppressedForSession: (
    id: string,
    editorSessionId: string
  ) =>
    [
      'content',
      'body-signed-url-fetch-suppressed',
      id,
      editorSessionId,
    ] as const,
  /**
   * Fetched markdown bytes for a note. Key includes `signedUrl` so the cache stays correct when the URL rotates (~10m)
   * or after invalidation. Invalidate with prefix `['content', 'note-markdown', id]` after saves.
   */
  noteMarkdown: (id: string, signedUrl: string) =>
    ['content', 'note-markdown', id, signedUrl] as const,
} as const;
