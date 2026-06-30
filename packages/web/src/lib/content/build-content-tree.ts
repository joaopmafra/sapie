import { sortTreeChildren } from './sort-tree-children';
import { ContentType, type Content } from './types';

export interface EnrichedTreeNode extends Omit<Content, 'type'> {
  type: ContentType | 'dummy';
  children?: EnrichedTreeNode[];
}

function branchPlaceholder(
  parent: Content,
  cache: Map<string, EnrichedTreeNode>
): EnrichedTreeNode {
  const id = `branch_${parent.id}`;
  const existing = cache.get(id);
  if (existing) return existing;

  const node: EnrichedTreeNode = {
    id,
    name: '',
    type: 'dummy',
    parentId: parent.id,
    ownerId: parent.ownerId,
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
  };
  cache.set(id, node);
  return node;
}

function loadingPlaceholder(
  parent: Content,
  cache: Map<string, EnrichedTreeNode>
): EnrichedTreeNode {
  const id = `loading_${parent.id}`;
  const existing = cache.get(id);
  if (existing) return existing;

  const node: EnrichedTreeNode = {
    id,
    name: 'Loading...',
    type: 'dummy',
    parentId: parent.id,
    ownerId: parent.ownerId,
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
  };
  cache.set(id, node);
  return node;
}

function sameChildList(
  a: EnrichedTreeNode[] | undefined,
  b: EnrichedTreeNode[] | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((node, index) => node === b[index]);
}

function reuseOrCreateNode(
  content: Content,
  children: EnrichedTreeNode[] | undefined,
  cache: Map<string, EnrichedTreeNode>
): EnrichedTreeNode {
  const previous = cache.get(content.id);
  if (
    previous &&
    previous.name === content.name &&
    previous.updatedAt.getTime() === content.updatedAt.getTime() &&
    previous.type === content.type &&
    sameChildList(previous.children, children)
  ) {
    return previous;
  }

  const node: EnrichedTreeNode =
    content.type === ContentType.DIRECTORY
      ? { ...content, children }
      : { ...content, children: undefined };

  cache.set(content.id, node);
  return node;
}

function mapContentToEnriched(
  content: Content,
  expanded: Set<string>,
  childrenByParentId: Map<string, Content[]>,
  loadingParentIds: Set<string>,
  cache: Map<string, EnrichedTreeNode>
): EnrichedTreeNode {
  if (content.type !== ContentType.DIRECTORY) {
    return reuseOrCreateNode(content, undefined, cache);
  }

  const cached = childrenByParentId.get(content.id);
  const isExpanded = expanded.has(content.id);

  if (cached !== undefined) {
    const childNodes = sortTreeChildren(cached)
      .filter(child => child.type !== ContentType.DECK)
      .map(child =>
        mapContentToEnriched(
          child,
          expanded,
          childrenByParentId,
          loadingParentIds,
          cache
        )
      );
    return reuseOrCreateNode(content, childNodes, cache);
  }

  if (isExpanded && loadingParentIds.has(content.id)) {
    return reuseOrCreateNode(
      content,
      [loadingPlaceholder(content, cache)],
      cache
    );
  }

  if (isExpanded) {
    return reuseOrCreateNode(content, [], cache);
  }

  return reuseOrCreateNode(content, [branchPlaceholder(content, cache)], cache);
}

export function buildContentTree(
  root: Content,
  expandedNodeIds: string[],
  childrenByParentId: Map<string, Content[]>,
  loadingParentIds: Set<string>,
  previousCache: Map<string, EnrichedTreeNode> = new Map()
): {
  tree: EnrichedTreeNode[];
  nodeMap: Map<string, EnrichedTreeNode>;
  nodeCache: Map<string, EnrichedTreeNode>;
} {
  const expanded = new Set(expandedNodeIds);
  const nodeCache = new Map<string, EnrichedTreeNode>(previousCache);

  const rootNode = mapContentToEnriched(
    root,
    expanded,
    childrenByParentId,
    loadingParentIds,
    nodeCache
  );

  const nodeMap = new Map<string, EnrichedTreeNode>();
  const walk = (node: EnrichedTreeNode) => {
    nodeMap.set(node.id, node);
    node.children?.forEach(walk);
  };
  walk(rootNode);

  return { tree: [rootNode], nodeMap, nodeCache };
}

export function isTreePlaceholderId(id: string): boolean {
  return (
    id.startsWith('branch_') ||
    id.startsWith('loading_') ||
    id.startsWith('dummy_')
  );
}
