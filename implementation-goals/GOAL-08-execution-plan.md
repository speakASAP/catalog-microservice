# EP-CATALOG-08: Data Import And Reconciliation

```yaml
id: EP-CATALOG-08
status: active
source_goal: implementation-goals/GOAL-08-data-import-reconciliation.md
owner: orchestrator
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
branch: feature/catalog-goal-08-data-import-reconciliation
```

## Metadata

Goal 8 starts from the clean source-complete Goal 13 checkpoint `9c01e0a`.

## Upstream Traceability

- `BUSINESS.md`: Catalog is the product truth source for SKU, descriptions, categories, pricing, and media.
- `SYSTEM.md`: Catalog owns product, category, media, and pricing entities.
- `docs/orchestrator/INTENT.md`: preserve Catalog ownership while keeping other service boundaries intact.
- `implementation-goals/GOAL-08-data-import-reconciliation.md`: imports must be dry-run capable and non-destructive.

## Goal Impact

Goal 8 gives operators an import preflight that identifies creates, updates, duplicates, missing fields, pricing issues, invalid media references, and category mismatches before any write path is used.

## Project Invariants

- `CAT-INV-001`: Import reconciliation reports against Catalog product truth fields.
- `CAT-INV-006`: No delete action is exposed.
- `CAT-INV-007`: Pricing row count over 10 is reported as requiring human review.
- `CAT-INV-008`: Inline media/blob references are rejected in dry-run output.
- `CAT-INV-010`: The dry-run endpoint is protected and emits actor/source audit context.

## Sensitive-Data Handling

Use synthetic unit-test rows only. Do not include secrets, production customer data, raw supplier payloads, media blobs, or runtime tokens in tests, reports, logs, or prompts.

## Contract/Schema Impact

Additive API only:

```text
POST /api/imports/reconciliation/dry-run
```

No database schema changes. No writes are performed by the dry-run implementation.

## Scope

- Add a protected import reconciliation module.
- Accept product import rows with SKU, title, EAN, category refs, media URL refs, and pricing rows.
- Return per-row create/update/skip decisions and exact issues.
- Return totals and mass-pricing human-review marker.

## Non-Goals

- Do not write imported products.
- Do not delete or archive products.
- Do not upload media files or store inline media.
- Do not bypass pricing mass-review controls.
- Do not run production import payloads.

## Files To Inspect

- `src/products/products.service.ts`
- `src/products/product.entity.ts`
- `src/categories/category.entity.ts`
- `src/media/media.entity.ts`
- `src/pricing/product-pricing.entity.ts`
- `src/pricing/pricing.service.ts`
- `src/auth/catalog-auth.guard.ts`
- `src/logger/logger.service.ts`

## Files To Create

- `src/import-reconciliation/import-reconciliation.module.ts`
- `src/import-reconciliation/import-reconciliation.controller.ts`
- `src/import-reconciliation/import-reconciliation.service.ts`
- `src/import-reconciliation/import-reconciliation.types.ts`
- `src/import-reconciliation/import-reconciliation.service.spec.ts`
- `reports/validation/GOAL-08-pre-coding-gate.md`
- `reports/validation/VAL-GOAL-08-data-import-reconciliation.md`

## Files To Modify

- `src/app.module.ts`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`

## Files That Must Not Be Modified

- `BUSINESS.md`
- `SYSTEM.md`
- `00_constitution/`
- production secret/config values

## Implementation Steps

1. Create a module with protected dry-run controller.
2. Build reconciliation service using read-only TypeORM repository calls.
3. Detect payload duplicates, existing SKU/EAN conflicts, unknown categories, missing EAN/media/category/pricing/title/SKU, invalid media refs, and invalid pricing rows.
4. Return non-destructive report totals and per-row issue details.
5. Add focused unit tests for create, update, blocking issues, mass pricing review, and empty payload rejection.

## Test Plan

- `npm test -- --runInBand src/import-reconciliation/import-reconciliation.service.spec.ts`
- `npm test -- --runInBand`
- `npm run build`
- `git diff --check`

## Validation Plan

Validation passes when the focused test proves no write repositories are called, full Jest passes, build passes, and whitespace validation passes.

## Gate Commands

```bash
npm run build
npm test
git diff --check
```

## Documentation Updates

Update implementation state, orchestrator status, and validation report with compressed evidence.

## Rollback Plan

Revert the Goal 8 commit. No schema or production data migration is required.

## Agent Handoff Prompt

Implement Goal 8 as a protected dry-run reconciliation report only. Preserve Catalog as product truth, forbid destructive import actions, reject inline media references, and report pricing human-review requirements without writing data.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented
