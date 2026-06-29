import * as admin from 'firebase-admin';

/**
 * Note attachment metadata (Firestore subcollection `content/{noteId}/attachments/{attachmentId}`).
 * Attachments are composition parts of a note — not tree content.
 */
export interface Attachment {
  id: string;
  noteId: string;
  ownerId: string;
  /** Object path in the default bucket (`ownerId/content/{noteId}/attachments/{attachmentId}`). */
  uri: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachmentDocument {
  ownerId: string;
  mimeType: string;
  size: number;
  /** Internal GCS object key; not exposed on HTTP metadata DTO. */
  uri: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}
