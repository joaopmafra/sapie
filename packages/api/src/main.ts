import { NestFactory } from '@nestjs/core';
import { MillisecondLogger } from './logger/millisecond.logger';
import { applyHttpAppConfiguration } from './common/http/apply-http-app-configuration';
import { setupSwagger } from './common/swagger-setup';
import { setupEnvVars } from './common/env-setup';

// This file is used only for local development. When running on Firebase or on the Emulator Suite,
// the entrypoint is firebase-functions.ts.
async function bootstrap() {
  // Set up environment variables
  setupEnvVars();

  // Lazy load AppModule to let dotenv run before Nest modules initialization
  const { AppModule } = await import('./app.module');

  const app = await NestFactory.create(AppModule, {
    logger: new MillisecondLogger(),
  });

  applyHttpAppConfiguration(app);

  // Set up Swagger when not running on production
  if (process.env.NODE_ENV !== 'production') setupSwagger(app);

  await app.listen(3000, '127.0.0.1');
}
bootstrap().catch(console.error);
