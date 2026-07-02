export type BpcpProcessEventType =
  | 'process.created'
  | 'process.validated'
  | 'process.scheduled'
  | 'process.published'
  | 'process.paused'
  | 'process.retired';

export type BpcpProcessStatus = 'draft' | 'validated' | 'scheduled' | 'active' | 'paused' | 'retired';

export interface BpcpProcessEventEnvelope {
  schemaVersion: 'bpcp.process-event.v1';
  id: string;
  type: BpcpProcessEventType;
  processId: string;
  version: number;
  status: BpcpProcessStatus;
  policyRefs: string[];
  workflowRefs: string[];
  campaignRefs: string[];
  occurredAt: string;
  payload: {
    activeFrom?: string;
    activeTo?: string;
    lifecycle: {
      auditAction: string;
      details: Record<string, unknown>;
    };
    validation?: {
      valid: boolean;
      validatedAt: string;
      failCount: number;
      warningCount: number;
    };
  };
  delivery?: Record<string, unknown>;
}

export type CatalogDiscountEligibilityFacts = {
  schemaVersion: 'catalog.discount-eligibility-facts.v1';
  productId: string;
  processId: string;
  processVersion: number | null;
  policyRefs: string[];
  eligibilityAllowList: {
    schemaVersion: 'catalog.holiday-discount-eligibility-allow-list.v1';
    processId: 'holiday-discount-2026';
    categoryIds: string[];
    tags: string[];
    configured: boolean;
    requiredEnv: string[];
    missing: string[];
  };
  eligible: boolean;
  matchedCategoryIds: string[];
  matchedTags: string[];
  reasonCodes: string[];
  blockers: string[];
  evaluatedAt: string;
  source: 'bpcp-process-event-projection';
};

export function parseBpcpProcessEventEnvelope(value: unknown): BpcpProcessEventEnvelope {
  if (!isRecord(value)) {
    throw new Error('BPCP process event must be a JSON object');
  }
  if (value.schemaVersion !== 'bpcp.process-event.v1') {
    throw new Error('Unsupported BPCP process event schemaVersion');
  }
  const eventType = value.type;
  if (!isKnownEventType(eventType)) {
    throw new Error('Unsupported BPCP process event type');
  }
  const processId = stringField(value, 'processId');
  const version = numberField(value, 'version');
  const status = value.status;
  if (!['draft', 'validated', 'scheduled', 'active', 'paused', 'retired'].includes(String(status))) {
    throw new Error('Unsupported BPCP process status');
  }
  const payload = value.payload;
  if (!isRecord(payload) || !isRecord(payload.lifecycle)) {
    throw new Error('BPCP process event payload.lifecycle is required');
  }

  return {
    schemaVersion: 'bpcp.process-event.v1',
    id: stringField(value, 'id'),
    type: eventType,
    processId,
    version,
    status: status as BpcpProcessStatus,
    policyRefs: stringArrayField(value, 'policyRefs'),
    workflowRefs: stringArrayField(value, 'workflowRefs'),
    campaignRefs: stringArrayField(value, 'campaignRefs'),
    occurredAt: stringField(value, 'occurredAt'),
    payload: {
      activeFrom: optionalString(payload.activeFrom),
      activeTo: optionalString(payload.activeTo),
      lifecycle: {
        auditAction: stringField(payload.lifecycle, 'auditAction'),
        details: isRecord(payload.lifecycle.details) ? payload.lifecycle.details : {},
      },
      validation: isRecord(payload.validation)
        ? {
            valid: Boolean(payload.validation.valid),
            validatedAt: stringField(payload.validation, 'validatedAt'),
            failCount: numberField(payload.validation, 'failCount'),
            warningCount: numberField(payload.validation, 'warningCount'),
          }
        : undefined,
    },
    delivery: isRecord(value.delivery) ? value.delivery : undefined,
  };
}

function isKnownEventType(value: unknown): value is BpcpProcessEventType {
  return [
    'process.created',
    'process.validated',
    'process.scheduled',
    'process.published',
    'process.paused',
    'process.retired',
  ].includes(String(value));
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringField(source: Record<string, any>, field: string): string {
  const value = source[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`BPCP process event ${field} must be a non-empty string`);
  }
  return value;
}

function numberField(source: Record<string, any>, field: string): number {
  const value = source[field];
  if (!Number.isFinite(value)) {
    throw new Error(`BPCP process event ${field} must be a finite number`);
  }
  return value;
}

function stringArrayField(source: Record<string, any>, field: string): string[] {
  const value = source[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`BPCP process event ${field} must be a string array`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
