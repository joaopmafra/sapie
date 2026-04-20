import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';

import { noteBodyVersionKey } from './content-body-cache-policy';
import { contentService } from './content-service';
import { contentQueryKeys } from './query-keys';
import { contentItemQueryRetry } from './query-retry-utils';
import type { Content } from './types';

/** Note body fetch: keep shorter than signed URL TTL; `body.updatedAt` in the query key is the main freshness lever. */
const NOTE_BODY_FETCH_STALE_MS = 2 * 60 * 1000;

const METADATA_REFETCH = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
};

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

const disabledNoteBodyTextQueryKey = [
  'content',
  'note-body-text',
  '__disabled__',
  '__no_version__',
] as const;

export function useRootDirectory() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.root(),
    queryFn: () => contentService.getRootDirectory(currentUser!),
    enabled: Boolean(currentUser),
    ...METADATA_REFETCH,
  });
}

export function useFolderChildren(parentId: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.children(parentId!),
    queryFn: () => contentService.getContentByParentId(currentUser!, parentId!),
    enabled: Boolean(currentUser) && Boolean(parentId),
    ...METADATA_REFETCH,
  });
}

export type UseContentBodyOptions = {
  /**
   * When `false`, skips `GET …/body/signed-url` (no stored body yet per metadata `body`, or the
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
    staleTime: NOTE_BODY_FETCH_STALE_MS,
  });
}

function isUnauthorizedNoteBodyError(error: unknown): boolean {
  const s = (error as Error & { status?: number }).status;
  return s === 403 || s === 401;
}

/**
 * Loads note body text from a signed Storage URL. Skips the network when `signedUrl` or `bodyVersion` is missing.
 * On **403 / 401** (expired URL), refreshes the signed URL once and retries the fetch.
 *
 * @param bodyVersion — `body.updatedAt.toISOString()` from metadata; included in the query key so rename-only
 *   refetches reuse cache, while body changes load a new cache entry.
 */
export function useNoteBody(
  noteId: string | undefined,
  signedUrl: string | null | undefined,
  bodyVersion: string | null | undefined
) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const safeId = noteId && !noteId.startsWith('dummy_') ? noteId : undefined;
  const url =
    typeof signedUrl === 'string' && signedUrl.length > 0 ? signedUrl : null;

  return useQuery({
    queryKey:
      safeId != null && url != null && bodyVersion != null
        ? contentQueryKeys.noteBodyText(safeId, bodyVersion)
        : disabledNoteBodyTextQueryKey,
    queryFn: async () => {
      const tryDownload = async (u: string) =>
        contentService.fetchNoteBodyText(u);
      try {
        return await tryDownload(url!);
      } catch (e) {
        if (!isUnauthorizedNoteBodyError(e)) throw e;
        await queryClient.invalidateQueries({
          queryKey: contentQueryKeys.bodySignedUrl(safeId!),
        });
        const fresh = await queryClient.fetchQuery({
          queryKey: contentQueryKeys.bodySignedUrl(safeId!),
          queryFn: () => contentService.getContentBody(currentUser!, safeId!),
        });
        if (!fresh?.signedUrl) throw e;
        return tryDownload(fresh.signedUrl);
      }
    },
    enabled:
      Boolean(currentUser) &&
      safeId != null &&
      url != null &&
      bodyVersion != null,
    staleTime: NOTE_BODY_FETCH_STALE_MS,
  });
}

/**
 * Applies `PUT …/body` metadata to the item cache and keeps the editor body text in sync with what was saved **without**
 * calling `GET …/body/signed-url` again (avoids replacing the in-progress editor; Story 65 covers concurrency).
 */
function syncCachesAfterPutNoteBody(
  queryClient: QueryClient,
  id: string,
  updated: Content,
  savedBodyText: string
): void {
  queryClient.setQueryData(contentQueryKeys.item(id), updated);
  const ver = noteBodyVersionKey(updated);
  queryClient.removeQueries({ queryKey: ['content', 'note-body-text', id] });
  if (ver != null) {
    queryClient.setQueryData(
      contentQueryKeys.noteBodyText(id, ver),
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
        : (['content', 'item', '__disabled__'] as const),
    queryFn: () => contentService.getContentById(currentUser!, safeId!),
    enabled: Boolean(currentUser) && safeId != null,
    retry: contentItemQueryRetry,
    ...METADATA_REFETCH,
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
