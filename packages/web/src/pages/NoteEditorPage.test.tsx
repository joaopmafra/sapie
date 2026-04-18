jest.mock('../lib/firebase/config', () => ({
  auth: {},
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import type { Content } from '../lib/content';
import { ContentType, contentService, contentQueryKeys } from '../lib/content';

import NoteEditorPage from './NoteEditorPage';

jest.mock('../lib/content/content-service', () => ({
  contentService: {
    getContentById: jest.fn(),
    getContentBody: jest.fn(),
    fetchNoteMarkdown: jest.fn(),
    putContentBody: jest.fn(),
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

const baseNote: Content = {
  id: 'note-1',
  name: 'My note',
  type: ContentType.NOTE,
  parentId: 'parent-1',
  ownerId: 'owner-1',
  size: 12,
  bodyMimeType: 'text/markdown',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

function renderNoteEditor(initialPath = '/notes/note-1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            currentUser: mockUser,
            loading: false,
            logout: jest.fn(),
          }}
        >
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path='/notes/:noteId' element={<NoteEditorPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe('NoteEditorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads note metadata and markdown from signed URL', async () => {
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteMarkdown.mockResolvedValue('# Hello');

    renderNoteEditor();

    expect(
      await screen.findByRole('heading', { name: 'My note' })
    ).toBeInTheDocument();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    await waitFor(() => {
      expect(body).toHaveValue('# Hello');
    });

    expect(mockedContentService.fetchNoteMarkdown).toHaveBeenCalledWith(
      'https://storage.example/blob'
    );
  });

  it('treats missing body (404) as empty editor without page error', async () => {
    mockedContentService.getContentById.mockResolvedValue({
      ...baseNote,
      size: undefined,
    });
    mockedContentService.getContentBody.mockResolvedValue(null);

    renderNoteEditor();

    expect(
      await screen.findByRole('heading', { name: 'My note' })
    ).toBeInTheDocument();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    expect(body).toHaveValue('');
    expect(mockedContentService.fetchNoteMarkdown).not.toHaveBeenCalled();
  });

  it('Save issues PUT with editor text and shows success', async () => {
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteMarkdown.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue({
      ...baseNote,
      size: 20,
      updatedAt: new Date('2025-06-01'),
    });

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: '# Edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalledWith(
        mockUser,
        'note-1',
        '# Edited',
        'text/markdown'
      );
    });

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('clears save feedback when the user edits again', async () => {
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteMarkdown.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue({
      ...baseNote,
      size: 9,
    });

    renderNoteEditor();

    const body = await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.change(body, { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved.')).toBeInTheDocument();

    fireEvent.change(body, { target: { value: 'x2' } });

    await waitFor(() => {
      expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
    });
  });

  it('shows an error when PUT fails', async () => {
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockResolvedValue({
      signedUrl: 'https://storage.example/blob',
      expiresAt: new Date().toISOString(),
    });
    mockedContentService.fetchNoteMarkdown.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockRejectedValue(
      new Error('Network down')
    );

    renderNoteEditor();

    await screen.findByRole('textbox', { name: 'Note body' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Network down', { exact: false })
    ).toBeInTheDocument();
  });

  it('updates the content item query cache after a successful save', async () => {
    const updated: Content = {
      ...baseNote,
      size: 99,
      bodyMimeType: 'text/markdown',
      updatedAt: new Date('2025-12-15'),
    };
    mockedContentService.getContentById.mockResolvedValue(baseNote);
    mockedContentService.getContentBody.mockImplementation(async () => {
      if (mockedContentService.putContentBody.mock.calls.length > 0) {
        return {
          signedUrl: 'https://storage.example/after-save',
          expiresAt: new Date().toISOString(),
        };
      }
      return {
        signedUrl: 'https://storage.example/blob',
        expiresAt: new Date().toISOString(),
      };
    });
    mockedContentService.fetchNoteMarkdown.mockResolvedValue('# Hello');
    mockedContentService.putContentBody.mockResolvedValue(updated);

    const { queryClient } = renderNoteEditor();
    await screen.findByRole('textbox', { name: 'Note body' });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const cached = queryClient.getQueryData<Content>(
        contentQueryKeys.item('note-1')
      );
      expect(cached?.size).toBe(99);
      expect(cached?.updatedAt).toEqual(updated.updatedAt);
      expect(cached?.bodyMimeType).toBe('text/markdown');
    });

    await waitFor(() => {
      const url = queryClient.getQueryData<{ signedUrl: string } | null>(
        contentQueryKeys.bodySignedUrl('note-1')
      );
      expect(url?.signedUrl).toBe('https://storage.example/after-save');
    });
  });
});
