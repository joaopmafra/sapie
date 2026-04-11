import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import * as bodyParser from 'body-parser';

import { ContentController } from './controllers/content.controller';
import { ContentRepository } from './repositories/content-repository.service';
import { RootDirectoryService } from './services/root-directory.service';
import { ContentService } from './services/content.service';
import { NoteBodyStorageService } from './services/note-body-storage.service';

/**
 * Content Module
 *
 * This module provides content management functionality including:
 * - Root directory management for users
 * - Content storage and retrieval operations
 * - Content type definitions and entities
 *
 * The module serves as the foundation for the content management system,
 * providing users with their personal workspace and content organization capabilities.
 */
@Module({
  imports: [],
  controllers: [ContentController],
  providers: [RootDirectoryService, ContentRepository, ContentService, NoteBodyStorageService],
  exports: [RootDirectoryService, ContentRepository, ContentService, NoteBodyStorageService],
})
export class ContentModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(bodyParser.text({ type: 'text/plain', limit: '10mb' })).forRoutes({
      path: 'api/content/:id/body',
      method: RequestMethod.PUT,
    });
  }
}
