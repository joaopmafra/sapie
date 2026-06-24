import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { useCreateFolder } from './content-hooks';
import { contentService } from './content-service';
import { contentQueryKeys } from './query-keys';
import { ContentType, type Content } from './types';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'test-user' } }),
}));

jest.mock('./content-service', () => ({
  contentService: {
    createFolder: jest.fn(),
  },
}));

describe('useCreateFolder', () => {
  const mockedCreateFolder = contentService.createFolder as jest.MockedFunction<
    typeof contentService.createFolder
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
    };
  }

  it('invalidates the parent children query after a successful create', async () => {
    const created: Content = {
      id: 'dir-1',
      name: 'New',
      type: ContentType.DIRECTORY,
      parentId: 'parent-1',
      ownerId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedCreateFolder.mockResolvedValue(created);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateFolder(), {
      wrapper: wrapperFor(queryClient),
    });

    await result.current.mutateAsync({
      name: 'New',
      parentId: 'parent-1',
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: contentQueryKeys.children('parent-1'),
      });
    });
  });
});
