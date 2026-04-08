import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ProblemDetailsDto, ProblemDetailsErrorItemDto } from './common/dto/problem-details.dto';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Sapie API')
    .setDescription('API documentation for the Sapie knowledge management application')
    .setVersion('1.0')
    .addTag('sapie')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter Firebase ID token',
        in: 'header',
      },
      'bearer'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ProblemDetailsDto, ProblemDetailsErrorItemDto],
  });
  SwaggerModule.setup('api/docs', app, document);

  console.log('Swagger UI is available at /api/docs');
}
