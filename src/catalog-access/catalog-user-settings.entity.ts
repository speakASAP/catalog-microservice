import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('catalog_user_settings')
export class CatalogUserSettings {
  @PrimaryColumn({ name: 'user_id', length: 200 })
  userId: string;

  @Column({ name: 'include_alfares_catalog', default: false })
  includeAlfaresCatalog: boolean;

  @Column({ name: 'include_community_catalog', default: false })
  includeCommunityCatalog: boolean;

  @Column({ name: 'source_application', length: 100, nullable: true })
  sourceApplication: string | null;

  @CreateDateColumn({ name: 'first_seen_at' })
  firstSeenAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
