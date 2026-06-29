jest.mock('../lib/firebase/config', () => ({
  auth: {},
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { User } from 'firebase/auth';
import { StrictMode } from 'react';
import { Link, createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import type { Content, ContentBodySummary } from '../lib/content';
import { ContentType, contentService, contentQueryKeys } from '../lib/content';

import { NOTE_BODY_AUTOSAVE_DEBOUNCE_MS } from './note-editor-save-status';
import NoteEditorPage from './NoteEditorPage';

jest.mock('../lib/content/content-service', () => ({
  contentService: {
    getContentById: jest.fn(),
    getContentBody: jest.fn(),
    fetchNoteBodyText: jest.fn(),
    putContentBody: jest.fn(),
    createAttachment: jest.fn(),
    putAttachmentBodyFile: jest.fn(),
    fetchAttachmentBodyBlob: jest.fn(),
    deleteAttachment: jest.fn(),
    getRootDirectory: jest.fn(),
    getContentByParentId: jest.fn(),
    createNote: jest.fn(),
    patchContent: jest.fn(),
    hasRootDirectory: jest.fn(),
  },
}));

const mockedContentService = contentService as jest.Mocked<
  typeof contentService
>;

const mockUser = {
  uid: 'owner-1',
  getIdToken: jest.fn().mockResolvedValue('test-token'),
} as unknown as User;

const BASE_BODY_UPDATED = new Date('2024-01-03T00:00:00.000Z');
const BASE_BODY_REVISION = BASE_BODY_UPDATED.toISOString();

function makeNoteBody(
  overrides: Partial<ContentBodySummary> = {}
): ContentBodySummary {
  return {
    mimeType: 'text/markdown',
    size: 12,
    createdAt: new Date('2024-01-01'),
    updatedAt: BASE_BODY_UPDATED,
    ...overrides,
  };
}

function noteWithBody(
  note: Content,
  bodyPatch: Partial<ContentBodySummary>
): Content {
  return {
    ...note,
    body: { ...note.body!, ...bodyPatch },
    updatedAt: bodyPatch.updatedAt ?? note.updatedAt,
  };
}

const baseNote: Content = {
  id: 'note-1',
  name: 'My note',
  type: ContentType.NOTE,
  parentId: 'parent-1',
  ownerId: 'owner-1',
  body: makeNoteBody(),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

/**
 * After `jest.advanceTimersByTime`, the debounced `runSave` starts an async `mutateAsync`.
 * Drain microtasks inside the same `act` as the timer advance so `setSavePhase('saved')`
 * is not scheduled outside `act`.
 */
async function advanceAutosaveDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(NOTE_BODY_AUTOSAVE_DEBOUNCE_MS);
    for (let i = 0; i < 60; i += 1) {
      await Promise.resolve();
    }
  });
}

async function flushOpenMutationMicrotasks() {
  await act(async () => {
    for (let i = 0; i < 60; i += 1) {
      await Promise.resolve();
    }
  });
}

function renderNoteEditor(
  initialPath = '/notes/note-1',
  options?: { strict?: boolean }
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/notes/:noteId',
        element: (
          <>
            <Link to='/home'>Go home</Link>
            <NoteEditorPage />
          </>
        ),
      },
      {
        path: '/home',
        element: <div>Home page</div>,
      },
    ],
    { initialEntries: [initialPath] }
  );

  const tree = (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          currentUser: mockUser,
          loading: false,
          logout: jest.fn(),
        }}
      >
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return {
    queryClient,
    router,
    ...render(options?.strict ? <StrictMode>{tree}</StrictMode> : tree),
  };
}

