import type { MDXEditorMethods } from '@mdxeditor/editor';
import { render, waitFor } from '@testing-library/react';
import { createRef } from 'react';

import { RichNoteBodyEditor } from './RichNoteBodyEditor';

/** Shared golden sample: headings, bold, list, fenced code — used to detect silent drift vs plain textarea. */
export const NOTE_BODY_MARKDOWN_FIXTURE = `# Fixture

Hello **world**

- one
- two

\`\`\`
const x = 1
\`\`\`
`;

describe('RichNoteBodyEditor', () => {
  beforeAll(() => {
    const orig = console.error.bind(console);
    jest.spyOn(console, 'error').mockImplementation((msg, ...rest) => {
      const s =
        typeof msg === 'string' ? msg : msg instanceof Error ? msg.message : '';
      if (s.includes('getClientRects is not a function')) {
        return;
      }
      orig(msg, ...rest);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('mounts and round-trips markdown from the ref after load', async () => {
    const ref = createRef<MDXEditorMethods>();
    const onChange = jest.fn();

    render(
      <RichNoteBodyEditor
        ref={ref}
        value={NOTE_BODY_MARKDOWN_FIXTURE}
        onChange={onChange}
        placeholder='Write…'
        disabled={false}
        aria-label='Note body'
      />
    );

    await waitFor(
      () => {
        expect(ref.current?.getMarkdown).toBeDefined();
        const md = ref.current?.getMarkdown() ?? '';
        expect(md.length).toBeGreaterThan(10);
      },
      { timeout: 15_000 }
    );

    const exported = ref.current?.getMarkdown() ?? '';
    expect(exported).toContain('Fixture');
    expect(exported).toContain('world');
    expect(exported).toContain('one');
    expect(exported).toMatch(/```/);
  });
});
