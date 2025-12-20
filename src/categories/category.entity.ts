import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

/**
 * Category Entity - Hierarchical category tree with materialized path
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Parent category (self-referencing)
  @ManyToOne(() => Category, (category) => category.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category;

  @Column({ nullable: true, name: 'parent_id' })
  parentId: string;

  // Child categories
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  // Materialized path for efficient tree queries: /electronics/phones/smartphones
  @Column({ length: 1000, nullable: true })
  path: string;

  @Column({ default: 0 })
  level: number;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  // SEO data
  @Column({ type: 'jsonb', nullable: true })
  seoData: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  // Products in this category
  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

