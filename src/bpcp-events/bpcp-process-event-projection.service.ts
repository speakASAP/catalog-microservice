import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LoggerService } from '../logger/logger.service';
import {
  BpcpProcessEventEnvelope,
  CatalogDiscountEligibilityFacts,
} from './bpcp-process-event.types';
import { BpcpProcessEventDedupe } from './bpcp-process-event-dedupe.entity';
import { BpcpProcessProjectionEntity } from './bpcp-process-projection.entity';

type ProcessProjection = {
  processId: string;
  version: number;
  status: string;
  policyRefs: string[];
  workflowRefs: string[];
  campaignRefs: string[];
  activeFrom?: string;
  activeTo?: string;
  lastEventId: string;
  lastEventType: string;
  updatedAt: string;
};

type ProductFacts = {
  id: string;
  categoryIds: string[];
  tags: string[];
};

type HolidayEligibilityAllowListContract = {
  schemaVersion: 'catalog.holiday-discount-eligibility-allow-list.v1';
  processId: 'holiday-discount-2026';
  categoryIds: string[];
  tags: string[];
  configured: boolean;
  requiredEnv: string[];
  missing: string[];
};

@Injectable()
export class BpcpProcessEventProjectionService implements OnModuleInit {
  private readonly projections = new Map<string, ProcessProjection>();
  private readonly seenEventIds = new Set<string>();
  private duplicateEvents = 0;
  private appliedEvents = 0;
  private ignoredEvents = 0;
  private lastAppliedEvent: ProcessProjection | null = null;
  private durableStoreReady = false;
  private durableStoreLastError: string | null = null;

  constructor(
    private readonly logger: LoggerService,
    @Optional()
    @InjectRepository(BpcpProcessEventDedupe)
    private readonly eventDedupeRepository?: Repository<BpcpProcessEventDedupe>,
    @Optional()
    @InjectRepository(BpcpProcessProjectionEntity)
    private readonly processProjectionRepository?: Repository<BpcpProcessProjectionEntity>,
  ) {}

  async onModuleInit() {
    await this.hydrateFromDurableStore();
  }

  async applyEvent(event: BpcpProcessEventEnvelope): Promise<{ applied: boolean; duplicate: boolean }> {
    if (this.canUseDurableStore()) {
      const durableResult = await this.applyEventDurably(event);
      if (durableResult) {
        return durableResult;
      }
    }
    return this.applyEventInMemory(event);
  }

  getStatus() {
    return {
      schemaVersion: 'catalog.bpcp-process-projection-status.v1',
      supportedProcessIds: this.supportedProcessIds(),
      durableStore: {
        schemaVersion: 'catalog.bpcp-process-projection-store.v1',
        mode: this.durableStoreReady ? 'durable' : 'memory-fallback',
        ready: this.durableStoreReady,
        tables: [
          'catalog_bpcp_process_event_dedupe',
          'catalog_bpcp_process_projection',
        ],
        lastError: this.durableStoreLastError,
      },
      eligibilityAllowList: this.eligibilityAllowListContract(),
      activeProjectionCount: this.projections.size,
      appliedEvents: this.appliedEvents,
      ignoredEvents: this.ignoredEvents,
      duplicateEvents: this.duplicateEvents,
      lastAppliedEvent: this.lastAppliedEvent,
      projections: Array.from(this.projections.values()).sort((a, b) => `${a.processId}:${a.version}`.localeCompare(`${b.processId}:${b.version}`)),
      blockers: this.blockers(),
    };
  }

  discountEligibilityFacts(product: ProductFacts, processId = 'holiday-discount-2026'): CatalogDiscountEligibilityFacts {
    const projection = this.latestProjection(processId);
    const allowList = this.eligibilityAllowListContract();
    const matchedCategoryIds = product.categoryIds.filter((id) => allowList.categoryIds.includes(id));
    const matchedTags = product.tags.filter((tag) => allowList.tags.includes(tag));
    const blockers: string[] = [];
    const reasonCodes: string[] = [];

    if (!projection) {
      blockers.push(`[MISSING: active BPCP projection for ${processId}]`);
      reasonCodes.push('BPCP_PROCESS_NOT_ACTIVE');
    }
    if (!allowList.configured) {
      blockers.push(...allowList.missing);
      reasonCodes.push('HOLIDAY_ELIGIBILITY_ALLOW_LIST_MISSING');
    }
    if (projection && !this.isInsideWindow(projection)) {
      reasonCodes.push('BPCP_PROCESS_WINDOW_INACTIVE');
    }

    const matched = matchedCategoryIds.length > 0 || matchedTags.length > 0;
    const eligible = Boolean(projection) && this.isInsideWindow(projection) && matched && blockers.length === 0;
    if (!matched) {
      reasonCodes.push('PRODUCT_NOT_IN_HOLIDAY_ELIGIBILITY_SET');
    }
    if (eligible) {
      reasonCodes.push('HOLIDAY_DISCOUNT_ELIGIBLE');
    }

    return {
      schemaVersion: 'catalog.discount-eligibility-facts.v1',
      productId: product.id,
      processId,
      processVersion: projection?.version ?? null,
      policyRefs: projection?.policyRefs ?? [],
      eligibilityAllowList: allowList,
      eligible,
      matchedCategoryIds,
      matchedTags,
      reasonCodes,
      blockers,
      evaluatedAt: new Date().toISOString(),
      source: 'bpcp-process-event-projection',
    };
  }

