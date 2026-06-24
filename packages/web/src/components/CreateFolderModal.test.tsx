import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import React from 'react';

import type { Content } from '../lib/content';

import CreateFolderModal from './CreateFolderModal';

function axiosConflictError(detail: string): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    data: {
      type: 'https://httpstatuses.com/409',
      title: 'Conflict',
      status: 409,
      detail,
      instance: '/api/content',
    },
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  return err;
}

const mockUseCreateFolder = jest.fn();
const mockUseContentItem = jest.fn();

jest.mock('../lib/content', () => ({
  ContentType: { DIRECTORY: 'directory', NOTE: 'note' },
  useCreateFolder: () => mockUseCreateFolder(),
  useContentItem: () => mockUseContentItem(),
}));

describe('CreateFolderModal', () => {
  const theme = createTheme();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContentItem.mockReturnValue({
      data: { name: 'Parent Folder' },
    });
    mockUseCreateFolder.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
  });

  function renderModal(
    props: Partial<React.ComponentProps<typeof CreateFolderModal>> = {}
  ) {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    render(
      <ThemeProvider theme={theme}>
        <CreateFolderModal
          open
          onClose={onClose}
          onSuccess={onSuccess}
          parentId='parent-1'
          {...props}
        />
      </ThemeProvider>
    );
    return { onClose, onSuccess };
  }

  it('submits the folder name and calls onSuccess with created folder', async () => {
    const user = userEvent.setup();
    const newFolder: Content = {
      id: 'folder-new',
      name: 'Studies',
      type: 'directory' as Content['type'],
      parentId: 'parent-1',
      ownerId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mutateAsync = jest.fn().mockResolvedValue(newFolder);
    mockUseCreateFolder.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    const { onSuccess } = renderModal();

    await user.type(screen.getByLabelText('Folder Name'), 'Studies');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Studies',
      parentId: 'parent-1',
    });
    expect(onSuccess).toHaveBeenCalledWith(newFolder);
  });

  it('shows a validation message when name is empty', async () => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn();
    mockUseCreateFolder.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    renderModal();

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });

  it('shows the API error when the folder name already exists in the parent', async () => {
    const user = userEvent.setup();
    const duplicateMessage =
      'Content with name "Studies" already exists in this location';
    const mutateAsync = jest
      .fn()
      .mockRejectedValue(axiosConflictError(duplicateMessage));
    mockUseCreateFolder.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    const { onSuccess } = renderModal();

    await user.type(screen.getByLabelText('Folder Name'), 'Studies');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Studies',
      parentId: 'parent-1',
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText(duplicateMessage)).toBeInTheDocument();
  });
});
