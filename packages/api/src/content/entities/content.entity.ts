import * as admin from 'firebase-admin';

/**
 * Content Type Enumeration
 *
 * Defines the types of content that can be stored in the system.
 */
export enum ContentType {
  DIRECTORY = 'directory',
  NOTE = 'note',
}

/**
 * Content Entity Interface
 *
 * Content metadata for something in the tree (directory or note). See `docs/dev/content_naming.md`
 * for **content** vs **content body**.
 */
export interface Content {
  /** Unique identifier for the content (metadata record) */
  id: string;

  /** Display name of the content */
  name: string;

  /** Type of content (directory or note) */
  type: ContentType;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** ID of the user who owns this content */
  ownerId: string;

  /**
   * Object path for the content body in the configured default bucket (`ownerId/content/contentId`),
   * provider-agnostic (no `gs://` prefix). Null until the first body save.
   */
  bodyUri?: string | null;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number | null;

  /**
   * IANA media type of the stored body object (from the last successful `PUT …/body` `Content-Type`),
   * e.g. `text/plain`, `image/png`. Null until the first body save.
   */
  bodyMimeType?: string | null;

  /** Timestamp when the content was created */
  createdAt: Date;

  /** Timestamp when the content was last updated */
  updatedAt: Date;
}

/**
 * Content Document Interface
 *
 * Represents how content is stored in Firestore.
 * This interface handles the serialization differences between JavaScript Date objects
 * and Firestore Timestamp objects.
 */
export interface ContentDocument {
  /** Display name of the content */
  name: string;

  /** Type of content (directory or note) */
  type: string;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** ID of the user who owns this content */
  ownerId: string;

  /** Object path for content body (see {@link Content.bodyUri}). */
  bodyUri?: string;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;

  /** Media type of the stored body (see {@link Content.bodyMimeType}). */
  bodyMimeType?: string | null;

  /** Firestore timestamp when the content was created */
  createdAt: admin.firestore.Timestamp;

  /** Firestore timestamp when the content was last updated */
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Fields used when persisting new content (metadata), e.g. from the repository layer.
 *
 * For the HTTP **command** shape (`POST /api/content`), use {@link CreateContentRequest} in `content.dto.ts`.
 */
export interface ContentCreationInput {
  /** Display name of the content */
  name: string;

  /** Type of content (directory or note) */
  type: ContentType;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** Object path for content body (see {@link Content.bodyUri}). */
  bodyUri?: string;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;
}
