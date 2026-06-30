import axios, { isAxiosError } from 'axios';
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

export interface BlobUploadResult {
  blobId: string;
  url: string;
}

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
    const base = {
      id: dto.id,
      name: dto.name,
      ownerId: dto.ownerId,
      type: dto.type as ContentType,
      parentId: dto.parentId as string | null,
      tags: (dtoRecord.tags as string[] | null) ?? null,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };

    if (dto.type === ContentType.DIRECTORY) {
      return base;
    }

    const rawBody = dtoRecord.body;
    if (rawBody != null && typeof rawBody === 'object' && rawBody !== null) {
      const b = rawBody as Record<string, unknown>;
      return {
        ...base,
        body: {
          mimeType: String(b.mimeType ?? ''),
          size: Number(b.size),
          createdAt: new Date(String(b.createdAt)),
          updatedAt: new Date(String(b.updatedAt)),
        },
      };
    }

    if (rawBody === null) {
      return { ...base, body: null };
    }

    return { ...base, body: null };
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
    parentId: string,
    type?: 'note' | 'deck'
  ): Promise<Content> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);

      const createContentRequest: CreateContentRequest = {
        name,
        parentId,
      };
      if (type) {
        createContentRequest.type = type;
      }

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

  async createFolder(
    currentUser: User,
    name: string,
    parentId: string
  ): Promise<Content> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);

      const createContentRequest: CreateContentRequest = {
        name,
        parentId,
        type: 'directory',
      };

      const response = await this.contentApi.contentControllerCreateContent(
        { createContentRequest },
        options
      );

      return this.mapContentResponseToContent(response.data);
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  /**
   * POST /api/content/:contentId/blobs — upload a blob (e.g. inline image).
   * Returns { blobId, url } where `url` is the markdown-embeddable path.
   */
  async uploadBlob(
    currentUser: User,
    contentId: string,
    file: File
  ): Promise<BlobUploadResult> {
    const options = await getApiAuthRequestOptions(currentUser);
    const basePath = getApiBaseUrl().replace(/\/$/, '');
    const response = await axios.post<BlobUploadResult>(
      `${basePath}/api/content/${contentId}/blobs`,
      file,
      {
        ...options,
        headers: {
          ...((options.headers as Record<string, string> | undefined) ?? {}),
          'Content-Type': file.type || 'application/octet-stream',
        },
      }
    );
    return response.data;
  }

  /**
   * GET /api/content/:contentId/blobs/:blobId — fetch blob bytes for preview.
   */
  async fetchBlob(
    currentUser: User,
    contentId: string,
    blobId: string
  ): Promise<Blob> {
    const options = await getApiAuthRequestOptions(currentUser);
    const basePath = getApiBaseUrl().replace(/\/$/, '');
    const response = await axios.get<Blob>(
      `${basePath}/api/content/${contentId}/blobs/${blobId}`,
      { ...options, responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * DELETE /api/content/:contentId/blobs/:blobId — remove a blob.
   */
  async deleteBlob(
    currentUser: User,
    contentId: string,
    blobId: string
  ): Promise<void> {
    const options = await getApiAuthRequestOptions(currentUser);
    const basePath = getApiBaseUrl().replace(/\/$/, '');
    await axios.delete(
      `${basePath}/api/content/${contentId}/blobs/${blobId}`,
      options
    );
  }

  /**
   * DELETE /api/content/:id — soft-delete content (note or folder).
   * Pass `cascade=true` to allow deletion of notes with content children.
   */
  async deleteContent(
    currentUser: User,
    id: string,
    cascade?: boolean
  ): Promise<void> {
    const options = await getApiAuthRequestOptions(currentUser);
    const basePath = getApiBaseUrl().replace(/\/$/, '');
    const params: Record<string, string> = {};
    if (cascade) {
      params.cascade = 'true';
    }
    await axios.delete(`${basePath}/api/content/${id}`, {
      ...options,
      params,
    });
  }

  /**
   * `GET /api/content/:id/body/signed-url` — signed read URL. Returns `null` when the note has no body yet (HTTP 404).
   */
  async getContentBody(
    currentUser: User,
    id: string
  ): Promise<ContentBodyUrlResponse | null> {
    try {
      const baseOptions = await getApiAuthRequestOptions(currentUser);
      const headers = {
        ...((baseOptions.headers as Record<string, string> | undefined) ?? {}),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      };
      const options = { ...baseOptions, headers };

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
   * Fetches note body text using a signed Storage URL (no Firebase bearer; auth is in the URL).
   */
  async fetchNoteBodyText(signedUrl: string): Promise<string> {
    const response = await fetch(signedUrl);
    if (!response.ok) {
      const err = new Error(
        `Failed to download note body: HTTP ${response.status} ${response.statusText}`
      );
      Object.assign(err, { status: response.status });
      throw err;
    }
    return response.text();
  }

  /**
   * `GET /api/content/:id/body` — authenticated body bytes (notes or inline images).
   */
  async fetchContentBodyBlob(currentUser: User, id: string): Promise<Blob> {
    const options = await getApiAuthRequestOptions(currentUser);
    const response = await this.contentApi.contentControllerGetContentBody(
      { id },
      { ...options, responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * `PUT /api/content/:id/body` — raw body; `contentType` is stored with the object (e.g. `text/markdown`).
   */
  async putContentBody(
    currentUser: User,
    id: string,
    bodyText: string,
    contentType: string,
    expectedRevision: string
  ): Promise<Content> {
    const file = new File([bodyText], 'note-body', { type: contentType });
    return this.putContentBodyFile(
      currentUser,
      id,
      file,
      contentType,
      expectedRevision
    );
  }

  /** `PUT /api/content/:id/body` — upload a File/Blob (note markdown). */
  async putContentBodyFile(
    currentUser: User,
    id: string,
    body: Blob,
    contentType: string,
    expectedRevision: string
  ): Promise<Content> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);
      const basePath = getApiBaseUrl().replace(/\/$/, '');
      const file =
        body instanceof File
          ? body
          : new File([body], 'content-body', { type: contentType });

      const response = await axios.put<ContentResponse>(
        `${basePath}/api/content/${id}/body`,
        file,
        {
          ...options,
          params: { expectedRevision },
          headers: {
            ...((options.headers as Record<string, string> | undefined) ?? {}),
            'Content-Type': contentType,
          },
        }
      );

      return this.mapContentResponseToContent(response.data);
    } catch (error) {
      console.error('Failed to put content body:', error);
      throw error;
    }

  }

  /**
   * GET /api/content/roots — list content roots with due card counts.
   */
  async getContentRoots(
    currentUser: User
  ): Promise<{ id: string; name: string; dueCardCount: number }[]> {
    try {
      const options = await getApiAuthRequestOptions(currentUser);
      const basePath = getApiBaseUrl().replace(/\/$/, '');
      const response = await axios.get<{
        roots: { id: string; name: string; dueCardCount: number }[];
      }>(`${basePath}/api/content/roots`, options);
      return response.data.roots;
    } catch (error) {
      console.error('Failed to get content roots:', error);
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
