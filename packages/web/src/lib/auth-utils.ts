import type { User } from 'firebase/auth';

import { Configuration } from './api-client';

export const createAuthenticatedApiConfiguration = async (
  basePath?: string,
  currentUser?: User | null
) => {
  if (!currentUser) {
    throw new Error(
      'User must be authenticated to create authenticated API configuration'
    );
  }

  // Get the Firebase ID token
  const idToken = await currentUser.getIdToken();

  return new Configuration({
    basePath: basePath ?? '',
    baseOptions: {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  });
};
