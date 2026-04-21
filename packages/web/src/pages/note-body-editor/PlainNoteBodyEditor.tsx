import { TextField } from '@mui/material';

import type { NoteBodyEditorProps } from './note-body-editor-props';

export function PlainNoteBodyEditor({
  value,
  onChange,
  placeholder,
  disabled,
  'aria-label': ariaLabel,
}: NoteBodyEditorProps) {
  return (
    <TextField
      multiline
      fullWidth
      minRows={16}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      inputProps={{
        'aria-label': ariaLabel,
      }}
    />
  );
}
