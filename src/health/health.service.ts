import { Injectable, Optional } from '@nestjs/common';
import { ProductEventOutboxPublisherService } from '../product-events/product-event-outbox-publisher.service';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    @Optional()
    private readonly productEventOutboxPublisher?: ProductEventOutboxPublisherService,
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
      },
    };
  }

  async getReady() {
    const productEvents = await this.getProductEventPublisherStatus();
    const publisherReady = !productEvents.connection.enabled || productEvents.connection.status === 'up';

    return {
      ready: publisherReady,
      status: publisherReady ? 'ready' : 'not_ready',
      service: process.env.SERVICE_NAME || 'catalog-microservice',
      timestamp: new Date().toISOString(),
      dependencies: {
        productEvents: productEvents.connection,
      },
      operations: {
        productEvents,
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

