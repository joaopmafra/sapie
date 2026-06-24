import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import React, { useState } from 'react';

import { useCreateFolder, useContentItem, type Content } from '../lib/content';
import { PROBLEM_DETAILS_POINTERS } from '../lib/problemDetailsPointers.ts';

import { ClientErrorAlert } from './ClientErrorAlert';

interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newFolder: Content) => void;
  parentId: string;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  open,
  onClose,
  onSuccess,
  parentId,
}) => {
  const createFolder = useCreateFolder();
  const { data: parentFolder } = useContentItem(parentId || undefined);
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<unknown | null>(null);

  const handleSubmit = async () => {
    if (!parentId) {
      setError(
        'Cannot create folder: parent folder not selected or user not authenticated.'
      );
      return;
    }
    if (!folderName.trim()) {
      setError('Name is required.');
      return;
    }

    setError(null);

    try {
      const newFolder = await createFolder.mutateAsync({
        name: folderName.trim(),
        parentId,
      });
      setFolderName('');
      onSuccess(newFolder);
    } catch (err) {
      setError(err);
    }
  };

  const handleCancel = () => {
    if (createFolder.isPending) return;
    setFolderName('');
    setError(null);
    onClose();
  };

  const parentLabel = parentFolder?.name ?? '…';

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth='sm'>
      <DialogTitle>Create New Folder</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Creating folder in: <strong>{parentLabel}</strong>
        </DialogContentText>
        <TextField
          margin='dense'
          id='folder-name'
          label='Folder Name'
          type='text'
          fullWidth
          variant='outlined'
          value={folderName}
          onChange={e => setFolderName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
          disabled={createFolder.isPending}
        />
        <ClientErrorAlert
          value={error}
          sx={{ mt: 2 }}
          problemDetailJsonPointer={PROBLEM_DETAILS_POINTERS.CONTENT.name}
        />
      </DialogContent>
      <DialogActions sx={{ p: '0 24px 12px' }}>
        <Button onClick={handleCancel} disabled={createFolder.isPending}>
          Cancel
        </Button>
        <Box sx={{ position: 'relative' }}>
          <Button
            onClick={() => void handleSubmit()}
            variant='contained'
            disabled={createFolder.isPending}
          >
            Create
          </Button>
          {createFolder.isPending && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CreateFolderModal;
