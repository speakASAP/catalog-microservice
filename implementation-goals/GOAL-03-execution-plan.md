# EP-CATALOG-03: Pricing Integrity

```yaml
id: EP-CATALOG-03
status: draft
source_goal: implementation-goals/GOAL-03-pricing-integrity.md
owner: orchestrator
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
```

## Metadata

Remote implementation repository: `alfares:/home/ssf/Documents/Github/catalog-microservice`.

Branch target: `feature/catalog-goal-03-pricing-integrity`.

Lifecycle state: planning complete; pre-coding gate required before pricing source edits.

## Upstream Traceability

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/INTENT.md`
- `docs/orchestrator/GOALS.md`
- `docs/orchestrator/PLAN.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/governance/PROJECT_INVARIANTS.md`
- `implementation-goals/GOAL-03-pricing-integrity.md`

## Goal Impact

Goal 3 makes Catalog pricing reliable as product truth by ensuring current price selection is deterministic, invalid prices are rejected before persistence, large pricing changes cannot happen without an explicit human-review marker, and pricing writes continue to produce non-sensitive audit evidence.

## Project Invariants

- `CAT-INV-001`: Catalog remains the pricing record owner for product truth and exposes reliable pricing facts to consumers.
- `CAT-INV-007`: mass pricing changes over 10 products require explicit human review.
- `CAT-INV-009`: public pricing read envelopes remain backward compatible; deterministic selection changes only which valid price is chosen when multiple active candidates exist.
- `CAT-INV-010`: pricing mutations remain protected by `CatalogAuthGuard` and continue writing actor/source audit logs.

## Sensitive-Data Handling

Use synthetic product IDs, pricing IDs, currencies, and amounts in tests or runtime smokes. Do not print auth tokens, runtime secrets, raw production pricing rows, customer data, or production product identifiers in reports. Evidence should use command status and synthetic summaries only.

## Contract/Schema Impact

Primary API behavior impact is additive or corrective:

- `GET /api/pricing/product/:productId/current` should use explicit deterministic priority instead of lexical `priceType` ordering.
- Pricing write endpoints should reject invalid amounts, currencies, sale-price rules, and invalid validity windows.
- Any bulk pricing endpoint or service path introduced for mass changes must require an explicit human-review marker when more than 10 rows are affected.
- Existing response envelopes remain `{ success: true, data: ... }` unless a validation error is returned by Nest exception handling.

No database migration is required unless implementation chooses persisted audit fields. Prefer structured audit events through the existing `catalog.write` path unless a stronger owner-approved persistence requirement is discovered before coding.

## Scope

- Pricing entity/service/controller behavior.
- Pricing DTOs or service-level validation helpers.
- Deterministic current price query and tests.
- Human-review guard for bulk pricing changes.
- Pricing audit metadata for create/update/delete/bulk writes.
- Focused backend tests and direct runtime verification plan.
- Status and validation documentation.

## Non-Goals

- Do not implement checkout or payment behavior.
- Do not move payment ownership into Catalog.
- Do not bypass human review for pricing changes over 10 products.
- Do not alter product lifecycle/readiness behavior from Goal 2 except where current price diagnostics naturally consume the current-price contract.
- Do not change FlipFlop storefront UX or Bazos publishing behavior.

## Files To Inspect

- `src/pricing/product-pricing.entity.ts`
- `src/pricing/pricing.service.ts`
- `src/pricing/pricing.controller.ts`
- `src/pricing/pricing.module.ts`
- `src/products/products.service.ts`
- `src/logger/logger.service.ts`
- `src/auth/catalog-auth.guard.ts`
- `services/frontend/lib/api/pricing.ts`
- `services/frontend/components/PricingManagement.tsx`
- existing focused tests under `src/products/` and any future `src/pricing/` specs

## Files To Create

- Pricing DTO file if validation should not remain in the controller/service entity partials.
- `src/pricing/pricing.service.spec.ts` or similarly focused backend pricing spec.
- Goal 3 validation report under `reports/validation/` after implementation.

## Files To Modify

- `src/pricing/product-pricing.entity.ts` only if schema-neutral metadata or column constraints are needed.
- `src/pricing/pricing.service.ts`
- `src/pricing/pricing.controller.ts`
- `src/pricing/pricing.module.ts` if DTO/providers require it.
- `src/products/products.service.ts` only if readiness should call the deterministic current-price helper instead of local pricing array checks.
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `implementation-goals/GOAL-03-pricing-integrity.md`
- Goal 3 validation report.

## Files That Must Not Be Modified

- `BUSINESS.md`
- `docs/orchestrator/INTENT.md`
- `docs/governance/PROJECT_INVARIANTS.md` unless the owner approves governance changes.
- Payment, checkout, warehouse, FlipFlop, Bazos, and external channel repositories.
- Production secret values or local `.env` files.

## Implementation Steps

1. Confirm branch `feature/catalog-goal-03-pricing-integrity` and clean working tree before source edits.
2. Add typed pricing write DTOs or service input validation so create/update/bulk paths validate currency, positive base price, positive optional cost/sale price, sale price not exceeding base price, and validity window ordering.
3. Replace current-price selection with explicit deterministic ordering: active rows whose validity window contains now; sale price or sale type before regular; newest valid start date before older rows; newest creation/update timestamp as final tie-breaker.
4. Add or guard a bulk pricing write path so changes over 10 rows require an explicit human-review marker such as `x-human-review: explicit`; arrays sent to single-row endpoints should not silently become mass writes.
5. Preserve `CatalogAuthGuard` on every pricing mutation and enrich pricing audit metadata with non-sensitive price type, currency, product count, and human-review marker status.
6. Add focused Jest tests for deterministic current price priority, invalid pricing rejection, validity window rejection, and mass-change guard behavior.
7. Run source validation: `npm test`, `npm run build`, and `git diff --check`.
8. If production deployment is later approved, run runtime API verification with synthetic products/prices only and clean up synthetic records through approved paths.
9. Update Goal 3 validation/status docs and commit all Goal 3 changes.

## Test Plan

- Unit-test pricing validation for zero/negative base price, invalid currency, invalid sale price, and invalid validity window.
- Unit-test deterministic current price when regular and sale prices overlap.
- Unit-test tie-break behavior with multiple active candidates.
- Unit-test mass-change guard rejects more than 10 changes without explicit human review and allows them with the marker.
- Direct API verification after deployment approval should cover protected mutation auth, invalid write rejection, current price selection, and human-review guard using synthetic data.

## Validation Plan

- `npm test` must pass.
- `npm run build` must pass.
- `git diff --check` must pass.
- Existing pricing read envelopes must remain compatible.
- Runtime verification is required before marking Goal 3 deployed/complete if source changes are deployed to production.

## Gate Commands

```bash
git status --short --branch
python3 -c "from pathlib import Path; files=[Path(p) for p in ["docs/orchestrator/GOALS.md","docs/orchestrator/PLAN.md","docs/orchestrator/STATUS.md","docs/IMPLEMENTATION_STATE.md","implementation-goals/GOAL-03-pricing-integrity.md","implementation-goals/GOAL-03-execution-plan.md","reports/validation/GOAL-03-pre-coding-gate.md"]]; markers=[chr(91)+"MISSING:", chr(91)+"UNKNOWN:"]; hits=[str(f) for f in files if any(m in f.read_text() for m in markers)]; print("missing_marker_hits=" + str(hits)); raise SystemExit(1 if hits else 0)"
npm test
npm run build
git diff --check
```

For the pre-coding gate, run the status, missing-marker, and whitespace checks. Build/test are implementation-phase gates after source edits.

## Documentation Updates

- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `implementation-goals/GOAL-03-pricing-integrity.md`
- Goal 3 validation report under `reports/validation/`

## Rollback Plan

Revert the Goal 3 implementation commit. If a later implementation introduces schema changes, rollback must preserve existing pricing rows and be reviewed before removing additive fields. Validation-only and documentation changes can be reverted independently.

## Agent Handoff Prompt

Implement Goal 3 in the remote `catalog-microservice` repository only. Preserve existing pricing read envelopes, keep pricing mutations protected, make current-price selection deterministic, reject invalid pricing, enforce explicit human review for mass changes over 10 products, and record non-sensitive audit evidence. Do not implement checkout/payment behavior or move ownership into FlipFlop, Bazos, warehouse, or auth.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented
