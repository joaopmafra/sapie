import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ProblemDetailsDto, ProblemDetailsErrorItemDto } from './common/dto/problem-details.dto';
import { MillisecondLogger } from './logger/millisecond.logger';
import { applyHttpAppConfiguration } from './common/http/apply-http-app-configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new MillisecondLogger(),
  });

  applyHttpAppConfiguration(app);

  // Set up Swagger only in development or Firebase emulator
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isFirebaseEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  if (isDevelopment || isFirebaseEmulator) {
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(console.error);
