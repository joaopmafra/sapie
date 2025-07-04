import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CircularProgress, Alert, Box, Typography } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { contentService } from '../lib/content';
import type { Content } from '../lib/content';

// --- DEV MODE: Set to true to use fake data for testing ---
const DEV_MODE = true;

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

// Example fake tree data for development/testing
const FAKE_TREE: TreeNode[] = [
  {
    id: 'root',
    label: 'My Contents',
    children: [
      {
        id: 'folder1',
        label: 'Math',
        children: [
          { id: 'note1', label: 'Algebra Notes' },
          { id: 'note2', label: 'Geometry Notes' },
        ],
      },
      {
        id: 'folder2',
        label: 'Science',
        children: [
          { id: 'note3', label: 'Physics Notes' },
          { id: 'note4', label: 'Chemistry Notes' },
        ],
      },
      { id: 'note5', label: 'General Notes' },
    ],
  },
];

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
          slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
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
      items={[{ id: root.id, label: root.name }]}
      slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
    />
  );
};

export default ContentExplorer;
