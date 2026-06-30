import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { ContentType, useContentItem, useUpdateContentTags } from '../lib/content';

const KNOWN_TAGS = ['content-root', 'knowledge-area'];

const FolderPage = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const { data: folder, isLoading, isError, error } = useContentItem(folderId);
  const updateTags = useUpdateContentTags();

  const [tagInputValue, setTagInputValue] = useState('');

  const createError = (errorMessage: string) => (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Alert severity='error' sx={{ mb: 2 }}>
        {errorMessage}
      </Alert>
    </Box>
  );

  const handleAddTag = useCallback(
    (_event: unknown, newValue: string | null) => {
      if (!newValue || !folderId || !folder) return;
      const currentTags = folder.tags ?? [];
      if (currentTags.includes(newValue)) return;
      updateTags.mutate({ id: folderId, tags: [...currentTags, newValue] });
    },
    [folderId, folder, updateTags]
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (!folderId || !folder) return;
      const currentTags = folder.tags ?? [];
      updateTags.mutate({
        id: folderId,
        tags: currentTags.filter(t => t !== tagToRemove),
      });
    },
    [folderId, folder, updateTags]
  );

  if (!folderId) {
    return createError('Folder ID is required');
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return createError(
        'Folder not found. This folder may have been deleted or the link may be invalid.'
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to load this folder.';
    return createError(message);
  }

  if (!folder) {
    return createError('Folder not found.');
  }

  if (folder.type !== ContentType.DIRECTORY) {
    return createError('The specified content is not a folder');
  }

  const currentTags = folder.tags ?? [];
  const availableTags = KNOWN_TAGS.filter(t => !currentTags.includes(t));

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant='h4' component='h1' sx={{ mb: 3 }}>
          {folder.name || 'Untitled Folder'}
        </Typography>

        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Created: {folder.createdAt.toLocaleString()}
        </Typography>

        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          Tags
        </Typography>

        <Stack direction='row' spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
          {currentTags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              onDelete={() => handleRemoveTag(tag)}
              color='primary'
              variant='outlined'
              size='small'
            />
          ))}
          {currentTags.length === 0 && (
            <Typography variant='body2' color='text.secondary'>
              No tags yet
            </Typography>
          )}
        </Stack>

        <Autocomplete
          size='small'
          options={availableTags}
          inputValue={tagInputValue}
          onInputChange={(_event, value) => setTagInputValue(value)}
          onChange={handleAddTag}
          renderInput={(params) => (
            <TextField
              {...params}
              label='Add tag'
              placeholder='Type or select a tag'
            />
          )}
          sx={{ maxWidth: 300 }}
          blurOnSelect
          clearOnBlur
          disabled={availableTags.length === 0 || updateTags.isPending}
        />
      </Paper>
    </Box>
  );
};

export default FolderPage;
