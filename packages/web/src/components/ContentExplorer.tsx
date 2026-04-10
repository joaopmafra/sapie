import ArticleIcon from '@mui/icons-material/Article';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { TreeItem, type TreeItemProps } from '@mui/x-tree-view/TreeItem';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import {
  contentQueryKeys,
  contentService,
  ContentType,
  useRootDirectory,
  type Content,
} from '../lib/content';

interface EnrichedTreeNode extends Omit<Content, 'type'> {
  type: ContentType | 'dummy';
  children?: EnrichedTreeNode[];
}

function dummyPlaceholder(parent: Content): EnrichedTreeNode {
  return {
    id: `dummy_${parent.id}`,
    name: 'Loading...',
    type: 'dummy',
    parentId: parent.id,
    ownerId: parent.ownerId,
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
  };
}

function mapContentToEnriched(
  c: Content,
  expanded: Set<string>,
  childrenByParentId: Map<string, Content[]>,
  loadingParentIds: Set<string>
): EnrichedTreeNode {
  if (c.type !== ContentType.DIRECTORY) {
    return { ...c, children: undefined };
  }

  if (!expanded.has(c.id)) {
    const dummy = dummyPlaceholder(c);
    return { ...c, children: [dummy] };
  }

  if (loadingParentIds.has(c.id) || !childrenByParentId.has(c.id)) {
    return { ...c, children: [dummyPlaceholder(c)] };
  }

  const kids = childrenByParentId.get(c.id) ?? [];
  const childNodes = kids.map(ch =>
    mapContentToEnriched(ch, expanded, childrenByParentId, loadingParentIds)
  );
  return { ...c, children: childNodes };
}

function flattenNodeMap(
  nodes: EnrichedTreeNode[]
): Map<string, EnrichedTreeNode> {
  const map = new Map<string, EnrichedTreeNode>();
  const walk = (n: EnrichedTreeNode) => {
    map.set(n.id, n);
    n.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return map;
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: TreeItemProps & { nodeMap: Map<string, EnrichedTreeNode> },
  ref: React.Ref<HTMLLIElement>
) {
  const { itemId, label, nodeMap, ...other } = props;
  const node = nodeMap.get(itemId);

  const icon =
    node?.type === ContentType.DIRECTORY ? (
      <FolderIcon sx={{ marginRight: 1 }} />
    ) : node?.type === ContentType.NOTE ? (
      <ArticleIcon sx={{ marginRight: 1 }} />
    ) : null;

  return (
    <TreeItem
      {...other}
      itemId={itemId}
      ref={ref}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {icon}
          <Typography
            variant='body2'
            sx={{ fontWeight: 'inherit', flexGrow: 1 }}
          >
            {label}
          </Typography>
        </Box>
      }
    />
  );
});

const ContentExplorer: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const {
    selectedNodeId,
    setSelectedNodeId,
    expandedNodeIds,
    setExpandedNodeIds,
  } = useContent();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const expandSeededRef = useRef(false);

  const rootQuery = useRootDirectory();
  const root = rootQuery.data;

  const idsForChildQueries = useMemo(() => {
    if (!root?.id) return [];
    const unique = new Set<string>([root.id, ...expandedNodeIds]);
    return Array.from(unique);
  }, [root?.id, expandedNodeIds]);

  const childQueries = useQueries({
    queries: idsForChildQueries.map(parentId => ({
      queryKey: contentQueryKeys.children(parentId),
      queryFn: () =>
        contentService.getContentByParentId(currentUser!, parentId),
      enabled:
        Boolean(currentUser) &&
        Boolean(root?.id) &&
        (parentId === root?.id || expandedNodeIds.includes(parentId)),
    })),
  });

  useEffect(() => {
    if (root?.id && !expandSeededRef.current) {
      expandSeededRef.current = true;
      setExpandedNodeIds(prev => (prev.length === 0 ? [root.id] : prev));
    }
  }, [root?.id, setExpandedNodeIds]);

  const { tree, nodeMap } = useMemo(() => {
    if (!root) {
      return {
        tree: [] as EnrichedTreeNode[],
        nodeMap: new Map<string, EnrichedTreeNode>(),
      };
    }

    const expanded = new Set(expandedNodeIds);
    const childrenByParentId = new Map<string, Content[]>();
    const loadingParentIds = new Set<string>();

    idsForChildQueries.forEach((id, i) => {
      const q = childQueries[i];
      if (q?.data) {
        childrenByParentId.set(id, q.data);
      }
      if (q?.isPending && !q.data) {
        loadingParentIds.add(id);
      }
    });

    const rootNode = mapContentToEnriched(
      root,
      expanded,
      childrenByParentId,
      loadingParentIds
    );
    const builtTree = [rootNode];
    return { tree: builtTree, nodeMap: flattenNodeMap(builtTree) };
  }, [root, expandedNodeIds, idsForChildQueries, childQueries]);

  const treeError = useMemo(() => {
    if (rootQuery.error) return rootQuery.error;
    const qe = childQueries.find(q => q.error);
    return qe?.error ?? null;
  }, [rootQuery.error, childQueries]);

  const loading =
    authLoading ||
    rootQuery.isPending ||
    (!!root &&
      childQueries.some(
        (q, i) => idsForChildQueries[i] === root.id && q.isPending && !q.data
      ));

  const handleExpandedItemsChange = async (
    _event: React.SyntheticEvent | null,
    expandedIds: string[]
  ) => {
    const prev = expandedNodeIds;
    const newlyExpanded = expandedIds.filter(id => !prev.includes(id));
    setExpandedNodeIds(expandedIds);

    if (!currentUser) return;

    for (const id of newlyExpanded) {
      await queryClient.prefetchQuery({
        queryKey: contentQueryKeys.children(id),
        queryFn: () => contentService.getContentByParentId(currentUser, id),
      });
    }
  };

  if (authLoading || loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100%'
      >
        <CircularProgress />
      </Box>
    );
  }

  if (treeError) {
    return (
      <Box>
        <Alert severity='error'>
          {treeError instanceof Error ? treeError.message : String(treeError)}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        maxHeight: 'calc(100vh - 64px)',
        overflowY: 'auto',
      }}
    >
      <RichTreeView
        items={tree}
        getItemLabel={item => nodeMap.get(item.id)?.name ?? item.name}
        slots={{
          collapseIcon: ExpandMoreIcon,
          expandIcon: ChevronRightIcon,
          item: props => <CustomTreeItem {...props} nodeMap={nodeMap} />,
        }}
        selectedItems={selectedNodeId}
        onSelectedItemsChange={(_event, ids) => {
          const nodeId = Array.isArray(ids) ? ids[0] : ids;
          setSelectedNodeId(nodeId ?? null);

          if (nodeId) {
            const selectedNode = nodeMap.get(nodeId);
            if (selectedNode && selectedNode.type === ContentType.NOTE) {
              navigate(`/notes/${nodeId}`);
            }
          }
        }}
        expandedItems={expandedNodeIds}
        onExpandedItemsChange={handleExpandedItemsChange}
        sx={{ flexGrow: 1 }}
      />
    </Box>
  );
};

export default ContentExplorer;
