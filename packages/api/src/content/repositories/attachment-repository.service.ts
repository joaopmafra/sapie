import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

import { FirebaseAdminService } from '../../firebase';
import { Attachment, AttachmentDocument } from '../entities/attachment.entity';

@Injectable()
export class AttachmentRepository {
  private readonly logger = new Logger(AttachmentRepository.name);
  private readonly contentCollection = 'content';

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  private attachmentsCollection(noteId: string) {
    return this.firestore.collection(this.contentCollection).doc(noteId).collection('attachments');
  }

  async findById(noteId: string, attachmentId: string): Promise<Attachment | null> {
    const doc = await this.attachmentsCollection(noteId).doc(attachmentId).get();
    if (!doc.exists) {
      return null;
    }
    return this.convertDocument(noteId, doc.id, doc.data() as AttachmentDocument);
  }

  async listByNoteId(noteId: string): Promise<Attachment[]> {
    const snapshot = await this.attachmentsCollection(noteId).get();
    return snapshot.docs.map(d =>
      this.convertDocument(noteId, d.id, d.data() as AttachmentDocument)
    );
  }

  async createMetadata(params: {
    id: string;
    noteId: string;
    ownerId: string;
    objectPath: string;
    createdAt: Date;
  }): Promise<Attachment> {
    const data: AttachmentDocument = {
      ownerId: params.ownerId,
      uri: params.objectPath,
      mimeType: 'application/octet-stream',
      size: 0,
      createdAt: admin.firestore.Timestamp.fromDate(params.createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(params.createdAt),
    };

    await this.attachmentsCollection(params.noteId).doc(params.id).set(data);

    return {
      id: params.id,
      noteId: params.noteId,
      ownerId: params.ownerId,
      uri: params.objectPath,
      mimeType: data.mimeType,
      size: data.size,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
    };
  }

  async updateBodyMetadata(
    noteId: string,
    attachmentId: string,
    uri: string,
    size: number,
    mimeType: string,
    updatedAt: Date
  ): Promise<void> {
    const ref = this.attachmentsCollection(noteId).doc(attachmentId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Attachment ${attachmentId} disappeared before body update`);
    }
    const existing = snap.data() as AttachmentDocument;
    await ref.update({
      uri,
      size,
      mimeType,
      updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
      createdAt: existing.createdAt,
    });
  }

  async deleteById(noteId: string, attachmentId: string): Promise<void> {
    await this.attachmentsCollection(noteId).doc(attachmentId).delete();
  }

  private convertDocument(noteId: string, id: string, data: AttachmentDocument): Attachment {
    return {
      id,
      noteId,
      ownerId: data.ownerId,
      uri: data.uri,
      mimeType: data.mimeType,
      size: data.size,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
