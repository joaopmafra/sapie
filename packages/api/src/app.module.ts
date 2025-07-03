import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth';
import { ContentModule } from './content';
import { FirebaseAdminModule } from './firebase';
import * as process from 'node:process';

@Module({
  imports: [
    // https://docs.nestjs.com/techniques/configuration
    // https://stackoverflow.com/questions/63285055/nestjs-how-to-use-env-variables-in-main-app-module-file-for-database-connecti/63285574#63285574
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.CURRENT_ENV}`],
    }),
    FirebaseAdminModule,
    HealthModule,
    AuthModule,
    ContentModule,
  ],
  controllers: [AppController],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.debug('CURRENT_ENV: ' + process.env.CURRENT_ENV);
    this.logger.debug('GCLOUD_PROJECT: ' + process.env.GCLOUD_PROJECT);
  }
}
