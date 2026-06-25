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

function getCachedRoot(
  queryClient: ReturnType<typeof useQueryClient>
): Content | undefined {
  return queryClient.getQueryData<Content>(contentQueryKeys.root());
}

function mergeExpandedIds(prev: string[], toAdd: Iterable<string>): string[] {
  let changed = false;
  const next = new Set(prev);
  for (const id of toAdd) {
    if (!next.has(id)) {
      next.add(id);
      changed = true;
    }
  }
  return changed ? Array.from(next) : prev;
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

    const cachedRoot = getCachedRoot(queryClient);
    if (cachedRoot && activeId === cachedRoot.id) {
      setExpandedNodeIds(prev => mergeExpandedIds(prev, [cachedRoot.id]));
      return;
    }

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

      const root = getCachedRoot(queryClient);
      if (cancelled) return;

      const idsToExpand = new Set(ancestorIds);
      if (root?.id) {
        idsToExpand.add(root.id);
      }

      setExpandedNodeIds(prev => mergeExpandedIds(prev, idsToExpand));
    }

    void expandAncestors();

    return () => {
      cancelled = true;
    };
  }, [contentId, currentUser, queryClient, setExpandedNodeIds]);
}
