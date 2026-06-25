import { ContentType, type Content } from './types';

function contentTypeSortOrder(type: ContentType): number {
  return type === ContentType.DIRECTORY ? 0 : 1;
}

/** Folders first (A–Z), then other content (A–Z). Does not mutate the input array. */
export function sortTreeChildren(items: readonly Content[]): Content[] {
  return [...items].sort((a, b) => {
    const typeOrder =
      contentTypeSortOrder(a.type) - contentTypeSortOrder(b.type);
    if (typeOrder !== 0) return typeOrder;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}
