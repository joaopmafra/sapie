import { Injectable, Logger, ConflictException, ForbiddenException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import { Content, ContentDocument, ContentType } from '../entities/content.entity';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly contentCollection = 'content';

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  findByParentId(parentId: string): Promise<Content[]> {
    return this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .get()
      .then(snapshot =>
        snapshot.docs.map(doc =>
          this.convertDocumentToContent(doc.id, doc.data() as ContentDocument)
        )
      );
  }

  async create(name: string, parentId: string, ownerId: string): Promise<Content> {
    const parent = await this.findById(parentId);

    if (!parent) {
      throw new Error(`Parent with ID ${parentId} not found`);
    }

    if (parent.ownerId !== ownerId) {
      throw new ForbiddenException('User is not the owner of the parent folder');
    }

    const existingContent = await this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .where('name', '==', name)
      .limit(1)
      .get();

    if (!existingContent.empty) {
      throw new ConflictException(`Content with name "${name}" already exists in this location`);
    }

    const now = new Date();
    const newContentData = {
      name: name,
      type: ContentType.NOTE,
      parentId,
      ownerId,
      contentUrl: null,
      size: null,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firestore.collection(this.contentCollection).add(newContentData);

    return {
      id: docRef.id,
      ...newContentData,
    };
  }

  private async findById(id: string): Promise<Content | null> {
    const doc = await this.firestore.collection(this.contentCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.convertDocumentToContent(doc.id, doc.data() as ContentDocument);
  }

  private convertDocumentToContent(id: string, data: ContentDocument): Content {
    return {
      id,
      name: data.name,
      type: data.type as ContentType,
      parentId: data.parentId,
      ownerId: data.ownerId,
      contentUrl: data.contentUrl,
      size: data.size,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
