/**
 * API types matching the Sapie backend DTOs.
 * These are the wire shapes returned by the API — separate from the CLI's internal types.
 */

export enum ContentType {
  DIRECTORY = 'directory',
  NOTE = 'note',
  DECK = 'deck',
}

/** Public HTTP summary of a stored note body. */
export interface ContentBodySummaryResponse {
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

/** HTTP response: content metadata. */
export interface ContentResponse {
  id: string;
  name: string;
  type: ContentType;
  parentId: string | null;
  ownerId: string;
  folderId?: string | null;
  body?: ContentBodySummaryResponse | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** HTTP command body: create content. */
export interface CreateContentRequest {
  name: string;
  parentId: string;
  type?: ContentType;
}

/** HTTP command body: update content metadata. */
export interface UpdateContentRequest {
  name?: string;
  parentId?: string | null;
  tags?: string[];
}

/** HTTP response: signed read URL for content body. */
export interface ContentBodyUrlResponse {
  url: string;
  expiresAt: string;
}

/** HTTP response: card. */
export interface CardResponse {
  id: string;
  deckId: string;
  ownerId: string;
  front: string;
  back: string;
  dueDate: string;
  interval: number;
  repetitions: number;
  lastResult: 'know' | 'dont_know' | null;
  lastStudied: string | null;
  correctCount: number;
  incorrectCount: number;
  deleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** HTTP command body: create card. */
export interface CreateCardRequest {
  front: string;
  back: string;
}

/** HTTP command body: update card. */
export interface UpdateCardRequest {
  front?: string;
  back?: string;
}

/** Firebase Auth REST API: sign-in response. */
export interface FirebaseSignInResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered: boolean;
}

/** Firebase Auth REST API: token refresh response. */
export interface FirebaseRefreshResponse {
  id_token: string;
  refresh_token: string;
  expires_in: string;
  token_type: string;
  user_id: string;
  project_id: string;
}

/** Problem Details (RFC 7807) error response. */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

/** Sync lock info returned by the lock API. */
export interface LockInfo {
  ownerId: string;
  lockedAt: string;
  expiresAt: string;
  resourceIds: string[];
  operation: string;
  instanceId: string;
  locked: boolean;
}

/** Sync lock status response. */
export interface LockStatusResponse {
  locked: boolean;
  lock: LockInfo | null;
}
