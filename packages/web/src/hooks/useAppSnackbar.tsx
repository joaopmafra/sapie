import CloseIcon from '@mui/icons-material/Close';
import { Button, IconButton } from '@mui/material';
import { type SnackbarKey, useSnackbar } from 'notistack';
import { useCallback, useMemo } from 'react';

export const useAppSnackbar = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const dismissAction = useCallback(
    (snackbarId: SnackbarKey) => (
      <>
        <Button
          size='small'
          onClick={() => {
            closeSnackbar(snackbarId);
          }}
        >
          Dismiss
        </Button>
        <IconButton
          size='small'
          aria-label='close'
          color='inherit'
          onClick={() => {
            closeSnackbar(snackbarId);
          }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </>
    ),
    [closeSnackbar]
  );

  const undoAction = useCallback(
    (snackbarId: SnackbarKey) => (
      <>
        <Button
          size='small'
          onClick={() => {
            closeSnackbar(snackbarId);
          }}
        >
          Undo
        </Button>
        <IconButton
          size='small'
          aria-label='close'
          color='inherit'
          onClick={() => {
            closeSnackbar(snackbarId);
          }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </>
    ),
    [closeSnackbar]
  );

  return useMemo(
    () => ({
      showSuccess(message: string) {
        enqueueSnackbar(message, {
          variant: 'success',
          action: dismissAction,
        });
      },
      showError(message: string) {
        enqueueSnackbar(message, {
          variant: 'error',
          action: dismissAction,
        });
      },
      showUndo(message: string) {
        enqueueSnackbar(message, {
          variant: 'default',
          action: undoAction,
        });
      },
    }),
    [enqueueSnackbar, dismissAction, undoAction]
  );
};
