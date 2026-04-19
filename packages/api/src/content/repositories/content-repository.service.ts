import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import { Content, ContentDocument, ContentType } from '../entities/content.entity';

@Injectable()
export class ContentRepository {
  private readonly logger = new Logger(ContentRepository.name);
  private readonly contentCollection = 'content';

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  async findRootDirectory(userId: string): Promise<Content | null> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.contentCollection)
        .where('ownerId', '==', userId)
        .where('parentId', '==', null)
        .where('type', '==', ContentType.DIRECTORY)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data() as ContentDocument;
      return this.convertDocumentToContent(doc.id, data);
    } catch (error) {
      this.logger.error(`Failed to find root directory for user ${userId}:`, error);
      throw error;
    }
  }

  async findFirstByParentIdAndName(parentId: string | null, name: string): Promise<Content | null> {
    const querySnapshot = await this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .where('name', '==', name)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return this.convertDocumentToContent(doc.id, doc.data() as ContentDocument);
  }

  async findById(id: string): Promise<Content | null> {
    const doc = await this.firestore.collection(this.contentCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.convertDocumentToContent(doc.id, doc.data() as ContentDocument);
  }

  async findByParentIdAndOwnerId(parentId: string, ownerId: string): Promise<Content[]> {
    const snapshot = await this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .where('ownerId', '==', ownerId)
      .get();
    return snapshot.docs.map(d => this.convertDocumentToContent(d.id, d.data() as ContentDocument));
  }

  async addNote(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Content> {
    const newContentData = {
      name: params.name,
      type: ContentType.NOTE,
      parentId: params.parentId,
      ownerId: params.ownerId,
      bodyUri: null,
      size: null,
      bodyMimeType: null,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };

    const docRef = await this.firestore.collection(this.contentCollection).add(newContentData);

    return {
      id: docRef.id,
      ...newContentData,
    };
  }

  async updateContentName(id: string, name: string, updatedAt: Date): Promise<void> {
    await this.firestore.collection(this.contentCollection).doc(id).update({
      name,
      updatedAt,
    });
  }

  async updateContentBodyMetadata(
    id: string,
    bodyUri: string,
    size: number,
    updatedAt: Date,
    bodyMimeType: string
  ): Promise<void> {
    await this.firestore.collection(this.contentCollection).doc(id).update({
      bodyUri,
      size,
      bodyMimeType,
      updatedAt,
    });
  }

  private convertDocumentToContent(id: string, data: ContentDocument): Content {
    const bodyUri =
      data.bodyUri !== undefined && data.bodyUri !== null && data.bodyUri !== ''
        ? data.bodyUri
        : null;

    const bodyMimeType =
      data.bodyMimeType !== undefined && data.bodyMimeType !== null && data.bodyMimeType !== ''
        ? data.bodyMimeType
        : null;

    return {
      id,
      name: data.name,
      type: data.type as ContentType,
      parentId: data.parentId,
      ownerId: data.ownerId,
      bodyUri,
      size: data.size,
      bodyMimeType,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
