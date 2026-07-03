import ArticleIcon from '@mui/icons-material/Article';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import {
  Alert,
  Box,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { RichTreeView, useTreeViewApiRef } from '@mui/x-tree-view';
import { TreeItem, type TreeItemProps } from '@mui/x-tree-view/TreeItem';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { useActiveContentRoute } from '../hooks/useActiveContentRoute';
import { useExpandContentAncestors } from '../hooks/useExpandContentAncestors';
import {
  contentQueryKeys,
  contentService,
  ContentType,
  useDeleteContent,
  useRootDirectory,
  type Content,
} from '../lib/content';
import {
  buildContentTree,
  isTreePlaceholderId,
  type EnrichedTreeNode,
} from '../lib/content/build-content-tree';

import ConfirmDeleteDialog from './ConfirmDeleteDialog';

const TreeNodeMetaContext = React.createContext<Map<string, EnrichedTreeNode>>(
  new Map()
);

const TreeContextMenuContext = React.createContext<
  ((event: React.MouseEvent, node: EnrichedTreeNode) => void) | null
>(null);

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: TreeItemProps,
  ref: React.Ref<HTMLLIElement>
) {
  const { itemId, label, ...other } = props;
  const nodeMap = useContext(TreeNodeMetaContext);
  const onContextMenu = useContext(TreeContextMenuContext);
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
      onContextMenu={(event: React.MouseEvent) => {
        if (onContextMenu && node) {
          onContextMenu(event, node);
        }
      }}
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

const treeViewSlots = {
  collapseIcon: ExpandMoreIcon,
  expandIcon: ChevronRightIcon,
  item: CustomTreeItem,
};

/** Expand/collapse on chevron only; label selects/navigates. Pointer on chevron + label only. */
const contentExplorerTreeSx = {
  flexGrow: 1,
  '& .MuiTreeItem-content, & .MuiRichTreeView-itemContent': {
    cursor: 'default',
  },
  '& .MuiTreeItem-iconContainer, & .MuiRichTreeView-itemIconContainer': {
    cursor: 'pointer',
  },
  '& .MuiTreeItem-label, & .MuiRichTreeView-itemLabel': {
    cursor: 'pointer',
  },
} as const;

function collectChildrenByParentId(
  queryClient: ReturnType<typeof useQueryClient>,
  idsForChildQueries: string[],
  childQueries: Array<{
    data?: Content[];
    isPending?: boolean;
  }>,
  expandedNodeIds: string[]
): {
  childrenByParentId: Map<string, Content[]>;
  loadingParentIds: Set<string>;
} {
  const expanded = new Set(expandedNodeIds);
  const childrenByParentId = new Map<string, Content[]>();
  const loadingParentIds = new Set<string>();

  idsForChildQueries.forEach((id, index) => {
    const query = childQueries[index];
    if (query?.data) {
      childrenByParentId.set(id, query.data);
    }
    if (query?.isPending && !query.data && expanded.has(id)) {
      loadingParentIds.add(id);
    }
  });

  queryClient
    .getQueriesData<Content[]>({ queryKey: contentQueryKeys.allChildren() })
    .forEach(([queryKey, data]) => {
      if (!Array.isArray(data)) return;
      const parentId = queryKey[2];
      if (typeof parentId === 'string') {
        childrenByParentId.set(parentId, data);
      }
    });

  return { childrenByParentId, loadingParentIds };
}

function buildChildQueriesRevision(
  idsForChildQueries: string[],
  childQueries: Array<{
    dataUpdatedAt?: number;
    status?: string;
    fetchStatus?: string;
  }>
): string {
  return idsForChildQueries
    .map((id, index) => {
      const query = childQueries[index];
      return [
        id,
        query?.dataUpdatedAt ?? 0,
        query?.status ?? 'idle',
        query?.fetchStatus ?? 'idle',
      ].join(':');
    })
    .join('|');
}

const ContentExplorer: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { expandedNodeIds, setExpandedNodeIds } = useContent();
  const { activeNodeId } = useActiveContentRoute();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiRef = useTreeViewApiRef();
  const expandSeededRef = useRef(false);
  const nodeCacheRef = useRef(new Map<string, EnrichedTreeNode>());
  const nodeMapRef = useRef(new Map<string, EnrichedTreeNode>());

  useExpandContentAncestors(activeNodeId);

  const deleteContent = useDeleteContent();
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    node: EnrichedTreeNode;
  } | null>(null);
  const [deleteDialogTarget, setDeleteDialogTarget] =
    useState<EnrichedTreeNode | null>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, node: EnrichedTreeNode) => {
      // Only show context menu for non-root items (root has parentId === null)
      if (node.parentId === null) return;
      event.preventDefault();
      setContextMenu({
        mouseX: event.clientX,
        mouseY: event.clientY,
        node,
      });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (!contextMenu) return;
    setDeleteDialogTarget(contextMenu.node);
    setContextMenu(null);
  }, [contextMenu]);

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

  const childQueriesRevision = useMemo(
    () => buildChildQueriesRevision(idsForChildQueries, childQueries),
    [idsForChildQueries, childQueries]
  );

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

    const { childrenByParentId, loadingParentIds } = collectChildrenByParentId(
      queryClient,
      idsForChildQueries,
      childQueries,
      expandedNodeIds
    );

    const built = buildContentTree(
      root,
      expandedNodeIds,
      childrenByParentId,
      loadingParentIds,
      nodeCacheRef.current
    );
    nodeCacheRef.current = built.nodeCache;
    nodeMapRef.current = built.nodeMap;

    return { tree: built.tree, nodeMap: built.nodeMap };
  }, [
    root,
    expandedNodeIds,
    idsForChildQueries,
    childQueriesRevision,
    queryClient,
    childQueries,
  ]);

  useEffect(() => {
    if (!activeNodeId) return;

    const frameId = requestAnimationFrame(() => {
      apiRef.current?.focusItem(
        null as unknown as React.SyntheticEvent,
        activeNodeId
      );
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeNodeId, apiRef]);

  const treeError = useMemo(() => {
    if (rootQuery.error) return rootQuery.error;
    const queryError = childQueries.find(query => query.error);
    return queryError?.error ?? null;
  }, [rootQuery.error, childQueries]);

  const hasCachedRootChildren = Boolean(
    root?.id &&
      queryClient.getQueryData<Content[]>(contentQueryKeys.children(root.id))
  );

  const initialLoading =
    authLoading ||
    (rootQuery.isPending && !rootQuery.data) ||
    (Boolean(root?.id) &&
      !hasCachedRootChildren &&
      childQueries.some(
        (query, index) =>
          idsForChildQueries[index] === root?.id &&
          query.isPending &&
          !query.data
      ));

  const handleExpandedItemsChange = useCallback(
    async (_event: React.SyntheticEvent | null, expandedIds: string[]) => {
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
    },
    [currentUser, expandedNodeIds, queryClient, setExpandedNodeIds]
  );

  const handleSelectedItemsChange = useCallback(
    (_event: React.SyntheticEvent | null, ids: string | string[] | null) => {
      const rawId = Array.isArray(ids) ? ids[0] : ids;
      const nodeId = rawId != null ? String(rawId) : null;
      if (!nodeId || isTreePlaceholderId(nodeId)) {
        return;
      }

      const selectedNode = nodeMapRef.current.get(nodeId);
      if (!selectedNode) return;

      if (selectedNode.type === ContentType.NOTE) {
        navigate(`/notes/${nodeId}`);
      } else if (selectedNode.type === ContentType.DIRECTORY) {
        navigate(`/folders/${nodeId}`);
      }
    },
    [navigate]
  );

  const getItemLabel = useCallback((item: EnrichedTreeNode) => item.name, []);

  if (initialLoading) {
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

  const deleteDialogMessage = deleteDialogTarget
    ? deleteDialogTarget.type === ContentType.DIRECTORY
      ? `Are you sure you want to delete the folder "${deleteDialogTarget.name}" and all its contents? This action cannot be undone.`
      : `Are you sure you want to delete "${deleteDialogTarget.name}"? This action cannot be undone.`
    : '';

  return (
    <Box
      sx={{
        flexGrow: 1,
        maxHeight: 'calc(100vh - 64px)',
        overflowY: 'auto',
      }}
    >
      <TreeNodeMetaContext.Provider value={nodeMap}>
        <TreeContextMenuContext.Provider value={handleContextMenu}>
          <RichTreeView
            apiRef={apiRef}
            items={tree}
            getItemLabel={getItemLabel}
            slots={treeViewSlots}
            expansionTrigger='iconContainer'
            selectedItems={activeNodeId}
            onSelectedItemsChange={handleSelectedItemsChange}
            expandedItems={expandedNodeIds}
            onExpandedItemsChange={handleExpandedItemsChange}
            sx={contentExplorerTreeSx}
          />
        </TreeContextMenuContext.Provider>
      </TreeNodeMetaContext.Provider>

      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference='anchorPosition'
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            if (!contextMenu) return;
            const node = contextMenu.node;
            setContextMenu(null);
            if (node.type === ContentType.DIRECTORY) {
              navigate(`/folders/${node.id}/study`);
            }
          }}
        >
          <ListItemIcon>
            <ArticleIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>
            {contextMenu?.node.type === ContentType.DIRECTORY
              ? 'Study all'
              : 'Study'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize='small' color='error' />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <ConfirmDeleteDialog
        open={deleteDialogTarget !== null}
        message={deleteDialogMessage}
        onCancel={() => setDeleteDialogTarget(null)}
        onConfirm={() => {
          if (!deleteDialogTarget) return;
          deleteContent.mutate(
            {
              id: deleteDialogTarget.id,
              parentId: deleteDialogTarget.parentId,
              cascade: true,
            },
            {
              onSuccess: () => {
                setDeleteDialogTarget(null);
              },
            }
          );
        }}
        loading={deleteContent.isPending}
      />
    </Box>
  );
};

export default ContentExplorer;
