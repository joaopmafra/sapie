import { NestFactory } from '@nestjs/core';
import { onRequest } from 'firebase-functions/v2/https';
import { HttpServer } from '@nestjs/common/interfaces/http/http-server.interface';
import { MillisecondLogger } from './logger/millisecond.logger';
import { applyHttpAppConfiguration } from './common/http/apply-http-app-configuration';
import { setupSwagger } from './common/swagger-setup';
import { setupEnvVars } from './common/env-setup';

// This file is used only when running on Firebase or on the Emulator Suite. For local development,
// the entrypoint is main.ts.

let cachedServer: HttpServer;

async function createNestServer() {
  if (!cachedServer) {
    // Set up environment variables
    setupEnvVars();

    // Lazy load AppModule to let dotenv run before nest modules initialization
    const { AppModule } = await import('./app.module');

    const app = await NestFactory.create(AppModule, {
      logger: new MillisecondLogger(),
    });

    applyHttpAppConfiguration(app);

    // Enable CORS for cross-origin requests
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Set up Swagger when running on Firebase emulator (the emulator sets the FUNCTIONS_EMULATOR
    // variable automatically)
    if (process.env.FUNCTIONS_EMULATOR) setupSwagger(app);

    await app.init();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    cachedServer = app.getHttpAdapter().getInstance();
  }

  return cachedServer;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
exports.api = onRequest(async (req, res) => {
  const server = await createNestServer();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  server(req, res);
});
