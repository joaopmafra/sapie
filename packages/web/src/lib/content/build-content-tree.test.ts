import { buildContentTree } from './build-content-tree';
import { ContentType, type Content } from './types';

function makeContent(
  id: string,
  name: string,
  type: ContentType,
  parentId: string | null = 'root-1'
): Content {
  return {
    id,
    name,
    type,
    parentId,
    ownerId: 'owner-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

describe('buildContentTree', () => {
  const root = makeContent('root-1', 'Root', ContentType.DIRECTORY, null);
  const folder = makeContent('folder-a', 'Folder A', ContentType.DIRECTORY);
  const note = makeContent('note-a', 'Note A', ContentType.NOTE);

  it('reuses unchanged node references across rebuilds', () => {
    const childrenByParentId = new Map<string, Content[]>([
      ['root-1', [folder, note]],
    ]);

    const first = buildContentTree(
      root,
      ['root-1'],
      childrenByParentId,
      new Set()
    );
    const second = buildContentTree(
      root,
      ['root-1'],
      childrenByParentId,
      new Set(),
      first.nodeCache
    );

    expect(second.tree[0]).toBe(first.tree[0]);
    expect(second.tree[0].children?.[0]).toBe(first.tree[0].children?.[0]);
    expect(second.tree[0].children?.[1]).toBe(first.tree[0].children?.[1]);
  });
});
