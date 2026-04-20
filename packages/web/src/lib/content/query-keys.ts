export const contentQueryKeys = {
  root: () => ['content', 'root'] as const,
  allChildren: () => ['content', 'children'] as const,
  children: (parentId: string) => ['content', 'children', parentId] as const,
  item: (id: string) => ['content', 'item', id] as const,
  /** Signed read URL for `GET /api/content/:id/body/signed-url`. */
  bodySignedUrl: (id: string) => ['content', 'body-signed-url', id] as const,
  /**
   * Client-only flag (never fetched): after a successful `PUT …/body`, the note editor stops enabling
   * the signed-URL query so `body` appearing after first save does not trigger `GET …/body/signed-url`.
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
   * Fetched **note body text** (markdown / plain text) from Storage. Includes `bodyVersion` (`body.updatedAt` ISO) so
   * rename-only metadata refetches reuse cache, while body changes load a new cache entry. Other content kinds with
   * non-text bodies use separate keys when introduced.
   */
  noteBodyText: (id: string, bodyVersion: string) =>
    ['content', 'note-body-text', id, bodyVersion] as const,
} as const;
