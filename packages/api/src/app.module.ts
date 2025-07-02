import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth';
import { ContentModule } from './content';
import { initializeFirebaseAdmin } from './config/firebase-admin.config';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    // https://docs.nestjs.com/techniques/configuration
    // https://stackoverflow.com/questions/63285055/nestjs-how-to-use-env-variables-in-main-app-module-file-for-database-connecti/63285574#63285574
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.local-dev`],
    }),
    HealthModule,
    AuthModule,
    ContentModule,
  ],
  controllers: [AppController],
})
export class AppModule {
  private readonly logger = new Logger('firebase-admin.config.ts');

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.debug('CURRENT_ENV: ' + this.configService.get('CURRENT_ENV'));

    // Initialize Firebase Admin SDK
    initializeFirebaseAdmin(this.configService);

    console.log('AppModule initialized');
  }
}
