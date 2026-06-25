jest.mock('../lib/firebase/config', () => ({
  auth: {},
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { User } from 'firebase/auth';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import { ContentType, contentService, type Content } from '../lib/content';

import FolderPage from './FolderPage';

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

const folder: Content = {
  id: 'folder-1',
  name: 'Studies',
  type: ContentType.DIRECTORY,
  parentId: 'root-1',
  ownerId: 'owner-1',
  createdAt: new Date('2024-06-01T10:00:00.000Z'),
  updatedAt: new Date('2024-06-01T10:00:00.000Z'),
};

function renderFolderPage(initialPath = '/folders/folder-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/folders/:folderId',
        element: <FolderPage />,
      },
    ],
    { initialEntries: [initialPath] }
  );

  return render(
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
}

describe('FolderPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedContentService.getContentById.mockResolvedValue(folder);
  });

  it('renders folder name and creation date', async () => {
    renderFolderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Studies' })
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Created:/)).toBeInTheDocument();
  });

  it('shows an error when the folder is not found', async () => {
    const err = new AxiosError('Not found');
    err.response = {
      data: {},
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    };
    mockedContentService.getContentById.mockRejectedValue(err);

    renderFolderPage();

    await waitFor(() => {
      expect(screen.getByText(/Folder not found/)).toBeInTheDocument();
    });
  });
});
