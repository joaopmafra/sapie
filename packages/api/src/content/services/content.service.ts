import { Injectable } from '@nestjs/common';
import { Content, ContentType } from '../entities/content.entity';

@Injectable()
export class ContentService {
  private readonly FAKE_TREE_DATA: Record<string, Content[]> = {
    root: [
      {
        id: 'folder1',
        name: 'Math',
        type: ContentType.DIRECTORY,
        parentId: 'root',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'folder2',
        name: 'Science',
        type: ContentType.DIRECTORY,
        parentId: 'root',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'folder3',
        name: 'Science',
        type: ContentType.DIRECTORY,
        parentId: 'folder1',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'note5',
        name: 'General Notes',
        type: ContentType.NOTE,
        parentId: 'root',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    folder1: [
      {
        id: 'note1',
        name: 'Algebra Notes',
        type: ContentType.NOTE,
        parentId: 'folder1',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'note2',
        name: 'Geometry Notes',
        type: ContentType.NOTE,
        parentId: 'folder1',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    folder2: [
      {
        id: 'note3',
        name: 'Physics Notes',
        type: ContentType.NOTE,
        parentId: 'folder2',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'note4',
        name: 'Chemistry Notes',
        type: ContentType.NOTE,
        parentId: 'folder2',
        ownerId: 'dummy-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    folder3: [],
  };
  findByParentId(parentId: string): Promise<Content[]> {
    return Promise.resolve(this.FAKE_TREE_DATA[parentId] || []);
  }
}
