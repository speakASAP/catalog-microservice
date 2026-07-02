import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import type { BpcpProcessEventEnvelope, BpcpProcessEventType } from './bpcp-process-event.types';

@Entity('catalog_bpcp_process_event_dedupe')
@Index('idx_catalog_bpcp_process_event_dedupe_process', ['processId', 'processVersion'])
@Index('idx_catalog_bpcp_process_event_dedupe_type', ['eventType', 'occurredAt'])
export class BpcpProcessEventDedupe {
  @PrimaryColumn({ name: 'event_id', type: 'text' })
  eventId: string;

  @Column({ name: 'process_id', type: 'text' })
  processId: string;

  @Column({ name: 'process_version', type: 'int' })
  processVersion: number;

  @Column({ name: 'event_type', type: 'text' })
  eventType: BpcpProcessEventType;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  occurredAt: Date;

  @Column({ type: 'jsonb' })
  payload: BpcpProcessEventEnvelope;

  @CreateDateColumn({ name: 'applied_at' })
  appliedAt: Date;
}
