import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';

type CatalogWriteAuditDetails = {
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

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

  auditCatalogWrite(request: CatalogAuthenticatedRequest, details: CatalogWriteAuditDetails) {
    const actor = request.catalogActor;
    const auditEntry = {
      event: 'catalog.write',
      action: details.action,
      resourceType: details.resourceType,
      resourceId: details.resourceId,
      actorType: actor?.type ?? 'unknown',
      actorSub: actor?.sub ?? 'unknown',
      actorEmail: actor?.email,
      actorSource: actor?.source,
      actorRoles: actor?.roles ?? [],
      method: request.method,
      route: request.originalUrl || request.url,
      requestId: request.header('x-request-id') || request.header('x-correlation-id'),
      sourceIp: request.ip,
      userAgent: request.header('user-agent'),
      metadata: details.metadata,
    };

    this.log(`AUDIT ${JSON.stringify(auditEntry)}`, 'CatalogAudit');
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
