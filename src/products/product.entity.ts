import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ProductAttribute } from '../attributes/product-attribute.entity';
import { Media } from '../media/media.entity';
import { ProductPricing } from '../pricing/product-pricing.entity';
import { Category } from '../categories/category.entity';

/**
 * Product Entity - Single source of truth for all product data
 * All sales channels reference this central catalog
 */
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  sku: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 200, nullable: true })
  brand: string;

  @Column({ length: 200, nullable: true })
  manufacturer: string;

  @Column({ length: 50, nullable: true })
  ean: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weightKg: number;

  @Column({ type: 'jsonb', nullable: true })
  dimensionsCm: {
    length?: number;
    width?: number;
    height?: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  seoData: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    slug?: string;
  };

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  // Relations
  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @OneToMany(() => ProductAttribute, (attr) => attr.product)
  attributes: ProductAttribute[];

  @OneToMany(() => Media, (media) => media.product)
  media: Media[];

  @OneToMany(() => ProductPricing, (pricing) => pricing.product)
  pricing: ProductPricing[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

