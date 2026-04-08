import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MillisecondLogger } from './logger/millisecond.logger';
import { applyHttpAppConfiguration } from './common/http/apply-http-app-configuration';
import { setupSwagger } from './swagger-setup';

// This file is used only for local development. When running on Firebase or on the Emulator Suite,
// the entrypoint is firebase-functions.ts.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new MillisecondLogger(),
  });

  applyHttpAppConfiguration(app);

  // Set up Swagger when not running on production
  if (process.env.NODE_ENV !== 'production') setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(console.error);
