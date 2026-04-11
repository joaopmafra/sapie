import type { User } from 'firebase/auth';

import {
  ContentApi,
  type ContentDto,
  type CreateContentDto,
  type UpdateContentNameDto,
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
    const dtoRecord = dto as unknown as Record<string, unknown>;
    const bodyMimeType =
      'bodyMimeType' in dtoRecord
        ? ((dtoRecord.bodyMimeType as string | null | undefined) ?? null)
        : null;

    return {
      id: dto.id,
      name: dto.name,
      ownerId: dto.ownerId,
      type: dto.type as ContentType,
      parentId: dto.parentId as string | null,
      bodyUri: dto.bodyUri as string | null | undefined,
      size: dto.size as number | undefined,
      bodyMimeType,
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

  async getContentById(currentUser: User, id: string): Promise<Content> {
    try {
      const config = await createAuthenticatedApiConfiguration(
        this.basePath,
        currentUser
      );

      const response = await this.contentApi.contentControllerGetContentById(
        { id },
        config.baseOptions
      );

      return this.mapContentDtoToContent(response.data);
    } catch (error) {
      console.error('Failed to get content by id:', error);
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

      const response = await this.contentApi.contentControllerListContents(
        { id: parentId },
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

  async renameContent(
    currentUser: User,
    id: string,
    name: string
  ): Promise<Content> {
    try {
      const config = await createAuthenticatedApiConfiguration(
        this.basePath,
        currentUser
      );

      const updateContentNameDto: UpdateContentNameDto = { name };

      const response = await this.contentApi.contentControllerRenameContent(
        { id, updateContentNameDto },
        config.baseOptions
      );

      return this.mapContentDtoToContent(response.data);
    } catch (error) {
      console.error('Failed to rename content:', error);
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
