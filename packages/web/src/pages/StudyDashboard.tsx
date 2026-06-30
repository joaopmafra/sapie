import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useContentRoots } from '../lib/content';

const StudyDashboard = () => {
  const navigate = useNavigate();
  const { data: roots, isLoading, isError, error } = useContentRoots();

  const [checkedRoots, setCheckedRoots] = useState<Set<string>>(new Set());

  // Initialize checked roots when data loads
  useMemo(() => {
    if (roots && checkedRoots.size === 0) {
      setCheckedRoots(new Set(roots.map(r => r.id)));
    }
  }, [roots]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRoot = (rootId: string) => {
    setCheckedRoots(prev => {
      const next = new Set(prev);
      if (next.has(rootId)) {
        next.delete(rootId);
      } else {
        next.add(rootId);
      }
      return next;
    });
  };

  const checkedRootIds = useMemo(
    () => [...checkedRoots],
    [checkedRoots],
  );

  const totalDue = useMemo(() => {
    if (!roots) return 0;
    return roots
      .filter(r => checkedRoots.has(r.id))
      .reduce((sum, r) => sum + r.dueCardCount, 0);
  }, [roots, checkedRoots]);

  const handleStartStudy = () => {
    if (checkedRootIds.length === 0) return;
    navigate(`/study/session?rootIds=${checkedRootIds.join(',')}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : 'Failed to load content roots.';
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error">{message}</Alert>
      </Box>
    );
  }

  if (!roots || roots.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            All caught up! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No content roots found. Tag a folder with &quot;content-root&quot; to create a study domain.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const allDueZero = roots.every(r => r.dueCardCount === 0);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, px: { xs: 2, sm: 0 } }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Study
      </Typography>

      {allDueZero && (
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            All caught up! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No cards are due for review. Check back later or add new cards to your decks.
          </Typography>
        </Paper>
      )}

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          {roots.map(root => (
            <FormControlLabel
              key={root.id}
              control={
                <Checkbox
                  checked={checkedRoots.has(root.id)}
                  onChange={() => toggleRoot(root.id)}
                />
              }
              label={
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <Typography>{root.name}</Typography>
                  <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                    {root.dueCardCount} due
                  </Typography>
                </Box>
              }
              sx={{ ml: 0, mr: 0, width: '100%' }}
            />
          ))}
        </Stack>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Total cards due: {totalDue}
          </Typography>
          <Button
            variant="contained"
            size="large"
            disabled={totalDue === 0}
            onClick={handleStartStudy}
            fullWidth={false}
            sx={{ minWidth: 200, width: { xs: '100%', sm: 'auto' } }}
          >
            Start Study
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default StudyDashboard;
