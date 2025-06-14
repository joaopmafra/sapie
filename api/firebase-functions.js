// TODO replace by imports
// TODO create a firebase specific package.json file with only the entries needed by firebase;
//  also, place this file and the new package.json file in a separate folder;
//  update the build script build:firebase
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');
const { onRequest } = require('firebase-functions/v2/https');

let cachedApp;

async function createNestServer() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for cross-origin requests
    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }

  return cachedApp;
}

exports.api = onRequest(async (req, res) => {
  const server = await createNestServer();
  server(req, res);
});
