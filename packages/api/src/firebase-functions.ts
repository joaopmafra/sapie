import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { onRequest } from 'firebase-functions/v2/https';
import { HttpServer } from '@nestjs/common/interfaces/http/http-server.interface';
import { initializeFirebaseAdmin } from './config/firebase-admin.config';

let cachedApp: HttpServer;

async function createNestServer() {
  if (!cachedApp) {
    // Initialize Firebase Admin SDK
    initializeFirebaseAdmin();

    const app = await NestFactory.create(AppModule);

    // Enable CORS for cross-origin requests
    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    cachedApp = app.getHttpAdapter().getInstance();
  }

  return cachedApp;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
exports.api = onRequest(async (req, res) => {
  const server = await createNestServer();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  server(req, res);
});
