export type NoteBodyMarkdownChangeOptions = {
  /** True when MDXEditor finished its first parse/normalize pass (do not run autosave noise). */
  fromInitialNormalize?: boolean;
};

export type NoteBodyEditorProps = {
  value: string;
  onChange: (value: string, options?: NoteBodyMarkdownChangeOptions) => void;
  placeholder: string;
  disabled: boolean;
  /** Passed through to the plain textarea; MDXEditor uses translation override for the same label. */
  'aria-label': string;
};
