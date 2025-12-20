import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';
import { Attribute } from './attribute.entity';

/**
 * ProductAttribute Entity - Product attribute values
 */
@Entity('product_attributes')
@Unique(['productId', 'attributeId'])
export class ProductAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.attributes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Attribute, (attr) => attr.productAttributes)
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ name: 'attribute_id' })
  attributeId: string;

  // Value stored as text, conversion based on attribute type
  @Column({ type: 'text' })
  value: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

