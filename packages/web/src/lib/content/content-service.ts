import { isAxiosError } from 'axios';
import type { User } from 'firebase/auth';

import {
  Configuration,
  ContentApi,
  type ContentBodyUrlResponse,
  type ContentResponse,
  type CreateContentRequest,
} from '../api-client';
import { getApiBaseUrl } from '../apiBaseUrl.ts';
import { getApiAuthRequestOptions } from '../auth-utils';

import type { Content, UpdateContentRequest } from './types';
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
  private readonly contentApi: ContentApi;

  constructor() {
    const basePath = getApiBaseUrl();
    // Per-request auth still comes from `createAuthenticatedApiConfiguration` → `baseOptions.headers`.
    // A real `Configuration` is required so `serializeDataIfNeeded` uses `isJsonMime` for the request
    // `Content-Type` instead of JSON-stringifying every non-string (which breaks `File` on `PUT …/body`).
    this.contentApi = new ContentApi(new Configuration({ basePath }), basePath);
  }

  private mapContentResponseToContent(dto: ContentResponse): Content {
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
      const options = await getApiAuthRequestOptions(currentUser);

      const response =
        await this.contentApi.contentControllerGetRootDirectory(options);

      return this.mapContentResponseToContent(response.data);
    } catch (error) {
      console.error('Failed to get root directory:', error);
      throw error;
    }
  }

  async getContentById(currentUser: User, id: string): Promise<Content> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);

      const response = await this.contentApi.contentControllerGetContentById(
        { id },
        options
      );

      return this.mapContentResponseToContent(response.data);
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
      const options = await getApiAuthRequestOptions(currentUser);

      const response = await this.contentApi.contentControllerListContents(
        { id: parentId },
        options
      );

      return response.data.map(item => this.mapContentResponseToContent(item));
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
      const options = await getApiAuthRequestOptions(currentUser);

      const createContentRequest: CreateContentRequest = {
        name,
        parentId,
      };

      const response = await this.contentApi.contentControllerCreateContent(
        { createContentRequest },
        options
      );

      return this.mapContentResponseToContent(response.data);
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }

  /**
   * `GET /api/content/:id/body` — signed read URL. Returns `null` when the note has no body yet (HTTP 404).
   */
  async getContentBody(
    currentUser: User,
    id: string
  ): Promise<ContentBodyUrlResponse | null> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);

      const response =
        await this.contentApi.contentControllerGetContentBodySignedUrl(
          { id },
          options
        );

      return response.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Failed to get content body signed URL:', error);
      throw error;
    }
  }

  /**
   * Fetches markdown (or other) bytes using a signed Storage URL (no Firebase bearer; auth is in the URL).
   */
  async fetchNoteMarkdown(signedUrl: string): Promise<string> {
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download note body: HTTP ${response.status} ${response.statusText}`
      );
    }
    return response.text();
  }

  /**
   * `PUT /api/content/:id/body` — raw body; `contentType` is stored with the object (e.g. `text/markdown`).
   */
  async putContentBody(
    currentUser: User,
    id: string,
    bodyText: string,
    contentType: string
  ): Promise<Content> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);

      const file = new File([bodyText], 'note-body', { type: contentType });

      const response = await this.contentApi.contentControllerPutContentBody(
        { id, contentType, body: file },
        options
      );

      return this.mapContentResponseToContent(response.data);
    } catch (error) {
      console.error('Failed to put content body:', error);
      throw error;
    }
  }

  async patchContent(
    currentUser: User,
    id: string,
    body: UpdateContentRequest
  ): Promise<Content> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);

      const response = await this.contentApi.contentControllerPatchContent(
        { id, updateContentRequest: body },
        options
      );

      return this.mapContentResponseToContent(response.data);
    } catch (error) {
      console.error('Failed to patch content:', error);
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

export const contentService = new ContentService();
