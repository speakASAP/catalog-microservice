import 'reflect-metadata';
import { CatalogProductEventOutbox } from './product-event-outbox.entity';
import { ProductEventOutboxPublisherService } from './product-event-outbox-publisher.service';

describe('ProductEventOutboxPublisherService', () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createService(events: CatalogProductEventOutbox[], brokerOverrides: Record<string, unknown> = {}) {
    const updateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const countsBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: 'pending', count: '1' },
        { status: 'failed', count: '2' },
        { status: 'dead_letter', count: '3' },
      ]),
    };
    const outboxRepository = {
      find: jest.fn().mockResolvedValue(events),
      save: jest.fn(async (event) => event),
      createQueryBuilder: jest.fn((alias?: string) => (alias === 'event' ? countsBuilder : updateBuilder)),
    };
    const broker = {
      isEnabled: jest.fn(() => true),
      connect: jest.fn(),
      close: jest.fn(),
      getConnectionStatus: jest.fn(() => ({
        status: 'up',
        enabled: true,
        exchange: 'catalog.events',
        urlConfigured: true,
        missing: [],
        lastError: null,
      })),
      publishEvent: jest.fn().mockResolvedValue(undefined),
      ...brokerOverrides,
    };
    const service = new ProductEventOutboxPublisherService(
      logger as any,
      outboxRepository as any,
      broker as any,
    );

    return { service, outboxRepository, broker, updateBuilder, countsBuilder };
  }

  function event(overrides: Partial<CatalogProductEventOutbox> = {}): CatalogProductEventOutbox {
    const eventId = overrides.eventId ?? '00000000-0000-4000-8000-000000000021';
    const eventType = overrides.eventType ?? 'catalog.product.updated.v1';
    const aggregateId = overrides.aggregateId ?? '11111111-1111-4111-8111-111111111111';

    return Object.assign(new CatalogProductEventOutbox(), {
      id: 'outbox-1',
      eventId,
      eventType,
      routingKey: eventType,
      schemaVersion: 1,
      aggregateType: 'product',
      aggregateId,
      ownerUserId: 'user-1',
      sku: 'SKU-1',
      categoryIds: ['category-1'],
      idempotencyKey: `${eventType}:${aggregateId}:${eventId}`,
      payload: {
        eventId,
        eventType,
        eventVersion: 1,
        occurredAt: '2026-07-02T10:00:00.000Z',
        producer: {
          service: 'catalog-microservice',
          component: 'ProductsService',
        },
        aggregate: {
          type: 'product',
          id: aggregateId,
        },
        routingKey: eventType,
        idempotencyKey: `${eventType}:${aggregateId}:${eventId}`,
        actor: {
          type: 'jwt',
          sub: 'user-1',
          roles: ['catalog:authenticated'],
        },
        data: {
          product: {
            id: aggregateId,
            sku: 'SKU-1',
            title: 'Catalog product',
            ownerUserId: 'user-1',
            lifecycle: 'active',
            isActive: true,
            categoryIds: ['category-1'],
            updatedAt: '2026-07-02T10:00:00.000Z',
          },
          change: {
            changedFields: ['title'],
          },
        },
      },
      headers: {
        contentType: 'application/json',
        exchange: 'catalog.events',
        routingKey: eventType,
        ignoredObject: { no: 'objects in headers' },
      },
      status: 'pending',
      attempts: 0,
      maxAttempts: 12,
      nextAttemptAt: null,
      lastError: null,
      publishedAt: null,
      createdAt: new Date('2026-07-02T10:00:00.000Z'),
      updatedAt: new Date('2026-07-02T10:00:00.000Z'),
      ...overrides,
    });
  }

  it('publishes due outbox rows with the Catalog event message contract and marks them published', async () => {
    const pendingEvent = event();
    const { service, outboxRepository, broker, updateBuilder } = createService([pendingEvent]);

    const results = await service.publishDueEvents();

    expect(results).toEqual([expect.objectContaining({
      eventType: 'catalog.product.updated.v1',
      status: 'published',
      eventId: '00000000-0000-4000-8000-000000000021',
    })]);
    expect(updateBuilder.set).toHaveBeenCalledWith({ status: 'publishing' });
    expect(updateBuilder.andWhere).toHaveBeenCalledWith(
      'status IN (:...statuses)',
      { statuses: ['pending', 'failed'] },
    );
    expect(broker.publishEvent).toHaveBeenCalledWith(expect.objectContaining({
      exchange: 'catalog.events',
      routingKey: 'catalog.product.updated.v1',
      payload: pendingEvent.payload,
      options: expect.objectContaining({
        persistent: true,
        contentType: 'application/json',
        messageId: '00000000-0000-4000-8000-000000000021',
        type: 'catalog.product.updated.v1',
        headers: expect.objectContaining({
          eventId: '00000000-0000-4000-8000-000000000021',
          eventType: 'catalog.product.updated.v1',
          aggregateId: '11111111-1111-4111-8111-111111111111',
          producer: 'catalog-microservice',
        }),
      }),
    }));
    expect(broker.publishEvent.mock.calls[0][0].options.headers.ignoredObject).toBeUndefined();
    expect(outboxRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'published',
      attempts: 1,
      lastError: null,
      nextAttemptAt: null,
      publishedAt: expect.any(Date),
    }));
  });

  it('keeps retryable failures in failed state with attempts and nextAttemptAt', async () => {
    const pendingEvent = event();
    const { service, outboxRepository, broker } = createService([pendingEvent], {
      publishEvent: jest.fn().mockRejectedValue(new Error('RabbitMQ channel not available')),
    });

    const results = await service.publishDueEvents();

    expect(results).toEqual([expect.objectContaining({
      status: 'failed',
      eventId: pendingEvent.eventId,
      error: 'RabbitMQ channel not available',
    })]);
    expect(broker.publishEvent).toHaveBeenCalledTimes(1);
    expect(outboxRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      attempts: 1,
      lastError: 'RabbitMQ channel not available',
      nextAttemptAt: expect.any(Date),
      publishedAt: null,
    }));
  });

  it('moves retryable failures to dead_letter when max attempts are exceeded', async () => {
    const pendingEvent = event({ attempts: 11, maxAttempts: 12 });
    const { service, outboxRepository } = createService([pendingEvent], {
      publishEvent: jest.fn().mockRejectedValue(new Error('broker closed')),
    });

    const results = await service.publishDueEvents();

    expect(results).toEqual([expect.objectContaining({
      status: 'dead_letter',
      eventId: pendingEvent.eventId,
      error: 'broker closed',
    })]);
    expect(outboxRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'dead_letter',
      attempts: 12,
      lastError: 'broker closed',
      nextAttemptAt: null,
      publishedAt: null,
    }));
  });

  it('dead-letters non-retryable contract failures without calling RabbitMQ', async () => {
    const invalidEvent = event({
      payload: {
        ...event().payload,
        eventId: 'mismatched-event-id',
      } as any,
    });
    const { service, outboxRepository, broker } = createService([invalidEvent]);

    const results = await service.publishDueEvents();

    expect(results).toEqual([expect.objectContaining({
      status: 'dead_letter',
      eventId: invalidEvent.eventId,
      error: expect.stringContaining('payload.eventId must match outbox.eventId'),
    })]);
    expect(broker.publishEvent).not.toHaveBeenCalled();
    expect(outboxRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: 'dead_letter',
      attempts: 1,
      nextAttemptAt: null,
      publishedAt: null,
    }));
  });

  it('does not claim rows when publisher is disabled', async () => {
    const pendingEvent = event();
    const { service, outboxRepository, broker } = createService([pendingEvent], {
      isEnabled: jest.fn(() => false),
      getConnectionStatus: jest.fn(() => ({
        status: 'disabled',
        enabled: false,
        exchange: 'catalog.events',
        urlConfigured: false,
        missing: ['[MISSING: CATALOG_EVENT_PUBLISHER_ENABLED=true]'],
        lastError: null,
      })),
    });

    await expect(service.publishDueEvents()).resolves.toEqual([]);

    expect(outboxRepository.find).not.toHaveBeenCalled();
    expect(outboxRepository.save).not.toHaveBeenCalled();
    expect(broker.publishEvent).not.toHaveBeenCalled();
  });

  it('exposes outbox counts and disabled/missing configuration in publish status', async () => {
    const { service } = createService([], {
      isEnabled: jest.fn(() => false),
      getConnectionStatus: jest.fn(() => ({
        status: 'disabled',
        enabled: false,
        exchange: 'catalog.events',
        urlConfigured: false,
        missing: ['[MISSING: CATALOG_EVENT_PUBLISHER_ENABLED=true]'],
        lastError: null,
      })),
    });

    await expect(service.getPublishStatus()).resolves.toEqual(expect.objectContaining({
      connection: expect.objectContaining({
        status: 'disabled',
        enabled: false,
        missing: ['[MISSING: CATALOG_EVENT_PUBLISHER_ENABLED=true]'],
      }),
      outbox: expect.objectContaining({
        counts: {
          pending: 1,
          publishing: 0,
          published: 0,
          failed: 2,
          dead_letter: 3,
        },
        batchSize: 25,
      }),
    }));
  });
});
