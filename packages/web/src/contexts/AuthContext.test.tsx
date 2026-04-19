jest.mock('../lib/firebase/config', () => ({
  auth: {},
}));

let authStateCallback:
  | ((user: import('firebase/auth').User | null) => void)
  | null = null;

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(
    (
      _auth: unknown,
      callback: (user: import('firebase/auth').User | null) => void
    ) => {
      authStateCallback = callback;
      return jest.fn();
    }
  ),
  signOut: jest.fn().mockResolvedValue(undefined),
}));

import { QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import type { User } from 'firebase/auth';

import { contentQueryKeys } from '../lib/content/query-keys';
import { queryClient } from '../lib/queryClient';

import { AuthProvider } from './AuthContext';

describe('AuthProvider (auth boundaries)', () => {
  beforeEach(() => {
    queryClient.clear();
    authStateCallback = null;
    jest.clearAllMocks();
  });

  function emitAuth(user: User | null) {
    if (!authStateCallback) {
      throw new Error('onAuthStateChanged callback not registered');
    }
    act(() => {
      authStateCallback!(user);
    });
  }

  it('clears TanStack Query cache when the signed-in user uid changes', async () => {
    const itemKey = contentQueryKeys.item('note-1');
    queryClient.setQueryData(itemKey, { title: 'User A note' });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <span>app</span>
        </AuthProvider>
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const userA = { uid: 'user-a' } as User;
    const userB = { uid: 'user-b' } as User;

    emitAuth(userA);
    expect(queryClient.getQueryData(itemKey)).toEqual({ title: 'User A note' });

    emitAuth(userB);
    expect(queryClient.getQueryData(itemKey)).toBeUndefined();
  });

  it('does not clear the query cache when the same uid is reported again', async () => {
    const itemKey = contentQueryKeys.item('note-1');
    queryClient.setQueryData(itemKey, { title: 'Stable' });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <span>app</span>
        </AuthProvider>
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const userA = { uid: 'user-a' } as User;

    emitAuth(userA);
    emitAuth({ ...userA, displayName: 'refreshed' } as User);

    expect(queryClient.getQueryData(itemKey)).toEqual({ title: 'Stable' });
  });

  it('clears cached content on logout (uid -> null) so the next session does not reuse server state', async () => {
    const itemKey = contentQueryKeys.item('note-1');
    queryClient.setQueryData(itemKey, { title: 'Sensitive' });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <span>app</span>
        </AuthProvider>
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    emitAuth({ uid: 'user-a' } as User);
    expect(queryClient.getQueryData(itemKey)).toEqual({ title: 'Sensitive' });

    emitAuth(null);
    expect(queryClient.getQueryData(itemKey)).toBeUndefined();
  });
});
