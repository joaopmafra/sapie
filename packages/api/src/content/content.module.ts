import { MiddlewareConsumer, Module, NestModule, RequestMethod, forwardRef } from '@nestjs/common';
import * as bodyParser from 'body-parser';

import { FakeStorageModule } from '../fake-storage/fake-storage.module';
import { CardModule } from '../cards/card.module';
import { ContentController } from './controllers/content.controller';
import { ContentRepository } from './repositories/content-repository.service';
import { RootDirectoryService } from './services/root-directory.service';
import { ContentService } from './services/content.service';
import { ContentBodyStorageService } from './services/content-body-storage.service';
import { getContentBodyReadServiceProviderPair } from './services/content-body-read.service';

@Module({
  imports: [
    ...(FakeStorageModule.isEnabled() ? [FakeStorageModule] : []),
    forwardRef(() => CardModule),
  ],
  controllers: [ContentController],
  providers: [
    RootDirectoryService,
    ContentRepository,
    ContentService,
    ContentBodyStorageService,
    ...getContentBodyReadServiceProviderPair(),
  ],
  exports: [RootDirectoryService, ContentRepository, ContentService, ContentBodyStorageService],
})
export class ContentModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        bodyParser.raw({
          type: () => true,
          limit: '50mb',
        })
      )
      .forRoutes(
        { path: 'api/content/:id/body', method: RequestMethod.PUT },
        { path: 'api/content/:contentId/blobs', method: RequestMethod.POST }
      );
  }
}
