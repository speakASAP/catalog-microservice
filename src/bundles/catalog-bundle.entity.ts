import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogBundleItem } from './catalog-bundle-item.entity';

export type CatalogBundleStatus = 'draft' | 'active' | 'archived';
export type CatalogBundleSource = 'manual' | 'order_affinity' | 'campaign';
export type CatalogBundlePricePolicy = 'checkout_authoritative';
export type CatalogBundleVisibilityScope = 'catalog_internal' | 'storefront' | 'channel';
export type CatalogBundleValidationState = 'valid' | 'blocked';
export type CatalogBundleJson = Record<string, unknown>;

export type CatalogBundleVisibility = {
  scope: CatalogBundleVisibilityScope;
  channels: string[];
  startsAt: string | null;
  endsAt: string | null;
};

@Entity('catalog_bundles')
@Unique('uq_catalog_bundles_contract_idempotency', ['contractVersion', 'idempotencyKey'])
@Index('idx_catalog_bundles_status_updated', ['status', 'updatedAt', 'id'])
@Index('idx_catalog_bundles_source_updated', ['source', 'updatedAt', 'id'])
export class CatalogBundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_version', length: 40, default: 'catalog.bundle.v1' })
  contractVersion: string;

  @Column({ length: 20, default: 'draft' })
  status: CatalogBundleStatus;

  @Column({ length: 40 })
  source: CatalogBundleSource;

  @Column({ name: 'idempotency_key', type: 'text' })
  idempotencyKey: string;

  @Column({ name: 'idempotency_request_hash', type: 'text' })
  idempotencyRequestHash: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'price_policy', length: 40, default: 'checkout_authoritative' })
  pricePolicy: CatalogBundlePricePolicy;

  @Column({ name: 'discount_policy_ref', type: 'text', nullable: true })
  discountPolicyRef: string | null;

  @Column({ name: 'free_shipping_policy_ref', type: 'text', nullable: true })
  freeShippingPolicyRef: string | null;

  @Column({ name: 'currency_hint', length: 3, nullable: true })
  currencyHint: string | null;

  @Column({ type: 'jsonb', default: () => "'{\"scope\":\"catalog_internal\",\"channels\":[],\"startsAt\":null,\"endsAt\":null}'::jsonb" })
  visibility: CatalogBundleVisibility;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  evidence: CatalogBundleJson;

  @Column({ type: 'jsonb', default: () => "'{\"state\":\"blocked\",\"blockers\":[]}'::jsonb" })
  validation: { state: CatalogBundleValidationState; blockers: string[] };

  @Column({ name: 'created_by', type: 'jsonb', nullable: true })
  createdBy: CatalogBundleJson | null;

  @Column({ name: 'updated_by', type: 'jsonb', nullable: true })
  updatedBy: CatalogBundleJson | null;

  @OneToMany(() => CatalogBundleItem, (item) => item.bundle, { cascade: true })
  items: CatalogBundleItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'archived_at', type: 'timestamp with time zone', nullable: true })
  archivedAt: Date | null;
}
