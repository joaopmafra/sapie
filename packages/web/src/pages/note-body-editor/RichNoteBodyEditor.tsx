import {
  MDXEditor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertCodeBlock,
  ListsToggle,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Box } from '@mui/material';
import { forwardRef, useMemo } from 'react';

import type { NoteBodyEditorProps } from './note-body-editor-props';

function noteBodyToolbarTranslation(key: string, defaultValue: string): string {
  if (key === 'contentArea.editableMarkdown') {
    return 'Note body';
  }
  return defaultValue;
}

export const RichNoteBodyEditor = forwardRef<
  MDXEditorMethods | null,
  NoteBodyEditorProps
>(function RichNoteBodyEditor(
  {
    value,
    onChange,
    placeholder,
    disabled,
    'aria-label': _ariaLabel,
  },
  ref
) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      codeBlockPlugin(),
      codeMirrorPlugin({
        codeBlockLanguages: {
          txt: 'Plain text',
          js: 'JavaScript',
          ts: 'TypeScript',
          tsx: 'TypeScript (React)',
          jsx: 'JavaScript (React)',
          css: 'CSS',
          md: 'Markdown',
          json: 'JSON',
        },
        autoLoadLanguageSupport: true,
      }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <Separator />
            <ListsToggle />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <CreateLink />
            <Separator />
            <InsertCodeBlock />
          </>
        ),
      }),
    ],
    []
  );

  return (
    <Box
      className='sapie-rich-note-body'
      sx={{
        minHeight: 360,
        '& .mdxeditor': {
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        },
        '& .mdxeditor-toolbar': {
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        },
      }}
    >
      <MDXEditor
        ref={ref}
        markdown={value}
        onChange={(md, initialMarkdownNormalize) =>
          onChange(md, { fromInitialNormalize: initialMarkdownNormalize })
        }
        placeholder={placeholder}
        readOnly={disabled}
        translation={noteBodyToolbarTranslation}
        plugins={plugins}
        contentEditableClassName='sapie-mdx-content'
      />
    </Box>
  );
});
