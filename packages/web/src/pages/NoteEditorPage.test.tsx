jest.mock('../lib/firebase/config', () => ({
  auth: {},
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import type { Content } from '../lib/content';
import { ContentType, contentService } from '../lib/content';

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

jest.mock('../lib/runtimeEnv', () => ({
  isViteDev: () => true,
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

  return render(
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
  );
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

  it('dev seed button calls PUT body and invalidates load path', async () => {
    mockedContentService.getContentById.mockResolvedValue({
      ...baseNote,
      size: undefined,
    });
    mockedContentService.getContentBody.mockImplementation(async () => {
      if (mockedContentService.putContentBody.mock.calls.length > 0) {
        return {
          signedUrl: 'https://storage.example/after-seed',
          expiresAt: new Date().toISOString(),
        };
      }
      return null;
    });
    mockedContentService.putContentBody.mockResolvedValue({
      ...baseNote,
      size: 40,
    });
    mockedContentService.fetchNoteMarkdown.mockResolvedValue('# Seeded');

    renderNoteEditor();

    expect(
      await screen.findByRole('button', { name: 'Seed body (dev)' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Seed body (dev)' }));

    await waitFor(() => {
      expect(mockedContentService.putContentBody).toHaveBeenCalled();
    });

    const putArgs = mockedContentService.putContentBody.mock.calls[0];
    expect(putArgs[1]).toBe('note-1');
    expect(putArgs[3]).toBe('text/markdown');
    expect(String(putArgs[2])).toContain('Dev seed');

    await waitFor(() => {
      expect(mockedContentService.fetchNoteMarkdown).toHaveBeenCalledWith(
        'https://storage.example/after-seed'
      );
    });
  });
});
