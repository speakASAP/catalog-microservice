import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

export type ProductRelationEvidence = Record<string, unknown>;

@Entity('product_relations')
@Unique('uq_product_relations_source_target_type_source', [
  'sourceProductId',
  'targetProductId',
  'relationType',
  'source',
])
@Index('idx_product_relations_source_order', [
  'sourceProductId',
  'relationType',
  'score',
  'confidence',
  'targetProductId',
])
@Index('idx_product_relations_target_product', ['targetProductId'])
export class ProductRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_product_id' })
  sourceProduct: Product;

  @Column({ name: 'source_product_id', type: 'uuid' })
  sourceProductId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_product_id' })
  targetProduct: Product;

  @Column({ name: 'target_product_id', type: 'uuid' })
  targetProductId: string;

  @Column({ name: 'relation_type', length: 60 })
  relationType: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  score: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1 })
  confidence: number;

  @Column({ length: 80, default: 'manual' })
  source: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  evidence: ProductRelationEvidence;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
