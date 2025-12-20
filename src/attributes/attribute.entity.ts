import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProductAttribute } from './product-attribute.entity';

/**
 * Attribute Entity - Attribute definitions (text, number, select types)
 */
@Entity('attributes')
export class Attribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, unique: true })
  code: string;

  // Type: text, number, select, multiselect, boolean, date
  @Column({ length: 50 })
  type: string;

  // Unit for numeric values: cm, kg, etc.
  @Column({ length: 50, nullable: true })
  unit: string;

  // For select/multiselect types - allowed values
  @Column({ type: 'jsonb', nullable: true })
  allowedValues: string[];

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: true })
  isFilterable: boolean;

  @Column({ default: true })
  isSearchable: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  // Product attributes using this definition
  @OneToMany(() => ProductAttribute, (pa) => pa.attribute)
  productAttributes: ProductAttribute[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

