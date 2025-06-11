# Sapie

Sapie is a knowledge management app.

## Setup

[Install pnpm globally](https://pnpm.io/installation)

Install NestJS globally:
```bash
pnpm add -g @nestjs/cli
```

## Development

### Firebase Emulator

Start the Firebase emulator:
```bash
firebase emulators:start
```

The emulator will start and provide you with a local URL (typically http://localhost:5000) where you can access your application.

## Deploying to Firebase Hosting

This application is configured to be deployed to Firebase Hosting. Follow these steps to deploy:

### Deployment

```bash
firebase deploy
```

After deployment, your application will be available at [https://sapie-b09be.web.app](https://sapie-b09be.web.app).
