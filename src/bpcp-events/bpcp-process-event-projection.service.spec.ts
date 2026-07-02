import { BpcpProcessEventProjectionService } from './bpcp-process-event-projection.service';
import { parseBpcpProcessEventEnvelope } from './bpcp-process-event.types';

describe('BPCP process event projection', () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS;
    delete process.env.CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS;
  });

  function event(overrides: Record<string, unknown> = {}) {
    return parseBpcpProcessEventEnvelope({
      schemaVersion: 'bpcp.process-event.v1',
      id: 'holiday-discount-2026:1:process.published:1',
      type: 'process.published',
      processId: 'holiday-discount-2026',
      version: 1,
      status: 'active',
      policyRefs: ['holiday-10-percent-selected-categories'],
      workflowRefs: ['catalog-holiday-display'],
      campaignRefs: ['holiday-2026-main'],
      occurredAt: '2026-07-02T10:00:00.000Z',
      payload: {
        activeFrom: '2026-01-01T00:00:00.000Z',
        activeTo: '2027-01-01T00:00:00.000Z',
        lifecycle: {
          auditAction: 'published',
          details: {},
        },
        validation: {
          valid: true,
          validatedAt: '2026-07-02T10:00:00.000Z',
          failCount: 0,
          warningCount: 1,
        },
      },
      delivery: {
        state: 'dispatched',
      },
      ...overrides,
    });
  }

  it('fails closed when no active BPCP projection or eligibility fact schema exists', () => {
    const service = new BpcpProcessEventProjectionService(logger as any);

    const facts = service.discountEligibilityFacts({ id: 'product-1', categoryIds: ['category-1'], tags: [] });

    expect(facts.eligible).toBe(false);
    expect(facts.blockers).toEqual(expect.arrayContaining([
      '[MISSING: active BPCP projection for holiday-discount-2026]',
      '[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]',
    ]));
  });

  it('returns eligible only after a supported active process and configured category match', () => {
    process.env.CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS = 'category-1';
    const service = new BpcpProcessEventProjectionService(logger as any);

    service.applyEvent(event());
    const facts = service.discountEligibilityFacts({ id: 'product-1', categoryIds: ['category-1'], tags: [] });

    expect(facts.eligible).toBe(true);
    expect(facts.processVersion).toBe(1);
    expect(facts.policyRefs).toEqual(['holiday-10-percent-selected-categories']);
    expect(facts.reasonCodes).toContain('HOLIDAY_DISCOUNT_ELIGIBLE');
  });

  it('deduplicates replayed process events by event id', () => {
    const service = new BpcpProcessEventProjectionService(logger as any);

    service.applyEvent(event());
    service.applyEvent(event());
    const status = service.getStatus();

    expect(status.appliedEvents).toBe(1);
    expect(status.duplicateEvents).toBe(1);
  });

  it('removes eligibility after pause or retire events', () => {
    process.env.CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS = 'category-1';
    const service = new BpcpProcessEventProjectionService(logger as any);

    service.applyEvent(event());
    service.applyEvent(event({ id: 'holiday-discount-2026:1:process.paused:2', type: 'process.paused', status: 'paused' }));
    const facts = service.discountEligibilityFacts({ id: 'product-1', categoryIds: ['category-1'], tags: [] });

    expect(facts.eligible).toBe(false);
    expect(facts.blockers).toContain('[MISSING: active BPCP projection for holiday-discount-2026]');
  });
});
