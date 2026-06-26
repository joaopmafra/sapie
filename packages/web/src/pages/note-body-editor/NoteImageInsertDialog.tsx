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

import { useNoteImageUploadActions } from './note-image-upload-context';

export function NoteImageInsertDialog() {
  const [dialogState] = useCellValues(imageDialogState$);
  const saveImage = usePublisher(saveImage$);
  const closeImageDialog = usePublisher(closeImageDialog$);
  const { uploadImageAttachment, onImageInserted, onUploadError } =
    useNoteImageUploadActions();

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
        {!isEditing ? (
          <Box
            onDragOver={event => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            sx={{
              mt: 1,
              mb: 2,
              p: 3,
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 1,
              bgcolor: dragOver ? 'action.hover' : 'background.default',
              textAlign: 'center',
            }}
          >
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Drag an image here, or choose a file from your device.
            </Typography>
            <Button variant='outlined' component='label' disabled={submitting}>
              Choose file
              <input
                type='file'
                accept='image/*'
                hidden
                onChange={event => {
                  setSelectedFile(event.target.files?.item(0) ?? null);
                  event.target.value = '';
                }}
              />
            </Button>
            {selectedFile ? (
              <Typography variant='body2' sx={{ mt: 2 }}>
                Selected: <strong>{selectedFile.name}</strong>
              </Typography>
            ) : null}
          </Box>
        ) : null}
        <TextField
          margin='dense'
          label='Alt text'
          fullWidth
          value={altText}
          onChange={event => setAltText(event.target.value)}
          disabled={submitting}
          helperText='Optional description for accessibility and markdown export.'
          sx={{ mt: isEditing ? 1 : 0 }}
        />
        {error ? (
          <Box sx={{ mt: 2 }}>
            <ClientErrorAlert value={error} />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={() => void handleSubmit()}
          disabled={submitting || (!isEditing && !selectedFile)}
          startIcon={submitting ? <CircularProgress size={16} /> : undefined}
        >
          {isEditing ? 'Save' : 'Insert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
