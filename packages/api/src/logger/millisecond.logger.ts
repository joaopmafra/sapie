import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

@Injectable()
export class MillisecondLogger extends ConsoleLogger {
  constructor(context?: string, logLevels?: LogLevel[]) {
    super(context ?? 'NestApplication', {
      logLevels,
    });
  }

  protected override getTimestamp(): string {
    return new Date().toISOString();
  }
}
