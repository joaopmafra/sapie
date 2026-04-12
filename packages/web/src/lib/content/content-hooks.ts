import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';

import { contentService } from './content-service';
import { contentQueryKeys } from './query-keys';
import { contentItemQueryRetry } from './query-retry-utils';

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
