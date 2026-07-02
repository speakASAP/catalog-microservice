import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { BpcpProcessEventType, BpcpProcessStatus } from './bpcp-process-event.types';

@Entity('catalog_bpcp_process_projection')
@Index('idx_catalog_bpcp_process_projection_status', ['status'])
@Index('idx_catalog_bpcp_process_projection_updated_at', ['updatedAt'])
export class BpcpProcessProjectionEntity {
  @PrimaryColumn({ name: 'process_id', type: 'text' })
  processId: string;

  @PrimaryColumn({ name: 'process_version', type: 'int' })
  processVersion: number;

  @Column({ type: 'text' })
  status: BpcpProcessStatus;

  @Column({ name: 'policy_refs', type: 'text', array: true, default: () => "'{}'::text[]" })
  policyRefs: string[];

  @Column({ name: 'workflow_refs', type: 'text', array: true, default: () => "'{}'::text[]" })
  workflowRefs: string[];

  @Column({ name: 'campaign_refs', type: 'text', array: true, default: () => "'{}'::text[]" })
  campaignRefs: string[];

  @Column({ name: 'active_from', type: 'timestamp', nullable: true })
  activeFrom: Date | null;

  @Column({ name: 'active_to', type: 'timestamp', nullable: true })
  activeTo: Date | null;

  @Column({ name: 'last_event_id', type: 'text' })
  lastEventId: string;

  @Column({ name: 'last_event_type', type: 'text' })
  lastEventType: BpcpProcessEventType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
