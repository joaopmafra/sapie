import type { User } from 'firebase/auth';

import { createAuthenticatedApiConfiguration } from '../auth-utils';

import type { Content } from './types';

/**
 * Content Service
 *
 * This service handles all content-related API operations including
 * root directory management and content retrieval.
 *
 * All methods require authentication and will automatically include
 * the user's Firebase ID token in API requests.
 */
export class ContentService {
  private readonly basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || '';
  }

  /**
   * Gets or creates the user's root directory.
   *
   * This method calls the backend API to ensure the user has a root directory
   * and returns it. If the directory doesn't exist, it will be created automatically.
   *
   * @param currentUser - The authenticated Firebase user
   * @returns Promise<Content> - The user's root directory
   * @throws Error - If the user is not authenticated or if the API call fails
   */
  async getRootDirectory(currentUser: User): Promise<Content> {
    try {
      // Create authenticated API configuration
      const config = await createAuthenticatedApiConfiguration(
        this.basePath,
        currentUser
      );

      // Make the API request
      const response = await fetch('/api/content/root', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.baseOptions?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get root directory: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();

      // Convert date strings back to Date objects
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      } as Content;
    } catch (error) {
      console.error('Failed to get root directory:', error);
      throw new Error(
        `Failed to get root directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Checks if the user has a root directory.
   *
   * This is a helper method that attempts to get the root directory
   * and returns false if it doesn't exist, true if it does.
   *
   * @param currentUser - The authenticated Firebase user
   * @returns Promise<boolean> - True if root directory exists, false otherwise
   */
  async hasRootDirectory(currentUser: User): Promise<boolean> {
    try {
      await this.getRootDirectory(currentUser);
      return true;
    } catch (error) {
      // If the error is specifically about not finding the directory,
      // we can return false. For other errors, we should re-throw.
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Default Content Service Instance
 *
 * Pre-configured content service instance that can be imported and used directly.
 * Uses the default base path configuration.
 */
export const contentService = new ContentService();
