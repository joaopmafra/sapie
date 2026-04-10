export const contentQueryKeys = {
  root: () => ['content', 'root'] as const,
  allChildren: () => ['content', 'children'] as const,
  children: (parentId: string) => ['content', 'children', parentId] as const,
  item: (id: string) => ['content', 'item', id] as const,
} as const;
