import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

const NoteEditorPage = () => {
  const { noteId } = useParams();

  return (
    <Box>
      <Typography variant='h4'>Note Editor</Typography>
      <Typography>Editing note with ID: {noteId}</Typography>
    </Box>
  );
};

export default NoteEditorPage;
