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
 * Stored body metadata (Firestore + domain). **`uri` is server-only** — never exposed on HTTP.
 */
export interface ContentBody {
  /** Object path in the default bucket (`ownerId/content/contentId`), no `gs://` prefix. */
  uri: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  /** Canonical “body bytes changed” timestamp (rename must not advance this). */
  updatedAt: Date;
}

/**
 * Firestore shape for {@link ContentBody} (nested under document field `body`).
 */
export interface ContentBodyDocument {
  uri: string;
  size: number;
  mimeType: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
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
   * Storage-backed body for notes; **null** until first `PUT …/body` or for directories.
   * The HTTP metadata DTO exposes a public summary under `body` without `uri`.
   */
  body: ContentBody | null;

  /** Timestamp when the content was created */
  createdAt: Date;

  /** Timestamp when content metadata last changed (e.g. rename); not the stored body version signal (`body.updatedAt`). */
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

  /** Nested body storage metadata; `null` until first body save (notes) or absent for directories. */
  body?: ContentBodyDocument | null;

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
}
