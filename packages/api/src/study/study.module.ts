import { Module } from '@nestjs/common';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { ContentModule } from '../content/content.module';
import { CardModule } from '../cards/card.module';

@Module({
  imports: [ContentModule, CardModule],
  controllers: [StudyController],
  providers: [StudyService],
})
export class StudyModule {}