describe('NoteEditorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads note metadata and body from signed URL', async () => {
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');

    renderNoteEditor();

    expect(
      await screen.findByRole('heading', { name: 'My note' })
    ).toBeInTheDocument();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('# Hello');
    });

    expect(mockedContentService.fetchNoteBodyText).toHaveBeenCalledWith(
      'https://storage.example/blob'
    );
  });

  it('treats missing body (404) as empty editor without page error', async () => {
    mockedContentService.getContentById.mockResolvedValue({
      ...baseNote,
      body: null,
    });
    mockedContentService.getContentBody.mockResolvedValue(null);

    renderNoteEditor();

    expect(
      await screen.findByRole('heading', { name: 'My note' })
    ).toBeInTheDocument();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    expect(body).toHaveValue('');
    expect(mockedContentService.getContentBody).not.toHaveBeenCalled();
    expect(mockedContentService.fetchNoteBodyText).not.toHaveBeenCalled();
  });

  it('does not request a signed URL after the first body save on an empty note', async () => {
    jest.useFakeTimers();
    const emptyNote: Content = {
      ...baseNote,
      body: null,
    };
    const afterFirstSave: Content = {
      ...emptyNote,
      body: makeNoteBody({
        size: 8,
        updatedAt: new Date('2025-06-02'),
      }),
      updatedAt: new Date('2025-06-02'),
    };
    mockedContentService.getContentById.mockResolvedValue(emptyNote);
    mockedContentService.putContentBody.mockResolvedValue(afterFirstSave);

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    expect(body).toHaveValue('');

    fireEvent.change(body, { target: { value: 'first bytes' } });
    await advanceAutosaveDebounce();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalled();
    });
    expect(mockedContentService.getContentBody).not.toHaveBeenCalled();
    const bodyAfterSave = screen.getByRole('textbox', { name: 'Note body' });
    expect(bodyAfterSave).toBeVisible();
    expect(bodyAfterSave).not.toBeDisabled();
  });

  it('auto-saves with debounce after edits', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, {
        size: 20,
        updatedAt: new Date('2025-06-01'),
      })
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Edited' } });

    expect(screen.getByText('Saving…')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(NOTE_BODY_AUTOSAVE_DEBOUNCE_MS - 1);
    });
    expect(mockedContentService.putContentBody).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      for (let i = 0; i < 60; i += 1) {
        await Promise.resolve();
      }
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
        mockUser,
        'note-1',
        '# Edited',
        'text/markdown',
        BASE_BODY_REVISION
      );
    });

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('clears Saved header when the user edits again', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, { size: 9 })
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: 'x' } });

    await advanceAutosaveDebounce();

    expect(await screen.findByText('Saved')).toBeInTheDocument();

    fireEvent.change(body, { target: { value: 'x2' } });

    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('does not start a second PUT until the first finishes; then saves latest draft', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');

    let releaseFirst: (c: Content) => void;
    const firstPut = new Promise<Content>(resolve => {
      releaseFirst = resolve;
    });
    mockedContentService.putContentBody
      .mockImplementationOnce(() => firstPut)
      .mockResolvedValueOnce(
        noteWithBody(baseNote, {
          size: 2,
          updatedAt: new Date('2025-07-01'),
        })
      );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: 'v1' } });
    await advanceAutosaveDebounce();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(1);
    });
    expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
      mockUser,
      'note-1',
      'v1',
      'text/markdown',
      expect.any(String)
    );

    fireEvent.change(body, { target: { value: 'v2' } });
    await act(async () => {
      jest.advanceTimersByTime(NOTE_BODY_AUTOSAVE_DEBOUNCE_MS);
      for (let i = 0; i < 60; i += 1) {
        await Promise.resolve();
      }
    });
    expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseFirst!(
        noteWithBody(baseNote, {
          size: 2,
          updatedAt: new Date('2025-06-30'),
        })
      );
      for (let i = 0; i < 80; i += 1) {
        await Promise.resolve();
      }
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(2);
    });
    expect(mockedContentService.putContentBody).toHaveBeenLastCalledWith(
      mockUser,
      'note-1',
      'v2',
      'text/markdown',
      expect.any(String)
    );
  });

  /**
   * Same serialization goal as the test above, but only the `while` loop’s `continue`
   * path: edits during the first PUT must not wait for another debounce timer to fire.
   * (The other test also advances debounce while the first PUT is pending, which sets
   * `queuedRunSaveRef` in addition to leaving draft !== baseline after the first save.)
   */
  it('issues a follow-up PUT immediately after the first when edits happened only during the in-flight save', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');

    let releaseFirst: (c: Content) => void;
    const firstPut = new Promise<Content>(resolve => {
      releaseFirst = resolve;
    });
    mockedContentService.putContentBody
      .mockImplementationOnce(() => firstPut)
      .mockResolvedValueOnce(
        noteWithBody(baseNote, {
          size: 3,
          updatedAt: new Date('2025-08-01'),
        })
      );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: 'v1' } });
    await advanceAutosaveDebounce();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(body, { target: { value: 'v2' } });
    expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseFirst!(
        noteWithBody(baseNote, {
          size: 2,
          updatedAt: new Date('2025-06-30'),
        })
      );
      for (let i = 0; i < 80; i += 1) {
        await Promise.resolve();
      }
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(2);
    });
    expect(mockedContentService.putContentBody).toHaveBeenLastCalledWith(
      mockUser,
      'note-1',
      'v2',
      'text/markdown',
      expect.any(String)
    );
  });

  it('on unmount, queues flush behind an in-flight PUT then persists the latest draft', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');

    let releaseFirst: (c: Content) => void;
    const firstPut = new Promise<Content>(resolve => {
      releaseFirst = resolve;
    });
    mockedContentService.putContentBody
      .mockImplementationOnce(() => firstPut)
      .mockResolvedValueOnce(
        noteWithBody(baseNote, {
          size: 3,
          updatedAt: new Date('2025-09-01'),
        })
      );

    const { unmount } = renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: 'v1' } });
    await advanceAutosaveDebounce();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(body, { target: { value: 'v2' } });
    unmount();

    await act(async () => {
      releaseFirst!(
        noteWithBody(baseNote, {
          size: 2,
          updatedAt: new Date('2025-06-30'),
        })
      );
      for (let i = 0; i < 120; i += 1) {
        await Promise.resolve();
      }
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(2);
    });
    expect(mockedContentService.putContentBody).toHaveBeenNthCalledWith(
      1,
      mockUser,
      'note-1',
      'v1',
      'text/markdown',
      BASE_BODY_REVISION
    );
    expect(mockedContentService.putContentBody).toHaveBeenNthCalledWith(
      2,
      mockUser,
      'note-1',
      'v2',
      'text/markdown',
      expect.any(String)
    );
  });

  it('after a failed save, Retry in flight plus debounced runSave still serializes to the latest draft', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');

    let releaseRetry: (c: Content) => void;
    const retryPut = new Promise<Content>(resolve => {
      releaseRetry = resolve;
    });

    mockedContentService.putContentBody
      .mockRejectedValueOnce(new Error('Network down'))
      .mockImplementationOnce(() => retryPut)
      .mockResolvedValueOnce(
        noteWithBody(baseNote, {
          size: 6,
          updatedAt: new Date('2025-10-01'),
        })
      );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: 'oops' } });
    await advanceAutosaveDebounce();

    expect(await screen.findByText('Error saving')).toBeInTheDocument();
    expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(async () => {
      for (let i = 0; i < 30; i += 1) {
        await Promise.resolve();
      }
    });
    expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(2);

    fireEvent.change(body, { target: { value: 'oops2' } });
    await act(async () => {
      jest.advanceTimersByTime(NOTE_BODY_AUTOSAVE_DEBOUNCE_MS);
      for (let i = 0; i < 60; i += 1) {
        await Promise.resolve();
      }
    });
    expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(2);

    await act(async () => {
      releaseRetry!(
        noteWithBody(baseNote, {
          size: 4,
          updatedAt: new Date('2025-09-15'),
        })
      );
      for (let i = 0; i < 100; i += 1) {
        await Promise.resolve();
      }
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(3);
    });
    expect(mockedContentService.putContentBody).toHaveBeenNthCalledWith(
      2,
      mockUser,
      'note-1',
      'oops',
      'text/markdown',
      BASE_BODY_REVISION
    );
    expect(mockedContentService.putContentBody).toHaveBeenNthCalledWith(
      3,
      mockUser,
      'note-1',
      'oops2',
      'text/markdown',
      expect.any(String)
    );
  });

  it('warns on beforeunload while debounced edits are unsaved', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Pending reload' } });

    const event = new Event('beforeunload', {
      cancelable: true,
    }) as BeforeUnloadEvent;
    const preventDefault = jest.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('flushes pending edits when beforeunload is dismissed and the user stays', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, { size: 20 })
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Stay and save' } });

    window.dispatchEvent(
      new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
    );

    await act(async () => {
      jest.runAllTimers();
      for (let i = 0; i < 60; i += 1) {
        await Promise.resolve();
      }
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
        mockUser,
        'note-1',
        '# Stay and save',
        'text/markdown',
        BASE_BODY_REVISION
      );
    });
  });

  it('does not warn on beforeunload after a successful save', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, { size: 20 })
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Saved' } });
    await advanceAutosaveDebounce();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalled();
    });

    const event = new Event('beforeunload', {
      cancelable: true,
    }) as BeforeUnloadEvent;
    const preventDefault = jest.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('saves immediately and navigates when leaving with pending debounced edits', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, { size: 20 })
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Pending nav' } });

    fireEvent.click(screen.getByRole('link', { name: 'Go home' }));

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
        mockUser,
        'note-1',
        '# Pending nav',
        'text/markdown',
        BASE_BODY_REVISION
      );
      expect(screen.getByText('Home page')).toBeInTheDocument();
    });
  });

  it('stays on the note with Retry when navigation flush save fails', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockRejectedValueOnce(
      new Error('Network down')
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Pending nav' } });

    fireEvent.click(screen.getByRole('link', { name: 'Go home' }));

    await waitFor(() => {
      expect(screen.getByText('Error saving')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
    expect(screen.getByRole('textbox', { name: 'Note body' })).toHaveValue(
      '# Pending nav'
    );
    expect(screen.queryByText('Home page')).not.toBeInTheDocument();
  });

  it('does not block in-app navigation after a successful save', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, { size: 20 })
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Saved' } });
    await advanceAutosaveDebounce();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('link', { name: 'Go home' }));

    await waitFor(() => {
      expect(screen.getByText('Home page')).toBeInTheDocument();
    });
  });

  it('flushes pending edits on unmount without waiting for debounce', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, { size: 20 })
    );

    const { unmount } = renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Flushed' } });

    unmount();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
        mockUser,
        'note-1',
        '# Flushed',
        'text/markdown',
        BASE_BODY_REVISION
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(NOTE_BODY_AUTOSAVE_DEBOUNCE_MS);
    });
    expect(mockedContentService.putContentBody).toHaveBeenCalledTimes(1);
  });

  it('shows error header and Retry when PUT fails', async () => {
    jest.useFakeTimers();
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockRejectedValueOnce(
      new Error('Network down')
    );

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: 'oops' } });

    await advanceAutosaveDebounce();

    expect(await screen.findByText('Error saving')).toBeInTheDocument();

    mockedContentService.putContentBody.mockResolvedValue(
      noteWithBody(baseNote, { size: 4 })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await flushOpenMutationMicrotasks();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenLastCalledWith(
        mockUser,
        'note-1',
        'oops',
        'text/markdown',
        BASE_BODY_REVISION
      );
    });
  });

  it('updates the content item query cache after a successful save', async () => {
    jest.useFakeTimers();
    const updated: Content = noteWithBody(baseNote, {
      size: 99,
      updatedAt: new Date('2025-12-15'),
    });
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(updated);

    const { queryClient } = renderNoteEditor();
    await screen.findByRole('textbox', { name: 'Note body' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Note body' }), {
      target: { value: '# Changed' },
    });

    await advanceAutosaveDebounce();

    await waitFor(() => {
      const cached = queryClient.getQueryData<Content>(
        contentQueryKeys.item('note-1')
      );
      expect(cached?.body?.size).toBe(99);
      expect(cached?.updatedAt).toEqual(updated.updatedAt);
      expect(cached?.body?.mimeType).toBe('text/markdown');
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalled();
    });
    const url = queryClient.getQueryData<{ signedUrl: string } | null>(
      contentQueryKeys.bodySignedUrl('note-1')
    );
    expect(url?.signedUrl).toBe('https://storage.example/blob');
    expect(mockedContentService.getContentBody.mock.calls.length).toBe(1);
  });

  it('does not show the previous note body after switching away from an unsaved note', async () => {
    const noteA: Content = {
      ...baseNote,
      id: 'note-a',
      name: 'a',
    };
    const noteB: Content = {
      ...baseNote,
      id: 'note-b',
      name: 'b',
      body: null,
    };
    const noteBWithBody = noteWithBody(noteB, {
      size: 3,
      updatedAt: new Date('2025-06-02'),
    });
    let noteBSaved = false;

    mockedContentService.getContentById.mockImplementation((_user, id) => {
      if (id === 'note-a') {
        return Promise.resolve(noteA);
      }
      if (id === 'note-b') {
        return Promise.resolve(noteBSaved ? noteBWithBody : noteB);
      }
      return Promise.reject(new Error(`Unknown note: ${id}`));
    });
    mockedContentService.getContentBody.mockImplementation((_user, id) => {
      if (id === 'note-a') {
        return Promise.resolve({
          signedUrl: 'https://storage.example/note-a',
          expiresAt: new Date().toISOString(),
        });
      }
      return Promise.resolve(null);
    });
    mockedContentService.fetchNoteBodyText.mockImplementation(url => {
      if (url === 'https://storage.example/note-a') {
        return Promise.resolve('aaa');
      }
      return Promise.resolve('');
    });
    mockedContentService.putContentBody.mockImplementation((_user, id, _) => {
      if (id === 'note-b') {
        noteBSaved = true;
        return Promise.resolve(noteBWithBody);
      }
      return Promise.reject(new Error(`Unexpected PUT for note: ${id}`));
    });

    const { router } = renderNoteEditor('/notes/note-a');

    let body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('aaa');
    });

    await act(async () => {
      await router.navigate('/notes/note-b');
    });
    expect(
      await screen.findByRole('heading', { name: 'b' })
    ).toBeInTheDocument();
    body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('');
    });

    fireEvent.change(body, { target: { value: 'bbb' } });
    expect(body).toHaveValue('bbb');

    await act(async () => {
      await router.navigate('/notes/note-a');
    });
    expect(
      await screen.findByRole('heading', { name: 'a' })
    ).toBeInTheDocument();
    body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('aaa');
    });

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
        mockUser,
        'note-b',
        'bbb',
        'text/markdown',
        ''
      );
    });
    expect(mockedContentService.putContentBody).not.toHaveBeenCalledWith(
      mockUser,
      'note-a',
      'bbb',
      'text/markdown',
      expect.any(String)
    );

    await act(async () => {
      await router.navigate('/notes/note-b');
    });
    expect(
      await screen.findByRole('heading', { name: 'b' })
    ).toBeInTheDocument();
    body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).not.toHaveValue('aaa');
    });
  });

  it('reloads saved body after leaving the note and returning', async () => {
    jest.useFakeTimers();
    let persistedBody = '# Hello';
    const savedRevision = new Date('2025-12-20T12:00:00.000Z');

    mockedContentService.getContentById.mockImplementation(() => {
      if (persistedBody === '# Hello') {
        return Promise.resolve(baseNote);
      }
      return Promise.resolve(
        noteWithBody(baseNote, {
          size: persistedBody.length,
          updatedAt: savedRevision,
        })
      );
    });
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockImplementation(() =>
      Promise.resolve(persistedBody)
    );
    mockedContentService.putContentBody.mockImplementation(
      (_user, _id, body) => {
        persistedBody = body;
        return Promise.resolve(
          noteWithBody(baseNote, {
            size: body.length,
            updatedAt: savedRevision,
          })
        );
      }
    );

    const { router } = renderNoteEditor();

    let body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('# Hello');
    });

    fireEvent.change(body, { target: { value: '# Saved after nav' } });
    await advanceAutosaveDebounce();

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
        mockUser,
        'note-1',
        '# Saved after nav',
        'text/markdown',
        BASE_BODY_REVISION
      );
    });

    fireEvent.click(screen.getByRole('link', { name: 'Go home' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/notes/note-1');
    });

    body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('# Saved after nav');
    });
    expect(mockedContentService.fetchNoteBodyText).toHaveBeenCalled();
  });

  it('does not wipe note body on return under React StrictMode', async () => {
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteBodyText.mockResolvedValue(
      'browser test content'
    );
    mockedContentService.putContentBody.mockResolvedValue(baseNote);

    const { router } = renderNoteEditor('/notes/note-1', { strict: true });

    let body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('browser test content');
    });

    await act(async () => {
      await router.navigate('/home');
    });
    expect(await screen.findByText('Home page')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/notes/note-1');
    });

    body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('browser test content');
    });

    const emptyPutCalls = mockedContentService.putContentBody.mock.calls.filter(
      call => call[2] === ''
    );
    expect(emptyPutCalls).toHaveLength(0);
  });
});
