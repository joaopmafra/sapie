import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';

import { contentService } from './content-service';
import { contentQueryKeys } from './query-keys';
import { contentItemQueryRetry } from './query-retry-utils';
import type { Content } from './types';

/** Markdown bytes query: strictly under signed URL TTL (10m); refetch/invalidate when URL rotates. */
const NOTE_MARKDOWN_STALE_MS = 2 * 60 * 1000;

const disabledContentBodySignedUrlQueryKey = [
  'content',
  'body-signed-url',
  '__disabled__',
] as const;

const disabledBodySignedUrlFetchSuppressedQueryKey = [
  'content',
  'body-signed-url-fetch-suppressed',
  '__disabled__',
  '__disabled__',
] as const;

const disabledNoteBodyMarkdownQueryKey = [
  'content',
  'note-markdown',
  '__disabled__',
  '__none__',
] as const;

export function useRootDirectory() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.root(),
    queryFn: () => contentService.getRootDirectory(currentUser!),
    enabled: Boolean(currentUser),
  });
}

export function useFolderChildren(parentId: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.children(parentId!),
    queryFn: () => contentService.getContentByParentId(currentUser!, parentId!),
    enabled: Boolean(currentUser) && Boolean(parentId),
  });
}

const disabledContentItemQueryKey = [
  'content',
  'item',
  '__disabled__',
] as const;

export type UseContentBodyOptions = {
  /**
   * When `false`, skips `GET …/body/signed-url` (no stored body yet per metadata `size`, or the
   * note editor has suppressed refetch after a successful body save for this session).
   * When `true` or omitted, runs whenever `id` and auth allow (default for backward compatibility).
   */
  enabled?: boolean;
};

/**
 * Subscribes to a client-only TanStack Query cache entry set after `PUT …/body` succeeds from the
 * note editor (see `useSaveNoteBody`). Never runs `queryFn`; `setQueryData` drives updates.
 */
export function useBodySignedUrlFetchSuppressedAfterSave(
  noteId: string | undefined,
  editorSessionId: string
) {
  const safeId = noteId && !noteId.startsWith('dummy_') ? noteId : undefined;
  return useQuery({
    queryKey:
      safeId != null
        ? contentQueryKeys.bodySignedUrlFetchSuppressedForSession(
            safeId,
            editorSessionId
          )
        : disabledBodySignedUrlFetchSuppressedQueryKey,
    queryFn: async () => false,
    enabled: false,
    initialData: false,
  });
}

export function useContentBody(
  id: string | undefined,
  options?: UseContentBodyOptions
) {
  const { currentUser } = useAuth();
  const safeId = id && !id.startsWith('dummy_') ? id : undefined;
  const allowSignedUrlFetch = options?.enabled !== false;
  return useQuery({
    queryKey:
      safeId != null
        ? contentQueryKeys.bodySignedUrl(safeId)
        : disabledContentBodySignedUrlQueryKey,
    queryFn: () => contentService.getContentBody(currentUser!, safeId!),
    enabled: Boolean(currentUser) && safeId != null && allowSignedUrlFetch,
    staleTime: NOTE_MARKDOWN_STALE_MS,
  });
}

/**
 * Loads markdown from a signed Storage URL. Skips the network when `signedUrl` is missing (no body yet).
 */
export function useNoteBody(
  noteId: string | undefined,
  signedUrl: string | null | undefined
) {
  const { currentUser } = useAuth();
  const safeId = noteId && !noteId.startsWith('dummy_') ? noteId : undefined;
  const url =
    typeof signedUrl === 'string' && signedUrl.length > 0 ? signedUrl : null;

  return useQuery({
    queryKey:
      safeId != null && url != null
        ? contentQueryKeys.noteMarkdown(safeId, url)
        : disabledNoteBodyMarkdownQueryKey,
    queryFn: () => contentService.fetchNoteMarkdown(url!),
    enabled: Boolean(currentUser) && safeId != null && url != null,
    staleTime: NOTE_MARKDOWN_STALE_MS,
  });
}

/**
 * Applies `PUT …/body` metadata to the item cache and keeps the editor markdown in sync with what was saved **without**
 * calling `GET …/body/signed-url` again (avoids replacing the in-progress editor; Story 65 covers concurrency).
 */
function syncCachesAfterPutNoteBody(
  queryClient: QueryClient,
  id: string,
  updated: Content,
  savedBodyText: string
): void {
  queryClient.setQueryData(contentQueryKeys.item(id), updated);
  const cached = queryClient.getQueryData<{ signedUrl?: string } | null>(
    contentQueryKeys.bodySignedUrl(id)
  );
  const url = cached?.signedUrl;
  queryClient.removeQueries({ queryKey: ['content', 'note-markdown', id] });
  if (typeof url === 'string' && url.length > 0) {
    queryClient.setQueryData(
      contentQueryKeys.noteMarkdown(id, url),
      savedBodyText
    );
  }
}

/**
 * `PUT /api/content/:id/body` for the current editor string (`text/markdown`).
 * Used by the note editor for debounced auto-save, unmount flush, and Retry (Story 55 Phase 3).
 */
export function useSaveNoteBody() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      bodyText,
    }: {
      id: string;
      bodyText: string;
      /** Stable for this `NoteEditorPage` mount — scopes “suppress signed URL fetch” to this editor visit. */
      editorSessionId: string;
    }): Promise<Content> => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      return contentService.putContentBody(
        currentUser,
        id,
        bodyText,
        'text/markdown'
      );
    },
    onSuccess: (content, { id, bodyText, editorSessionId }) => {
      syncCachesAfterPutNoteBody(queryClient, id, content, bodyText);
      queryClient.setQueryData(
        contentQueryKeys.bodySignedUrlFetchSuppressedForSession(
          id,
          editorSessionId
        ),
        true
      );
    },
  });
}

export function useContentItem(id: string | undefined) {
  const { currentUser } = useAuth();
  const safeId = id && !id.startsWith('dummy_') ? id : undefined;
  return useQuery({
    queryKey:
      safeId != null
        ? contentQueryKeys.item(safeId)
        : disabledContentItemQueryKey,
    queryFn: () => contentService.getContentById(currentUser!, safeId!),
    enabled: Boolean(currentUser) && safeId != null,
    retry: contentItemQueryRetry,
  });
}

export function useCreateNote() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string }) =>
      contentService.createNote(currentUser!, name, parentId),
    onSuccess: (_newNote, { parentId }) => {
      void queryClient.invalidateQueries({
        queryKey: contentQueryKeys.children(parentId),
      });
    },
  });
}

export function useRenameContent() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      name,
    }: {
      id: string;
      name: string;
      parentId: string | null;
    }) => contentService.patchContent(currentUser!, id, { name }),
    onSuccess: (_updated, { id, parentId }) => {
      void queryClient.invalidateQueries({
        queryKey: contentQueryKeys.item(id),
      });
      if (parentId) {
        void queryClient.invalidateQueries({
          queryKey: contentQueryKeys.children(parentId),
        });
      } else {
        void queryClient.invalidateQueries({
          queryKey: contentQueryKeys.root(),
        });
      }
    },
  });
}

// TODO (Story 64 — content deletion): Add `useDeleteContent()` when `DELETE /api/content/:id` exists.
// In `onSuccess`, invalidate `contentQueryKeys.children(parentId)` and call
// `queryClient.removeQueries({ queryKey: contentQueryKeys.item(id) })` so cached
// single-item data (e.g. `/notes/:id`) is dropped immediately. See
// docs/pm/3-stories/1-ready/64-story-content_deletion.md (TanStack Query section).
