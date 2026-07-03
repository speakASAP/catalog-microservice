import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { CatalogBundle } from './catalog-bundle.entity';

@Entity('catalog_bundle_items')
@Index('idx_catalog_bundle_items_product', ['productId'])
@Index('idx_catalog_bundle_items_position', ['bundleId', 'position'], { unique: true })
export class CatalogBundleItem {
  @PrimaryColumn({ name: 'bundle_id', type: 'uuid' })
  bundleId: string;

  @PrimaryColumn({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => CatalogBundle, (bundle) => bundle.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bundle_id' })
  bundle: CatalogBundle;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'integer' })
  position: number;

  @Column({ length: 30, default: 'component' })
  role: string;
}
