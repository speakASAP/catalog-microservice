import type { EntityManager } from 'typeorm';
import type { CatalogActor } from '../auth/catalog-auth.guard';
import type { ProductLifecycle } from '../products/product.entity';
import type { CatalogProductEventOutbox } from './product-event-outbox.entity';

export const CATALOG_PRODUCT_EVENT_TYPES = [
  'catalog.product.upserted.v1',
  'catalog.product.updated.v1',
  'catalog.product.archived.v1',
  'catalog.product.deleted.v1',
  'catalog.product.category_changed.v1',
  'catalog.product.sellability_changed.v1',
] as const;

export type CatalogProductEventType = typeof CATALOG_PRODUCT_EVENT_TYPES[number];

export type CatalogProductEventOutboxStatus =
  | 'pending'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'dead_letter';

export type CatalogProductEventProductSnapshot = {
  id: string;
  sku: string;
  title: string;
  ownerUserId: string | null;
  lifecycle: ProductLifecycle | string | null;
  isActive: boolean;
  categoryIds: string[];
  updatedAt: string | null;
};

export type CatalogProductEventActor = {
  type: CatalogActor['type'] | 'unknown';
  sub: string | null;
  roles: string[];
  authMethod?: string;
};

export type CatalogProductEventEnvelope = {
  eventId: string;
  eventType: CatalogProductEventType;
  eventVersion: 1;
  occurredAt: string;
  producer: {
    service: 'catalog-microservice';
    component: string;
  };
  aggregate: {
    type: 'product';
    id: string;
  };
  routingKey: CatalogProductEventType;
  idempotencyKey: string;
  actor: CatalogProductEventActor;
  data: {
    product: CatalogProductEventProductSnapshot;
    change: Record<string, unknown> & { changedFields: string[] };
  };
};

export type CatalogProductEventInput = {
  eventType: CatalogProductEventType;
  productId: string;
  product: CatalogProductEventProductSnapshot;
  actor?: CatalogActor;
  occurredAt?: string;
  producerComponent?: string;
  changedFields?: string[];
  change?: Record<string, unknown>;
};

export interface CatalogProductEventPublisher {
  recordProductEvents(
    manager: EntityManager | null | undefined,
    events: CatalogProductEventInput[],
  ): Promise<CatalogProductEventOutbox[]>;
}
