import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  CatalogProductEventEnvelope,
  CatalogProductEventOutboxStatus,
  CatalogProductEventType,
} from './product-event.types';

@Entity('catalog_product_event_outbox')
@Index('idx_catalog_product_event_outbox_status_next_attempt', ['status', 'nextAttemptAt'])
@Index('idx_catalog_product_event_outbox_created_at', ['createdAt'])
@Index('idx_catalog_product_event_outbox_aggregate', ['aggregateId', 'createdAt'])
@Index('idx_catalog_product_event_outbox_event_type', ['eventType', 'createdAt'])
@Index('idx_catalog_product_event_outbox_sku', ['sku'])
export class CatalogProductEventOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid', unique: true })
  eventId: string;

  @Column({ name: 'event_type', length: 100 })
  eventType: CatalogProductEventType;

  @Column({ name: 'routing_key', length: 120 })
  routingKey: CatalogProductEventType;

  @Column({ name: 'schema_version', type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ name: 'aggregate_type', length: 50, default: 'product' })
  aggregateType: 'product';

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'owner_user_id', length: 200, nullable: true })
  ownerUserId: string | null;

  @Column({ length: 100, nullable: true })
  sku: string | null;

  @Column({ name: 'category_ids', type: 'text', array: true, default: () => "'{}'::text[]" })
  categoryIds: string[];

  @Column({ name: 'idempotency_key', length: 220, unique: true })
  idempotencyKey: string;

  @Column({ type: 'jsonb' })
  payload: CatalogProductEventEnvelope;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  headers: Record<string, unknown>;

  @Column({ length: 50, default: 'pending' })
  status: CatalogProductEventOutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'int', default: 12 })
  maxAttempts: number;

  @Column({ name: 'next_attempt_at', type: 'timestamp', nullable: true })
  nextAttemptAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
