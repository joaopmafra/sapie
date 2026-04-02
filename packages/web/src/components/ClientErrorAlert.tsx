import { Alert, Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

import { getClientErrorAlertModel } from '../lib/utils';

export interface ClientErrorAlertProps {
  /** `string` for local validation messages; otherwise pass the caught value (e.g. Axios error). */
  value: unknown | null;
  defaultMessage?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  sx?: SxProps<Theme>;
}

/**
 * Renders RFC 9457 API errors as `detail:` plus a bullet list of `errors[*].messages[0]`;
 * falls back to a single paragraph for plain messages.
 */
export const ClientErrorAlert: React.FC<ClientErrorAlertProps> = ({
  value,
  defaultMessage = 'An unknown error occurred.',
  severity = 'error',
  sx,
}) => {
  if (value == null) {
    return null;
  }

  const model =
    typeof value === 'string'
      ? { kind: 'plain' as const, text: value }
      : getClientErrorAlertModel(value, defaultMessage);

  if (model.kind === 'plain') {
    return (
      <Alert severity={severity} sx={sx}>
        <Typography variant='body2'>{model.text}</Typography>
      </Alert>
    );
  }

  return (
    <Alert severity={severity} sx={sx}>
      <Typography variant='body2' component='div' sx={{ fontWeight: 600 }}>
        {model.detail}:
      </Typography>
      <Box
        component='ul'
        sx={{
          m: 0,
          mt: 1,
          mb: 0,
          pl: 2.5,
        }}
      >
        {model.items.map((item, i) => (
          <Typography
            key={i}
            variant='body2'
            component='li'
            sx={{ display: 'list-item' }}
          >
            {item}
          </Typography>
        ))}
      </Box>
    </Alert>
  );
};
