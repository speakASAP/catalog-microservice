import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

/**
 * ProductPricing Entity - Pricing with validity periods
 */
@Entity('product_pricing')
export class ProductPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.pricing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  // Base selling price
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ length: 3, default: 'CZK' })
  currency: string;

  // Our cost price (what we pay)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice: number;

  // Margin percentage
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  marginPercent: number;

  // Special/sale price
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salePrice: number;

  // Validity period for this pricing
  @Column({ type: 'timestamp', nullable: true })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  validTo: Date;

  // Is this the current active pricing?
  @Column({ default: true })
  isActive: boolean;

  // Price type: regular, sale, wholesale, etc.
  @Column({ length: 50, default: 'regular' })
  priceType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

