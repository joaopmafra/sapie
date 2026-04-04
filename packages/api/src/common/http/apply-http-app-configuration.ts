import { INestApplication } from '@nestjs/common';
import { ProblemDetailsExceptionFilter } from '../filters/problem-details.exception-filter';
import { createValidationPipe } from './validation-pipe.factory';

export function applyHttpAppConfiguration(app: INestApplication): void {
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());
  app.useGlobalPipes(createValidationPipe());
}
