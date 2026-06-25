import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { contentQueryKeys, contentService, type Content } from '../lib/content';

async function fetchContentItem(
  queryClient: ReturnType<typeof useQueryClient>,
  currentUser: NonNullable<ReturnType<typeof useAuth>['currentUser']>,
  id: string
): Promise<Content | undefined> {
  const cached = queryClient.getQueryData<Content>(contentQueryKeys.item(id));
  if (cached) return cached;

  return queryClient.fetchQuery({
    queryKey: contentQueryKeys.item(id),
    queryFn: () => contentService.getContentById(currentUser, id),
  });
}

/**
 * Expands ancestor folders (and root) so the node matching `contentId` is visible in the tree.
 */
export function useExpandContentAncestors(contentId: string | null) {
  const { currentUser } = useAuth();
  const { setExpandedNodeIds } = useContent();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!contentId || !currentUser) return;

    const user = currentUser;
    const activeId = contentId;
    let cancelled = false;

    async function expandAncestors() {
      const ancestorIds: string[] = [];

      const item = await fetchContentItem(queryClient, user, activeId);
      if (!item || cancelled) return;

      let parentId = item.parentId;
      while (parentId) {
        ancestorIds.push(parentId);
        const parent = await fetchContentItem(queryClient, user, parentId);
        if (!parent || cancelled) return;
        parentId = parent.parentId;
      }

      const root = await queryClient.fetchQuery({
        queryKey: contentQueryKeys.root(),
        queryFn: () => contentService.getRootDirectory(user),
      });
      if (cancelled) return;

      const idsToExpand = new Set(ancestorIds);
      if (root?.id) {
        idsToExpand.add(root.id);
      }

      setExpandedNodeIds(prev => {
        const next = new Set([...prev, ...idsToExpand]);
        return Array.from(next);
      });
    }

    void expandAncestors();

    return () => {
      cancelled = true;
    };
  }, [contentId, currentUser, queryClient, setExpandedNodeIds]);
}
