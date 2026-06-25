import { ContentType, type Content } from './types';
import { sortTreeChildren } from './sort-tree-children';

function makeContent(
  id: string,
  name: string,
  type: ContentType
): Content {
  return {
    id,
    name,
    type,
    parentId: 'parent-1',
    ownerId: 'owner-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

describe('sortTreeChildren', () => {
  it('sorts folders before notes, each group alphabetically', () => {
    const items = [
      makeContent('n2', 'zebra note', ContentType.NOTE),
      makeContent('f2', 'Beta', ContentType.DIRECTORY),
      makeContent('n1', 'alpha note', ContentType.NOTE),
      makeContent('f1', 'Alpha', ContentType.DIRECTORY),
    ];

    expect(sortTreeChildren(items).map(item => item.id)).toEqual([
      'f1',
      'f2',
      'n1',
      'n2',
    ]);
  });

  it('does not mutate the input array', () => {
    const items = [
      makeContent('n1', 'note', ContentType.NOTE),
      makeContent('f1', 'folder', ContentType.DIRECTORY),
    ];
    const copy = [...items];

    sortTreeChildren(items);

    expect(items).toEqual(copy);
  });
});
