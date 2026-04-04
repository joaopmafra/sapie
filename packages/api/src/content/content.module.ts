import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { RootDirectoryService } from './services/root-directory.service';
import { ContentService } from './services/content.service';
import { ContentRepository } from './repositories/content-repository.service';

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
  providers: [RootDirectoryService, ContentRepository, ContentService],
  exports: [RootDirectoryService, ContentRepository, ContentService],
})
export class ContentModule {}
