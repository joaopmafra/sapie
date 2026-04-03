// TODO: decouple Error Details RFC from this component

import { Alert, Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

import {
  getClientErrorAlertModel,
  type GetClientErrorAlertModelOptions,
} from '../lib/error-messages-utils.ts';

export interface ClientErrorAlertProps {
  /** `string` for local validation messages; otherwise pass the caught value (e.g. Axios error). */
  value: unknown | null;
  defaultMessage?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  sx?: SxProps<Theme>;
  /**
   * When set, only validation messages for this JSON Pointer (e.g. `/name`) are listed.
   * Omit to show every message from every `errors` entry (full-form summary).
   */
  problemDetailJsonPointer?: GetClientErrorAlertModelOptions['problemDetailJsonPointer'];
}

/**
 * Renders RFC 9457 Problem Details API errors (`ProblemDetailsDto`).
 * With {@link ClientErrorAlertProps.problemDetailJsonPointer}, shows one plain line or a bullet list only (no `detail` heading).
 * Without it, shows `detail:` plus bullets for a full-form summary.
 */
export const ClientErrorAlert: React.FC<ClientErrorAlertProps> = ({
  value,
  defaultMessage = 'An unknown error occurred.',
  severity = 'error',
  sx,
  problemDetailJsonPointer,
}) => {
  if (value == null) {
    return null;
  }

  const model =
    typeof value === 'string'
      ? { kind: 'plain' as const, text: value }
      : getClientErrorAlertModel(value, defaultMessage, {
          problemDetailJsonPointer,
        });

  if (model.kind === 'plain') {
    return (
      <Alert severity={severity} sx={sx}>
        <Typography variant='body2'>{model.text}</Typography>
      </Alert>
    );
  }

  const heading = model.detail?.trim();

  return (
    <Alert severity={severity} sx={sx}>
      {heading ? (
        <Typography variant='body2' component='div' sx={{ fontWeight: 600 }}>
          {heading}:
        </Typography>
      ) : null}
      <Box
        component='ul'
        sx={{
          m: 0,
          mt: heading ? 1 : 0,
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
