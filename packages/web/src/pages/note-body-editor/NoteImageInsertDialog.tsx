import {
  closeImageDialog$,
  imageDialogState$,
  saveImage$,
  useCellValues,
  usePublisher,
} from '@mdxeditor/editor';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { ClientErrorAlert } from '../../components/ClientErrorAlert';

export interface NoteImageInsertDialogProps {
  uploadImageAttachment: (file: File) => Promise<string>;
  onImageInserted: () => void;
  onUploadError: (error: unknown) => void;
}

export function NoteImageInsertDialog({
  uploadImageAttachment,
  onImageInserted,
  onUploadError,
}: NoteImageInsertDialogProps) {
  const [dialogState] = useCellValues(imageDialogState$);
  const saveImage = usePublisher(saveImage$);
  const closeImageDialog = usePublisher(closeImageDialog$);

  const open = dialogState.type !== 'inactive';
  const isEditing = dialogState.type === 'editing';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setAltText('');
    setDragOver(false);
    setSubmitting(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    if (dialogState.type === 'editing') {
      setAltText(dialogState.initialValues.altText ?? '');
    }
  }, [open, dialogState, resetForm]);

  const handleClose = () => {
    if (submitting) return;
    closeImageDialog();
    resetForm();
  };

  const handleSubmit = async () => {
    setError(null);

    if (dialogState.type === 'editing') {
      setSubmitting(true);
      try {
        saveImage({
          src: dialogState.initialValues.src,
          altText: altText.trim() || undefined,
        });
        onImageInserted();
        resetForm();
      } catch (err) {
        setError(err);
        setSubmitting(false);
      }
      return;
    }

    if (!selectedFile) {
      setError('Choose an image file to insert.');
      return;
    }

    setSubmitting(true);
    try {
      const url = await uploadImageAttachment(selectedFile);
      saveImage({
        src: url,
        altText: altText.trim() || undefined,
      });
      onImageInserted();
      resetForm();
    } catch (err) {
      setError(err);
      onUploadError(err);
      setSubmitting(false);
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files.item(0);
    if (file?.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
      <DialogTitle>{isEditing ? 'Edit image' : 'Insert image'}</DialogTitle>
      <DialogContent>
        {error != null ? (
          <Box sx={{ mb: 2 }}>
            <ClientErrorAlert value={error} />
          </Box>
        ) : null}

        {!isEditing ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'grey.400',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2,
            }}
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('image-file-input')?.click()}
          >
            <Typography variant='body2' color='text.secondary'>
              {selectedFile ? selectedFile.name : 'Click or drag an image here'}
            </Typography>
            <input
              id='image-file-input'
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.item(0);
                if (file) setSelectedFile(file);
              }}
            />
          </Box>
        ) : null}

        <TextField
          margin='dense'
          label='Alt text'
          fullWidth
          value={altText}
          onChange={e => setAltText(e.target.value)}
          disabled={submitting}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          variant='contained'
        >
          {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          {isEditing ? 'Save' : 'Insert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
