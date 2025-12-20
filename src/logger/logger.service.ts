import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

/**
 * Centralized logger service
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private formatMessage(message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    return `${timestamp} ${ctx} ${message}`;
  }

  log(message: string, context?: string) {
    console.log(this.formatMessage(message, context));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.formatMessage(message, context));
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string) {
    console.warn(this.formatMessage(`WARN: ${message}`, context));
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(`DEBUG: ${message}`, context));
    }
  }

  verbose(message: string, context?: string) {
    if (process.env.LOG_LEVEL === 'verbose') {
      console.log(this.formatMessage(`VERBOSE: ${message}`, context));
    }
  }
}

