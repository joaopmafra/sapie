import { Module, forwardRef } from '@nestjs/common';
import { CardController } from './controllers/card.controller';
import { CardRepository } from './repositories/card-repository.service';
import { CardService } from './services/card.service';
import { ContentModule } from '../content/content.module';
import { StudyResultRepository } from '../study/repositories/study-result-repository.service';

@Module({
  imports: [forwardRef(() => ContentModule)],
  controllers: [CardController],
  providers: [CardRepository, CardService, StudyResultRepository],
  exports: [CardService, CardRepository],
})
export class CardModule {}
