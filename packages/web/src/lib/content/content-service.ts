import type { User } from 'firebase/auth';

import {
  ContentApi,
  type ContentDto,
  type CreateContentDto,
} from '../api-client';
import { createAuthenticatedApiConfiguration } from '../auth-utils';

import type { Content } from './types';
import { ContentType } from './types';

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
  private readonly contentApi: ContentApi;

  constructor(basePath?: string) {
    this.basePath = basePath || '';
    // The first argument to ContentApi is a Configuration object, which we can leave undefined
    // because we will pass authentication headers on each request.
    this.contentApi = new ContentApi(undefined, this.basePath);
  }

  private mapContentDtoToContent(dto: ContentDto): Content {
    return {
      id: dto.id,
      name: dto.name,
      ownerId: dto.ownerId,
      type: dto.type as ContentType,
      parentId: dto.parentId as string | null,
      contentUrl: dto.contentUrl as string | undefined,
      size: dto.size as number | undefined,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
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
      const config = await createAuthenticatedApiConfiguration(
        this.basePath,
        currentUser
      );

      const response = await this.contentApi.contentControllerGetRootDirectory(
        config.baseOptions
      );

      return this.mapContentDtoToContent(response.data);
    } catch (error) {
      console.error('Failed to get root directory:', error);
      throw error;
    }
  }

  async getContentByParentId(
    currentUser: User,
    parentId: string
  ): Promise<Content[]> {
    try {
      const config = await createAuthenticatedApiConfiguration(
        this.basePath,
        currentUser
      );

      const response = await this.contentApi.contentControllerGetContent(
        { parentId },
        config.baseOptions
      );

      return response.data.map(item => this.mapContentDtoToContent(item));
    } catch (error) {
      console.error('Failed to get content:', error);
      throw error;
    }
  }

  async createNote(
    currentUser: User,
    name: string,
    parentId: string
  ): Promise<Content> {
    try {
      const config = await createAuthenticatedApiConfiguration(
        this.basePath,
        currentUser
      );

      const createContentDto: CreateContentDto = {
        name,
        parentId,
      };

      const response = await this.contentApi.contentControllerCreateContent(
        { createContentDto },
        config.baseOptions
      );

      return this.mapContentDtoToContent(response.data);
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
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
