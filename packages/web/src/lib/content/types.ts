/**
 * Content Type Enumeration
 *
 * Defines the types of content that can be stored in the system.
 * This matches the backend ContentType enum.
 */
export enum ContentType {
  DIRECTORY = 'directory',
  NOTE = 'note',
}

/**
 * Content Entity Interface
 *
 * Firestore metadata for something in the tree (directory or note). Matches the backend `Content`.
 * The **content body** (bytes in Storage) is separate; see `docs/dev/content_naming.md`.
 */
export interface Content {
  /** Unique identifier for the content (metadata) */
  id: string;

  /** Display name of the content */
  name: string;

  /** Type of content (directory or note) */
  type: ContentType;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** ID of the user who owns this content */
  ownerId: string;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;

  /** Media type of the stored note body after last `PUT …/body`; null until first save (see API `bodyMimeType`). */
  bodyMimeType?: string | null;

  /** Timestamp when the content was created */
  createdAt: Date;

  /** Timestamp when the content was last updated */
  updatedAt: Date;
}

/**
 * Tree Node Interface
 *
 * Represents a node in the content explorer tree, extending the base Content entity.
 */
export interface TreeNode extends Content {
  children?: TreeNode[];
}

/**
 * Domain shape for persisted new content (metadata), including `type` and optional body fields.
 *
 * For the HTTP **command** to create a note (`POST /api/content`), import `CreateContentRequest` from `api-client`.
 */
export interface ContentCreationInput {
  /** Display name of the content */
  name: string;

  /** Type of content (directory or note) */
  type: ContentType;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** Optional; see `Content.bodyUri` when the backend exposes it on create payloads. */
  bodyUri?: string | null;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;
}

/**
 * Update Content Request Interface
 *
 * Represents the data that can be updated for existing content (metadata).
 * This interface matches the backend UpdateContentRequest interface.
 */
export interface UpdateContentRequest {
  /** Display name of the content */
  name?: string;

  /** Target parent folder id after a move (not implemented on the API yet). */
  parentId?: string | null;
}