  private async hydrateFromDurableStore(): Promise<void> {
    if (!this.canUseDurableStore()) {
      this.durableStoreReady = false;
      this.durableStoreLastError = '[MISSING: TypeORM repositories for durable BPCP projection store]';
      return;
    }
    try {
      const rows = await this.processProjectionRepository.find();
      this.projections.clear();
      for (const row of rows) {
        this.projections.set(this.key(row.processId, row.processVersion), this.fromEntity(row));
      }
      this.durableStoreReady = true;
      this.durableStoreLastError = null;
      this.logger.log(
        `Hydrated ${rows.length} BPCP process projection rows from durable store`,
        'BpcpProcessEventProjectionService',
      );
    } catch (error: unknown) {
      this.durableStoreReady = false;
      this.durableStoreLastError = toErrorMessage(error);
      this.logger.warn(
        `BPCP durable projection store unavailable; using memory fallback: ${this.durableStoreLastError}`,
        'BpcpProcessEventProjectionService',
      );
    }
  }

  private async applyEventDurably(event: BpcpProcessEventEnvelope): Promise<{ applied: boolean; duplicate: boolean } | null> {
    try {
      const existing = await this.eventDedupeRepository.findOne({ where: { eventId: event.id } });
      if (existing) {
        this.duplicateEvents += 1;
        return { applied: false, duplicate: true };
      }

      const result = await this.eventDedupeRepository.manager.transaction(async (manager) => {
        await manager.save(BpcpProcessEventDedupe, this.toDedupeEntity(event));
        return this.applyEventToProjection(event, manager);
      });
      this.durableStoreReady = true;
      this.durableStoreLastError = null;
      return result;
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        this.duplicateEvents += 1;
        return { applied: false, duplicate: true };
      }
      this.durableStoreReady = false;
      this.durableStoreLastError = toErrorMessage(error);
      this.logger.warn(
        `BPCP durable projection write failed; using memory fallback: ${this.durableStoreLastError}`,
        'BpcpProcessEventProjectionService',
      );
      return null;
    }
  }

  private async applyEventToProjection(
    event: BpcpProcessEventEnvelope,
    manager: EntityManager,
  ): Promise<{ applied: boolean; duplicate: boolean }> {
    if (!this.supportedProcessIds().includes(event.processId)) {
      this.ignoredEvents += 1;
      this.logger.warn(
        `Ignoring unsupported BPCP process event ${event.processId}:${event.version}`,
        'BpcpProcessEventProjectionService',
      );
      return { applied: false, duplicate: false };
    }

    const key = this.key(event.processId, event.version);
    if (event.type === 'process.paused' || event.type === 'process.retired' || event.status === 'paused' || event.status === 'retired') {
      await manager.delete(BpcpProcessProjectionEntity, { processId: event.processId, processVersion: event.version });
      this.projections.delete(key);
      this.appliedEvents += 1;
      this.lastAppliedEvent = this.projectionFromEvent(event);
      return { applied: true, duplicate: false };
    }

    if (event.type !== 'process.published' || event.status !== 'active') {
      this.ignoredEvents += 1;
      return { applied: false, duplicate: false };
    }

    const projection = this.projectionFromEvent(event);
    await manager.save(BpcpProcessProjectionEntity, this.toProjectionEntity(event));
    this.projections.set(key, projection);
    this.appliedEvents += 1;
    this.lastAppliedEvent = projection;
    return { applied: true, duplicate: false };
  }

  private applyEventInMemory(event: BpcpProcessEventEnvelope): { applied: boolean; duplicate: boolean } {
    if (this.seenEventIds.has(event.id)) {
      this.duplicateEvents += 1;
      return { applied: false, duplicate: true };
    }
    this.seenEventIds.add(event.id);
    if (!this.supportedProcessIds().includes(event.processId)) {
      this.ignoredEvents += 1;
      this.logger.warn(
        `Ignoring unsupported BPCP process event ${event.processId}:${event.version}`,
        'BpcpProcessEventProjectionService',
      );
      return { applied: false, duplicate: false };
    }

    const key = this.key(event.processId, event.version);
    if (event.type === 'process.paused' || event.type === 'process.retired' || event.status === 'paused' || event.status === 'retired') {
      this.projections.delete(key);
      this.appliedEvents += 1;
      this.lastAppliedEvent = this.projectionFromEvent(event);
      return { applied: true, duplicate: false };
    }

    if (event.type !== 'process.published' || event.status !== 'active') {
      this.ignoredEvents += 1;
      return { applied: false, duplicate: false };
    }

    const projection = this.projectionFromEvent(event);
    this.projections.set(key, projection);
    this.appliedEvents += 1;
    this.lastAppliedEvent = projection;
    return { applied: true, duplicate: false };
  }

  private latestProjection(processId: string): ProcessProjection | null {
    const candidates = Array.from(this.projections.values())
      .filter((projection) => projection.processId === processId)
      .sort((a, b) => b.version - a.version);
    return candidates[0] ?? null;
  }

  private isInsideWindow(projection: ProcessProjection): boolean {
    const now = Date.now();
    const startsOk = !projection.activeFrom || Date.parse(projection.activeFrom) <= now;
    const endsOk = !projection.activeTo || Date.parse(projection.activeTo) >= now;
    return startsOk && endsOk;
  }

  private supportedProcessIds(): string[] {
    return listEnv('CATALOG_BPCP_SUPPORTED_PROCESS_IDS', ['holiday-discount-2026']);
  }

  private eligibilityAllowListContract(): HolidayEligibilityAllowListContract {
    const categoryIds = listEnv('CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS');
    const tags = listEnv('CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS');
    const configured = categoryIds.length > 0 || tags.length > 0;
    return {
      schemaVersion: 'catalog.holiday-discount-eligibility-allow-list.v1',
      processId: 'holiday-discount-2026',
      categoryIds,
      tags,
      configured,
      requiredEnv: [
        'CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS',
        'CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS',
      ],
      missing: configured ? [] : ['[MISSING: approved Holiday Discount selected category/tag allow-list]'],
    };
  }

  private blockers(): string[] {
    const blockers: string[] = [];
    blockers.push(...this.eligibilityAllowListContract().missing);
    if (!this.durableStoreReady) {
      blockers.push('[MISSING: durable BPCP event dedupe/projection store]');
    }
    return blockers;
  }

  private projectionFromEvent(event: BpcpProcessEventEnvelope): ProcessProjection {
    return {
      processId: event.processId,
      version: event.version,
      status: event.status,
      policyRefs: [...event.policyRefs],
      workflowRefs: [...event.workflowRefs],
      campaignRefs: [...event.campaignRefs],
      activeFrom: event.payload.activeFrom,
      activeTo: event.payload.activeTo,
      lastEventId: event.id,
      lastEventType: event.type,
      updatedAt: event.occurredAt,
    };
  }

  private fromEntity(row: BpcpProcessProjectionEntity): ProcessProjection {
    return {
      processId: row.processId,
      version: row.processVersion,
      status: row.status,
      policyRefs: row.policyRefs ?? [],
      workflowRefs: row.workflowRefs ?? [],
      campaignRefs: row.campaignRefs ?? [],
      activeFrom: row.activeFrom ? row.activeFrom.toISOString() : undefined,
      activeTo: row.activeTo ? row.activeTo.toISOString() : undefined,
      lastEventId: row.lastEventId,
      lastEventType: row.lastEventType,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDedupeEntity(event: BpcpProcessEventEnvelope): BpcpProcessEventDedupe {
    const row = new BpcpProcessEventDedupe();
    row.eventId = event.id;
    row.processId = event.processId;
    row.processVersion = event.version;
    row.eventType = event.type;
    row.occurredAt = new Date(event.occurredAt);
    row.payload = event;
    return row;
  }

  private toProjectionEntity(event: BpcpProcessEventEnvelope): BpcpProcessProjectionEntity {
    const row = new BpcpProcessProjectionEntity();
    row.processId = event.processId;
    row.processVersion = event.version;
    row.status = event.status;
    row.policyRefs = [...event.policyRefs];
    row.workflowRefs = [...event.workflowRefs];
    row.campaignRefs = [...event.campaignRefs];
    row.activeFrom = event.payload.activeFrom ? new Date(event.payload.activeFrom) : null;
    row.activeTo = event.payload.activeTo ? new Date(event.payload.activeTo) : null;
    row.lastEventId = event.id;
    row.lastEventType = event.type;
    return row;
  }

  private canUseDurableStore(): boolean {
    return Boolean(this.eventDedupeRepository && this.processProjectionRepository);
  }

  private key(processId: string, version: number): string {
    return `${processId}:${version}`;
  }
}

function listEnv(name: string, fallback: string[] = []): string[] {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('[MISSING:')) {
    return fallback;
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23505');
}
