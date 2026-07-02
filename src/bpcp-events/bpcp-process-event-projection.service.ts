import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import {
  BpcpProcessEventEnvelope,
  CatalogDiscountEligibilityFacts,
} from './bpcp-process-event.types';

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

@Injectable()
export class BpcpProcessEventProjectionService {
  private readonly projections = new Map<string, ProcessProjection>();
  private appliedEvents = 0;
  private ignoredEvents = 0;
  private lastAppliedEvent: ProcessProjection | null = null;

  constructor(private readonly logger: LoggerService) {}

  applyEvent(event: BpcpProcessEventEnvelope): void {
    if (!this.supportedProcessIds().includes(event.processId)) {
      this.ignoredEvents += 1;
      this.logger.warn(
        `Ignoring unsupported BPCP process event ${event.processId}:${event.version}`,
        'BpcpProcessEventProjectionService',
      );
      return;
    }

    const key = this.key(event.processId, event.version);
    if (event.type === 'process.paused' || event.type === 'process.retired' || event.status === 'paused' || event.status === 'retired') {
      this.projections.delete(key);
      this.appliedEvents += 1;
      this.lastAppliedEvent = {
        processId: event.processId,
        version: event.version,
        status: event.status,
        policyRefs: event.policyRefs,
        workflowRefs: event.workflowRefs,
        campaignRefs: event.campaignRefs,
        activeFrom: event.payload.activeFrom,
        activeTo: event.payload.activeTo,
        lastEventId: event.id,
        lastEventType: event.type,
        updatedAt: event.occurredAt,
      };
      return;
    }

    if (event.type !== 'process.published' || event.status !== 'active') {
      this.ignoredEvents += 1;
      return;
    }

    const projection = {
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
    this.projections.set(key, projection);
    this.appliedEvents += 1;
    this.lastAppliedEvent = projection;
  }

  getStatus() {
    return {
      schemaVersion: 'catalog.bpcp-process-projection-status.v1',
      supportedProcessIds: this.supportedProcessIds(),
      activeProjectionCount: this.projections.size,
      appliedEvents: this.appliedEvents,
      ignoredEvents: this.ignoredEvents,
      lastAppliedEvent: this.lastAppliedEvent,
      projections: Array.from(this.projections.values()).sort((a, b) => `${a.processId}:${a.version}`.localeCompare(`${b.processId}:${b.version}`)),
      blockers: this.blockers(),
    };
  }

  discountEligibilityFacts(product: ProductFacts, processId = 'holiday-discount-2026'): CatalogDiscountEligibilityFacts {
    const projection = this.latestProjection(processId);
    const categoryAllowList = listEnv('CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS');
    const tagAllowList = listEnv('CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS');
    const matchedCategoryIds = product.categoryIds.filter((id) => categoryAllowList.includes(id));
    const matchedTags = product.tags.filter((tag) => tagAllowList.includes(tag));
    const blockers: string[] = [];
    const reasonCodes: string[] = [];

    if (!projection) {
      blockers.push(`[MISSING: active BPCP projection for ${processId}]`);
      reasonCodes.push('BPCP_PROCESS_NOT_ACTIVE');
    }
    if (categoryAllowList.length === 0 && tagAllowList.length === 0) {
      blockers.push('[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]');
      reasonCodes.push('HOLIDAY_ELIGIBILITY_FACT_SCHEMA_MISSING');
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
      eligible,
      matchedCategoryIds,
      matchedTags,
      reasonCodes,
      blockers,
      evaluatedAt: new Date().toISOString(),
      source: 'bpcp-process-event-projection',
    };
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

  private blockers(): string[] {
    const blockers: string[] = [];
    if (listEnv('CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS').length === 0 && listEnv('CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS').length === 0) {
      blockers.push('[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]');
    }
    return blockers;
  }

  private key(processId: string, version: number): string {
    return `${processId}:${version}`;
  }
}

function listEnv(name: string, fallback: string[] = []): string[] {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}
