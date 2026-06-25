jest.mock('../lib/firebase/config', () => ({
  auth: {},
}));

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from 'firebase/auth';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import { ContentProvider } from '../contexts/ContentContext';
import { ContentType, contentService, type Content } from '../lib/content';

import ContentExplorer from './ContentExplorer';

jest.mock('../lib/content/content-service', () => ({
  contentService: {
    getContentById: jest.fn(),
    getRootDirectory: jest.fn(),
    getContentByParentId: jest.fn(),
    createNote: jest.fn(),
    createFolder: jest.fn(),
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

const rootFolder: Content = {
  id: 'root-1',
  name: 'Root',
  type: ContentType.DIRECTORY,
  parentId: null,
  ownerId: 'owner-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const folderA: Content = {
  id: 'folder-a',
  name: 'Folder A',
  type: ContentType.DIRECTORY,
  parentId: 'root-1',
  ownerId: 'owner-1',
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
};

const noteB: Content = {
  id: 'note-b',
  name: 'Note B',
  type: ContentType.NOTE,
  parentId: 'folder-a',
  ownerId: 'owner-1',
  createdAt: new Date('2024-01-03'),
  updatedAt: new Date('2024-01-03'),
};

function renderExplorer(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <ContentExplorer />,
      },
      {
        path: '/notes/:noteId',
        element: <ContentExplorer />,
      },
      {
        path: '/folders/:folderId',
        element: <ContentExplorer />,
      },
    ],
    { initialEntries: [initialPath] }
  );

  const theme = createTheme();

  return {
    queryClient,
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            currentUser: mockUser,
            loading: false,
            logout: jest.fn(),
          }}
        >
          <ThemeProvider theme={theme}>
            <ContentProvider>
              <RouterProvider router={router} />
            </ContentProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe('ContentExplorer URL-driven selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedContentService.getRootDirectory.mockResolvedValue(rootFolder);
    mockedContentService.getContentByParentId.mockImplementation(
      async (_user, parentId) => {
        if (parentId === 'root-1') return [folderA];
        if (parentId === 'folder-a') return [noteB];
        return [];
      }
    );
    mockedContentService.getContentById.mockImplementation(
      async (_user, id) => {
        if (id === 'root-1') return rootFolder;
        if (id === 'folder-a') return folderA;
        if (id === 'note-b') return noteB;
        throw new Error(`Unknown id ${id}`);
      }
    );
  });

  it('highlights the note from /notes/:noteId after the tree loads', async () => {
    renderExplorer('/notes/note-b');

    await waitFor(() => {
      expect(screen.getByText('Note B')).toBeInTheDocument();
    });

    const noteItem = screen.getByText('Note B').closest('[role="treeitem"]');
    expect(noteItem).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights the folder from /folders/:folderId after the tree loads', async () => {
    renderExplorer('/folders/folder-a');

    await waitFor(() => {
      expect(screen.getByText('Folder A')).toBeInTheDocument();
    });

    const folderItem = screen
      .getByText('Folder A')
      .closest('[role="treeitem"]');
    expect(folderItem).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates to /folders/:id when a folder is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderExplorer('/');

    await waitFor(() => {
      expect(screen.getByText('Folder A')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Folder A'));

    expect(router.state.location.pathname).toBe('/folders/folder-a');
  });

  it('navigates to /notes/:id when a note is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderExplorer('/');

    await waitFor(() => {
      expect(screen.getByText('Folder A')).toBeInTheDocument();
    });

    const folderItem = screen
      .getByText('Folder A')
      .closest('[role="treeitem"]');
    const expandIcon = folderItem?.querySelector(
      '[data-testid="ChevronRightIcon"]'
    );
    if (expandIcon) {
      await user.click(expandIcon);
    }

    await waitFor(() => {
      expect(screen.getByText('Note B')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Note B'));

    expect(router.state.location.pathname).toBe('/notes/note-b');
  });

  it('renders folders before notes, each group alphabetically', async () => {
    const folderZ: Content = {
      ...folderA,
      id: 'folder-z',
      name: 'Zeta Folder',
    };
    const folderM: Content = {
      ...folderA,
      id: 'folder-m',
      name: 'Middle Folder',
    };
    const noteA: Content = {
      ...noteB,
      id: 'note-a',
      name: 'Alpha Note',
      parentId: 'root-1',
    };
    const noteZ: Content = {
      ...noteB,
      id: 'note-z',
      name: 'Zulu Note',
      parentId: 'root-1',
    };

    mockedContentService.getContentByParentId.mockImplementation(
      async (_user, parentId) => {
        if (parentId === 'root-1') {
          return [noteZ, folderZ, noteA, folderM, folderA];
        }
        return [];
      }
    );

    renderExplorer('/');

    await waitFor(() => {
      expect(screen.getByText('Alpha Note')).toBeInTheDocument();
    });

    const orderedLabels = [
      'Folder A',
      'Middle Folder',
      'Zeta Folder',
      'Alpha Note',
      'Zulu Note',
    ];

    for (let i = 0; i < orderedLabels.length - 1; i += 1) {
      const current = screen.getByText(orderedLabels[i]);
      const next = screen.getByText(orderedLabels[i + 1]);
      expect(
        current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });
});
