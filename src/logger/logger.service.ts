import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import axios from 'axios';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';

type CatalogWriteAuditDetails = {
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';
type CentralLogLevel = 'info' | 'error' | 'warn' | 'debug';

type CentralLogPayload = {
  level: CentralLogLevel;
  message: string;
  service: string;
  timestamp: string;
  metadata?: unknown;
  correlation_id?: string;
  duration_ms?: number;
};

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN =
  /(password|passcode|token|secret|api[_-]?key|authorization|cookie|session|email|phone|address|ssn|credit[_-]?card|card[_-]?number)/i;

/**
 * Centralized logger service
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly serviceName = process.env.SERVICE_NAME || 'catalog-microservice';
  private readonly loggingServiceUrl = process.env.LOGGING_SERVICE_URL?.replace(/\/+$/, '');
  private readonly loggingServiceApiPath = process.env.LOGGING_SERVICE_API_PATH || '/api/logs';
  private readonly loggingTimeoutMs = Number(process.env.LOGGING_SERVICE_TIMEOUT_MS || 1500);

  private formatMessage(message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    return `${timestamp} ${ctx} ${message}`;
  }

  log(message: string, context?: string) {
    this.write('log', message, context);
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
      requestId: this.extractCorrelationId(request),
      sourceIp: request.ip,
      userAgent: request.header('user-agent'),
      metadata: details.metadata,
    };

    this.write('log', `AUDIT ${JSON.stringify(auditEntry)}`, 'CatalogAudit', auditEntry, request);
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.formatMessage(message, context));
    if (trace) {
      console.error(trace);
    }
    this.sendCentralLog('error', message, {
      context,
      trace,
    });
  }

  warn(message: string, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.write('debug', message, context);
    }
  }

  verbose(message: string, context?: string) {
    if (process.env.LOG_LEVEL === 'verbose') {
      this.write('verbose', message, context);
    }
  }

  private write(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: unknown,
    request?: CatalogAuthenticatedRequest,
  ): void {
    const formattedMessage =
      level === 'warn'
        ? this.formatMessage(`WARN: ${message}`, context)
        : level === 'debug'
          ? this.formatMessage(`DEBUG: ${message}`, context)
          : level === 'verbose'
            ? this.formatMessage(`VERBOSE: ${message}`, context)
            : this.formatMessage(message, context);

    if (level === 'warn') {
      console.warn(formattedMessage);
    } else if (level === 'debug') {
      console.debug(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    this.sendCentralLog(level, message, {
      context,
      metadata,
      request,
    });
  }

  private sendCentralLog(
    level: LogLevel,
    message: string,
    options: {
      context?: string;
      metadata?: unknown;
      request?: CatalogAuthenticatedRequest;
      trace?: string;
    } = {},
  ): void {
    const endpoint = this.centralLoggingEndpoint();
    if (!endpoint) {
      return;
    }

    const metadata = this.redact({
      ...(options.context ? { context: options.context } : {}),
      ...(options.trace ? { trace: options.trace } : {}),
      ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
    });
    const durationMs = this.extractDurationMs(options.metadata);
    const correlationId =
      this.extractCorrelationId(options.request) || this.extractCorrelationIdFromMetadata(options.metadata);
    const payload: CentralLogPayload = {
      level: this.toCentralLevel(level),
      message: this.redactString(message),
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      metadata,
      ...(correlationId ? { correlation_id: correlationId } : {}),
      ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
    };

    const timeout =
      Number.isFinite(this.loggingTimeoutMs) && this.loggingTimeoutMs > 0
        ? this.loggingTimeoutMs
        : 1500;

    const token = process.env.LOGGING_SERVICE_TOKEN?.trim();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const requestOptions = headers ? { timeout, headers } : { timeout };

    void axios
      .post(endpoint, payload, requestOptions)
      .catch(() => undefined);
  }

  private toCentralLevel(level: LogLevel): CentralLogLevel {
    if (level === 'error' || level === 'warn' || level === 'debug') return level;
    return 'info';
  }

  private centralLoggingEndpoint(): string | null {
    if (!this.loggingServiceUrl) {
      return null;
    }

    const path = this.loggingServiceApiPath.startsWith('/')
      ? this.loggingServiceApiPath
      : `/${this.loggingServiceApiPath}`;
    return `${this.loggingServiceUrl}${path}`;
  }

  private extractCorrelationId(request?: CatalogAuthenticatedRequest): string | undefined {
    if (!request) {
      return undefined;
    }

    const requestId = (request as CatalogAuthenticatedRequest & { requestId?: unknown }).requestId;
    return (
      (typeof requestId === 'string' && requestId.trim() ? requestId : undefined) ||
      this.firstHeader(request, 'requestId') ||
      this.firstHeader(request, 'x-request-id') ||
      this.firstHeader(request, 'x-correlation-id')
    );
  }

  private firstHeader(request: CatalogAuthenticatedRequest, name: string): string | undefined {
    const header = request.header?.(name) ?? request.headers?.[name.toLowerCase()];
    if (Array.isArray(header)) {
      return header[0];
    }
    return typeof header === 'string' && header.trim() ? header : undefined;
  }

  private extractCorrelationIdFromMetadata(metadata: unknown): string | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const record = metadata as Record<string, unknown>;
    const value = record.requestId ?? record.correlation_id ?? record.correlationId;
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private extractDurationMs(metadata: unknown): number | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const record = metadata as Record<string, unknown>;
    const nestedMetadata =
      record.metadata && typeof record.metadata === 'object'
        ? (record.metadata as Record<string, unknown>)
        : undefined;
    const value =
      record.duration_ms ??
      record.durationMs ??
      nestedMetadata?.duration_ms ??
      nestedMetadata?.durationMs;
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private redact(value: unknown, seen = new WeakSet<object>()): unknown {
    if (typeof value === 'string') {
      return this.redactString(value);
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item, seen));
    }

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (redacted, [key, nestedValue]) => {
        redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
          ? REDACTED
          : this.redact(nestedValue, seen);
        return redacted;
      },
      {},
    );
  }

  private redactString(value: string): string {
    return value
      .replace(
        /"(password|passcode|token|secret|api[_-]?key|authorization|cookie|session|email|phone|address|ssn|credit[_-]?card|card[_-]?number)"\s*:\s*"[^"]*"/gi,
        (_match, key) => `"${key}":"${REDACTED}"`,
      )
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`);
  }
}
