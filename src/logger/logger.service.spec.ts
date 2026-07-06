import axios from 'axios';
import { LoggerService } from './logger.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LoggerService', () => {
  const originalEnv = process.env;
  let consoleLog: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedAxios.post.mockResolvedValue({ status: 202 } as any);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
    process.env = originalEnv;
  });

  it('keeps console fallback and posts to the configured central logging endpoint', () => {
    process.env.LOGGING_SERVICE_URL = 'http://logging-microservice:3300/';
    process.env.LOGGING_SERVICE_API_PATH = '/api/custom-logs';
    process.env.SERVICE_NAME = 'catalog-test';

    const logger = new LoggerService();
    logger.log('catalog started', 'Bootstrap');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('[Bootstrap] catalog started'));
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://logging-microservice:3300/api/custom-logs',
      expect.objectContaining({
        level: 'log',
        message: 'catalog started',
        service: 'catalog-test',
        metadata: { context: 'Bootstrap' },
      }),
      { timeout: 1500 },
    );
  });

  it('uses the default API path and fails open when the transport rejects', () => {
    process.env.LOGGING_SERVICE_URL = 'http://logging-microservice:3300';
    mockedAxios.post.mockRejectedValue(new Error('network down'));

    const logger = new LoggerService();

    expect(() => logger.warn('transport should not block', 'LoggerTest')).not.toThrow();
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('[LoggerTest] WARN: transport should not block'),
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://logging-microservice:3300/api/logs',
      expect.objectContaining({
        level: 'warn',
        message: 'transport should not block',
      }),
      { timeout: 1500 },
    );
  });

  it('adds correlation and duration metadata for audit logs while redacting sensitive values', () => {
    process.env.LOGGING_SERVICE_URL = 'http://logging-microservice:3300';
    const logger = new LoggerService();
    const request: any = {
      catalogActor: {
        type: 'jwt',
        sub: 'user-1',
        email: 'seller@example.com',
        roles: ['catalog:write'],
        source: 'auth',
      },
      method: 'POST',
      originalUrl: '/api/products',
      url: '/api/products',
      ip: '127.0.0.1',
      headers: {
        'x-correlation-id': 'corr-123',
        'user-agent': 'jest',
      },
      header: jest.fn((name: string) => request.headers[name.toLowerCase()]),
    };

    logger.auditCatalogWrite(request, {
      action: 'create',
      resourceType: 'product',
      resourceId: 'product-1',
      metadata: {
        sku: 'SKU-1',
        duration_ms: 42,
        email: 'buyer@example.com',
        token: 'secret-token',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://logging-microservice:3300/api/logs',
      expect.objectContaining({
        correlation_id: 'corr-123',
        duration_ms: 42,
        message: expect.not.stringContaining('buyer@example.com'),
        metadata: expect.objectContaining({
          metadata: expect.objectContaining({
            actorEmail: '[REDACTED]',
            metadata: expect.objectContaining({
              sku: 'SKU-1',
              duration_ms: 42,
              email: '[REDACTED]',
              token: '[REDACTED]',
            }),
          }),
        }),
      }),
      { timeout: 1500 },
    );
  });

  it('prefers request.requestId when middleware provides it', () => {
    process.env.LOGGING_SERVICE_URL = 'http://logging-microservice:3300';
    const logger = new LoggerService();
    const request: any = {
      requestId: 'req-property-123',
      catalogActor: { type: 'service', sub: 'worker', roles: [] },
      method: 'PATCH',
      originalUrl: '/api/products/product-1',
      url: '/api/products/product-1',
      header: jest.fn(() => undefined),
      headers: {},
    };

    logger.auditCatalogWrite(request, {
      action: 'update',
      resourceType: 'product',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://logging-microservice:3300/api/logs',
      expect.objectContaining({
        correlation_id: 'req-property-123',
      }),
      { timeout: 1500 },
    );
  });

  it('does not post remotely when LOGGING_SERVICE_URL is missing', () => {
    delete process.env.LOGGING_SERVICE_URL;

    const logger = new LoggerService();
    logger.error('local only', 'trace', 'LoggerTest');

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('[LoggerTest] local only'));
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
