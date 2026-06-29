import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

export type MarketplaceName = 'allegro' | 'bazos' | 'aukro' | 'flipflop' | string;

/**
 * Product-scoped marketplace profile.
 *
 * Catalog product fields remain the source of truth. This table stores only
 * marketplace-specific overrides, external listing references, and imported
 * source payloads that cannot safely live on the canonical Product entity.
 */
@Entity('product_marketplace_profiles')
@Index('idx_product_marketplace_profiles_product_marketplace', ['productId', 'marketplace'], { unique: true })
export class ProductMarketplaceProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 50 })
  marketplace: MarketplaceName;

  @Column({ name: 'canonical_aliases', type: 'jsonb', default: () => "'{}'::jsonb" })
  canonicalAliases: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  overrides: Record<string, unknown>;

  @Column({ name: 'external_refs', type: 'jsonb', default: () => "'{}'::jsonb" })
  externalRefs: Record<string, unknown>;

  @Column({ name: 'source_data', type: 'jsonb', nullable: true })
  sourceData: Record<string, unknown> | null;

  @Column({ length: 50, default: 'draft' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
