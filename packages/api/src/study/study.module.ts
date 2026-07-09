import { Module, forwardRef } from '@nestjs/common';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { StudyResultRepository } from './repositories/study-result-repository.service';
import { ContentModule } from '../content/content.module';
import { CardModule } from '../cards/card.module';

@Module({
  imports: [forwardRef(() => ContentModule), forwardRef(() => CardModule)],
  controllers: [StudyController],
  providers: [StudyService, StudyResultRepository],
  exports: [StudyService],
})
export class StudyModule {}
