import { Injectable, Optional } from '@nestjs/common';
import { ProductEventOutboxPublisherService } from '../product-events/product-event-outbox-publisher.service';
import { BpcpProcessEventConsumerService } from '../bpcp-events/bpcp-process-event-consumer.service';
import { BpcpProcessEventProjectionService } from '../bpcp-events/bpcp-process-event-projection.service';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    @Optional()
    private readonly productEventOutboxPublisher?: ProductEventOutboxPublisherService,
    @Optional()
    private readonly bpcpProcessEventConsumer?: BpcpProcessEventConsumerService,
    @Optional()
    private readonly bpcpProcessProjection?: BpcpProcessEventProjectionService,
  ) {}

  async getHealth() {
    return {
      status: 'healthy',
      service: process.env.SERVICE_NAME || 'catalog-microservice',
      version: '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      operations: {
        productEvents: await this.getProductEventPublisherStatus(),
        bpcpProcessEvents: this.getBpcpProcessEventStatus(),
      },
    };
  }

  async getReady() {
    const productEvents = await this.getProductEventPublisherStatus();
    const bpcpProcessEvents = this.getBpcpProcessEventStatus();
    const publisherReady = !productEvents.connection.enabled || productEvents.connection.status === 'up';
    const bpcpReady = !bpcpProcessEvents.consumer.enabled || bpcpProcessEvents.consumer.connection.status === 'up';

    return {
      ready: publisherReady && bpcpReady,
      status: publisherReady && bpcpReady ? 'ready' : 'not_ready',
      service: process.env.SERVICE_NAME || 'catalog-microservice',
      timestamp: new Date().toISOString(),
      dependencies: {
        productEvents: productEvents.connection,
        bpcpProcessEvents: bpcpProcessEvents.consumer.connection,
      },
      operations: {
        productEvents,
        bpcpProcessEvents,
      },
    };
  }

  private getBpcpProcessEventStatus() {
    return {
      consumer: this.bpcpProcessEventConsumer?.getStatus() ?? {
        schemaVersion: 'catalog.bpcp-process-consumer-status.v1',
        enabled: false,
        connection: {
          status: 'disabled' as const,
          exchange: 'bpcp.events',
          queue: 'catalog.bpcp.process-published.v1',
          routingKey: 'bpcp.process.published.v1',
          urlConfigured: false,
          signingSecretConfigured: false,
          missing: ['[MISSING: BpcpProcessEventConsumerService provider]'],
          lastError: null,
        },
        counters: {
          received: 0,
          applied: 0,
          rejected: 0,
          signatureFailures: 0,
        },
        lastReceivedAt: null,
        lastAppliedEventId: null,
      },
      projection: this.bpcpProcessProjection?.getStatus() ?? {
        schemaVersion: 'catalog.bpcp-process-projection-status.v1',
        supportedProcessIds: ['holiday-discount-2026'],
        activeProjectionCount: 0,
        appliedEvents: 0,
        ignoredEvents: 0,
        lastAppliedEvent: null,
        projections: [],
        blockers: ['[MISSING: BpcpProcessEventProjectionService provider]'],
      },
    };
  }

  private async getProductEventPublisherStatus() {
    if (!this.productEventOutboxPublisher) {
      return {
        connection: {
          status: 'disabled' as const,
          enabled: false,
          exchange: 'catalog.events',
          urlConfigured: false,
          missing: ['[MISSING: ProductEventOutboxPublisherService provider]'],
          lastError: null,
        },
        outbox: null,
      };
    }

    return this.productEventOutboxPublisher.getPublishStatus();
  }
}

