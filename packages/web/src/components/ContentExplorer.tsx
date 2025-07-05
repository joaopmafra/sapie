import ArticleIcon from '@mui/icons-material/Article';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { TreeItem, type TreeItemProps } from '@mui/x-tree-view/TreeItem';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { contentService } from '../lib/content';
import type { Content, ContentType } from '../lib/content';

interface TreeNode {
  id: string;
  name: string;
  type: ContentType | 'dummy';
  children?: TreeNode[];
  parentId: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  contentUrl?: string;
  size?: number;
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: TreeItemProps & { nodeMap: Map<string, TreeNode> },
  ref: React.Ref<HTMLLIElement>
) {
  const { itemId, label, nodeMap, ...other } = props;
  const node = nodeMap.get(itemId);

  const icon =
    node?.type === 'directory' ? (
      <FolderIcon sx={{ marginRight: 1 }} />
    ) : node?.type === 'note' ? (
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
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [nodeMap, setNodeMap] = useState(new Map<string, TreeNode>());
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRoot = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!currentUser) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        const rootDir = await contentService.getRootDirectory(currentUser);
        const children = await contentService.getContentByParentId(
          currentUser,
          rootDir.id
        );
        const childNodes: TreeNode[] = children.map(child => ({
          ...child,
          children:
            child.type === 'directory'
              ? [
                  {
                    id: `dummy_${child.id}`,
                    name: 'Loading...',
                    type: 'dummy',
                    parentId: child.id,
                    ownerId: child.ownerId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]
              : undefined,
        }));

        if (isMounted) {
          const rootNode: TreeNode = { ...rootDir, children: childNodes };
          setTree([rootNode]);
          const newMap = new Map<string, TreeNode>();
          newMap.set(rootNode.id, rootNode);
          childNodes.forEach(child => newMap.set(child.id, child));
          setNodeMap(newMap);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    if (!authLoading) {
      fetchRoot();
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, authLoading]);

  const handleExpandedItemsChange = async (
    _event: React.SyntheticEvent | null,
    expandedIds: string[]
  ) => {
    setExpanded(expandedIds);

    if (!currentUser) return;

    const lastExpandedId = expandedIds.find(id => !expanded.includes(id));
    if (!lastExpandedId) return;

    const node = nodeMap.get(lastExpandedId);

    if (node && node.type === 'directory' && node.children?.[0]?.type === 'dummy') {
      try {
        const children = await contentService.getContentByParentId(
          currentUser,
          node.id
        );
        const childNodes: TreeNode[] = children.map(child => ({
          ...child,
          children:
            child.type === 'directory'
              ? [
                  {
                    id: `dummy_${child.id}`,
                    name: 'Loading...',
                    type: 'dummy',
                    parentId: child.id,
                    ownerId: child.ownerId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]
              : undefined,
        }));

        setTree(prevTree => {
          const newTree = JSON.parse(JSON.stringify(prevTree));
          const updateChildren = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(n => {
              if (n.id === node.id) {
                return { ...n, children: childNodes };
              }
              if (n.children) {
                return { ...n, children: updateChildren(n.children) };
              }
              return n;
            });
          };
          return updateChildren(newTree);
        });

        setNodeMap(prevMap => {
          const newMap = new Map(prevMap);
          childNodes.forEach(child => newMap.set(child.id, child));
          return newMap;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
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

  if (error) {
    return (
      <Box p={2}>
        <Alert severity='error'>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      p={1}
      sx={{
        flexGrow: 1,
        maxHeight: 'calc(100vh - 64px)',
        overflowY: 'auto',
      }}
    >
      <RichTreeView
        items={tree}
        getItemLabel={item => item.name}
        slots={{
          collapseIcon: ExpandMoreIcon,
          expandIcon: ChevronRightIcon,
          item: props => <CustomTreeItem {...props} nodeMap={nodeMap} />,
        }}
        expandedItems={expanded}
        onExpandedItemsChange={handleExpandedItemsChange}
        sx={{ flexGrow: 1 }}
      />
    </Box>
  );
};

export default ContentExplorer;
