import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { CatalogProductEventOutbox } from './product-event-outbox.entity';
import type {
  CatalogProductEventActor,
  CatalogProductEventEnvelope,
  CatalogProductEventInput,
  CatalogProductEventPublisher,
} from './product-event.types';

@Injectable()
export class ProductEventPublisherService implements CatalogProductEventPublisher {
  constructor(
    @InjectRepository(CatalogProductEventOutbox)
    private readonly outboxRepository: Repository<CatalogProductEventOutbox>,
  ) {}

  async recordProductEvents(
    manager: EntityManager | null | undefined,
    events: CatalogProductEventInput[],
  ): Promise<CatalogProductEventOutbox[]> {
    if (!events.length) {
      return [];
    }

    const repository = manager?.getRepository(CatalogProductEventOutbox) ?? this.outboxRepository;
    return repository.save(events.map((event) => this.toOutboxRow(event)));
  }

  private toOutboxRow(input: CatalogProductEventInput): CatalogProductEventOutbox {
    const eventId = randomUUID();
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const idempotencyKey = `${input.eventType}:${input.productId}:${eventId}`;
    const payload: CatalogProductEventEnvelope = {
      eventId,
      eventType: input.eventType,
      eventVersion: 1,
      occurredAt,
      producer: {
        service: 'catalog-microservice',
        component: input.producerComponent ?? 'ProductsService',
      },
      aggregate: {
        type: 'product',
        id: input.productId,
      },
      routingKey: input.eventType,
      idempotencyKey,
      actor: this.sanitizeActor(input.actor),
      data: {
        product: input.product,
        change: {
          changedFields: input.changedFields ?? [],
          ...(input.change ?? {}),
        },
      },
    };

    return Object.assign(new CatalogProductEventOutbox(), {
      eventId,
      eventType: input.eventType,
      routingKey: input.eventType,
      schemaVersion: 1,
      aggregateType: 'product',
      aggregateId: input.productId,
      ownerUserId: input.product.ownerUserId,
      sku: input.product.sku,
      categoryIds: input.product.categoryIds,
      idempotencyKey,
      payload,
      headers: {
        contentType: 'application/json',
        exchange: 'catalog.events',
        routingKey: input.eventType,
      },
      status: 'pending',
      attempts: 0,
      maxAttempts: this.maxAttempts(),
      nextAttemptAt: null,
      lastError: null,
      publishedAt: null,
    });
  }

  private sanitizeActor(actor: CatalogProductEventInput['actor']): CatalogProductEventActor {
    if (!actor) {
      return { type: 'unknown', sub: null, roles: [] };
    }

    return {
      type: actor.type,
      sub: actor.sub ?? null,
      roles: Array.isArray(actor.roles) ? actor.roles.slice(0, 20) : [],
      authMethod: actor.authMethod,
    };
  }

  private maxAttempts(): number {
    const configured = Number(process.env.CATALOG_EVENT_OUTBOX_MAX_ATTEMPTS || 12);
    return Number.isInteger(configured) && configured > 0 ? configured : 12;
  }
}
