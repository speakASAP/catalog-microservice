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
 * Media Entity - Images, videos, documents per product
 */
@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  // Type: image, video, document
  @Column({ length: 50 })
  type: string;

  @Column({ length: 1000 })
  url: string;

  // Thumbnail URL for images/videos
  @Column({ length: 1000, nullable: true })
  thumbnailUrl: string;

  @Column({ length: 500, nullable: true })
  altText: string;

  @Column({ length: 200, nullable: true })
  title: string;

  // Position in gallery/list
  @Column({ default: 0 })
  position: number;

  @Column({ default: false })
  isPrimary: boolean;

  // File metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    width?: number;
    height?: number;
    size?: number;
    mimeType?: string;
    duration?: number; // For videos
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

