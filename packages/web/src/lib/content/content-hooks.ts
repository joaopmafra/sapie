import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';

import { useAuth } from '../../contexts/AuthContext';

import { contentService } from './content-service';
import { contentQueryKeys } from './query-keys';
import { contentItemQueryRetry } from './query-retry-utils';
import type { Content } from './types';

/** Markdown bytes query: strictly under signed URL TTL (10m); refetch/invalidate when URL rotates. */
const NOTE_MARKDOWN_STALE_MS = 5 * 60 * 1000;

const disabledContentBodySignedUrlQueryKey = [
  'content',
  'body-signed-url',
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

export function useContentBody(id: string | undefined) {
  const { currentUser } = useAuth();
  const safeId = id && !id.startsWith('dummy_') ? id : undefined;
  return useQuery({
    queryKey:
      safeId != null
        ? contentQueryKeys.bodySignedUrl(safeId)
        : disabledContentBodySignedUrlQueryKey,
    queryFn: () => contentService.getContentBody(currentUser!, safeId!),
    enabled: Boolean(currentUser) && safeId != null,
    staleTime: 5 * 60 * 1000,
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

/** Updates item metadata, refreshes signed-URL, and seeds markdown cache with the saved string (avoids stale editor). */
async function syncCachesAfterPutNoteBody(
  queryClient: QueryClient,
  currentUser: User,
  id: string,
  savedBodyText: string,
  updated: Content
): Promise<void> {
  queryClient.setQueryData(contentQueryKeys.item(id), updated);
  await queryClient.invalidateQueries({
    queryKey: contentQueryKeys.bodySignedUrl(id),
  });
  const bodyRef = await queryClient.fetchQuery({
    queryKey: contentQueryKeys.bodySignedUrl(id),
    queryFn: () => contentService.getContentBody(currentUser, id),
    staleTime: 5 * 60 * 1000,
  });
  queryClient.removeQueries({ queryKey: ['content', 'note-markdown', id] });
  if (bodyRef?.signedUrl) {
    queryClient.setQueryData(
      contentQueryKeys.noteMarkdown(id, bodyRef.signedUrl),
      savedBodyText
    );
  }
}

/**
 * Explicit save: `PUT /api/content/:id/body` for the current editor string (`text/markdown`).
 * Phase 1 primary persistence; Phase 3 adds debounced auto-save.
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
    onSuccess: async (content, { id, bodyText }) => {
      if (!currentUser) {
        return;
      }
      await syncCachesAfterPutNoteBody(
        queryClient,
        currentUser,
        id,
        bodyText,
        content
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
