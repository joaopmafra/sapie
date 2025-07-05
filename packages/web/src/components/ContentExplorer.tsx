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
import type { Content } from '../lib/content';

// --- DEV MODE: Set to true to use fake data for testing ---
const DEV_MODE = true;

interface TreeNode {
  id: string;
  name:string;
  type: 'directory' | 'note';
  children?: TreeNode[];
}

// Example fake tree data for development/testing
const FAKE_TREE: TreeNode[] = [
  {
    id: 'root',
    name: 'My Contents',
    type: 'directory',
    children: [
      {
        id: 'folder1',
        name: 'Math',
        type: 'directory',
        children: [
          { id: 'note1', name: 'Algebra Notes', type: 'note' },
          { id: 'note2', name: 'Geometry Notes', type: 'note' },
        ],
      },
      {
        id: 'folder2',
        name: 'Science',
        type: 'directory',
        children: [
          { id: 'note3', name: 'Physics Notes', type: 'note' },
          { id: 'note4', name: 'Chemistry Notes', type: 'note' },
        ],
      },
      { id: 'note5', name: 'General Notes', type: 'note' },
    ],
  },
];

const FAKE_TREE_NODE_MAP = new Map<string, TreeNode>();
const buildMap = (nodes: TreeNode[]) => {
  for (const node of nodes) {
    FAKE_TREE_NODE_MAP.set(node.id, node);
    if (node.children) {
      buildMap(node.children);
    }
  }
};
buildMap(FAKE_TREE);

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: TreeItemProps,
  ref: React.Ref<HTMLLIElement>,
) {
  const { itemId, label, ...other } = props;
  const node = FAKE_TREE_NODE_MAP.get(itemId);

  const icon =
    node?.type === 'directory' ? (
      <FolderIcon sx={{ marginRight: 1 }} />
    ) : (
      <ArticleIcon sx={{ marginRight: 1 }} />
    );

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

/**
 * TreeNavigationSidebar
 *
 * Minimal version: Fetches and displays the user's root directory as a tree root node.
 * Loading and error states are handled. Recursive children loading is not yet implemented.
 *
 * DEV_MODE: Set to true to use fake data for development/testing.
 *
 * TODO: Extend to fetch and display children recursively for full tree navigation.
 */
const ContentExplorer: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [root, setRoot] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEV_MODE) {
      setLoading(false);
      setError(null);
      return;
    }
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
        if (isMounted) {
          setRoot(rootDir);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) {
      fetchRoot();
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, authLoading]);

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

  if (DEV_MODE) {
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
          items={FAKE_TREE}
          getItemLabel={(item) => item.name}
          slots={{
            collapseIcon: ExpandMoreIcon,
            expandIcon: ChevronRightIcon,
            item: CustomTreeItem,
          }}
          defaultExpandedItems={['root']}
          sx={{ flexGrow: 1 }}
        />
      </Box>
    );
  }

  if (!root) {
    return (
      <Box p={2}>
        <Typography color='textSecondary'>No root directory found.</Typography>
      </Box>
    );
  }

  // This part is for the non-dev mode, which is not yet fully implemented
  // For now, it will just show the root.
  return (
    <RichTreeView
      items={[{ id: root.id, name: root.name, type: 'directory' }]}
      getItemLabel={(item) => item.name}
      slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
    />
  );
};

export default ContentExplorer;
