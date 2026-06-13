# EP-CATALOG-09: End-To-End Catalog Smoke Tests

```yaml
id: EP-CATALOG-09
status: active
source_goal: implementation-goals/GOAL-09-end-to-end-smoke-tests.md
owner: orchestrator
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
branch: feature/catalog-goal-09-end-to-end-smoke-tests
```

## Metadata

Goal 9 starts from the clean Goal 8 checkpoint `d5e82dc`.

## Upstream Traceability

- `BUSINESS.md`: Catalog is product truth for SKU, descriptions, categories, pricing, and media.
- `SYSTEM.md`: Catalog production endpoint is `https://catalog.alfares.cz`.
- `implementation-goals/GOAL-09-end-to-end-smoke-tests.md`: add smoke checks for health, reads, pricing, media, and protected mutation rejection.
- `docs/governance/PROJECT_INVARIANTS.md`: preserve public read compatibility and protected mutation behavior.

## Goal Impact

Goal 9 gives operators a repeatable smoke command that identifies which Catalog contract is broken without requiring production mutations or credentials by default.

## Project Invariants

- `CAT-INV-001`: Smoke validates Catalog product-truth read surfaces.
- `CAT-INV-003`: Smoke validates anonymous protected endpoints reject without making Catalog an identity authority.
- `CAT-INV-006`: Smoke performs no hard delete.
- `CAT-INV-007`: Smoke performs no pricing write.
- `CAT-INV-008`: Smoke performs no media upload or inline media write.
- `CAT-INV-009`: Smoke checks public product read envelopes.
- `CAT-INV-010`: Smoke checks mutation/projection contracts reject anonymous writes.

## Sensitive-Data Handling

Default smoke uses anonymous requests only. It prints endpoint statuses, selected product ID, counts, and contract names. It does not print JWTs, secrets, customer data, supplier payloads, raw production product lists, or response bodies.

## Contract/Schema Impact

No API or database schema change. Adds local operator tooling:

```bash
npm run smoke:e2e
```

## Scope

- Add `scripts/catalog-smoke.js`.
- Add npm `smoke:e2e` alias.
- Check health, product search, optional product detail, current pricing, media, unauthorized product/category mutation rejection, and protected integration contract rejection.
- Make failures name the broken contract.

## Non-Goals

- Do not deploy.
- Do not run authorized production mutations.
- Do not require credentials by default.
- Do not modify other services.

## Files To Inspect

- `package.json`
- `src/main.ts`
- `src/products/products.controller.ts`
- `src/pricing/pricing.controller.ts`
- `src/media/media.controller.ts`
- `src/warehouse-availability/warehouse-availability.controller.ts`
- `src/flipflop-projection/flipflop-projection.controller.ts`

## Files To Create

- `scripts/catalog-smoke.js`
- `implementation-goals/GOAL-09-execution-plan.md`
- `reports/validation/GOAL-09-pre-coding-gate.md`
- `reports/validation/VAL-GOAL-09-end-to-end-smoke-tests.md`

## Files To Modify

- `package.json`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`

## Files That Must Not Be Modified

- `BUSINESS.md`
- `SYSTEM.md`
- production secrets/configuration

## Implementation Steps

1. Add the smoke script with `CATALOG_SMOKE_BASE_URL` and optional `CATALOG_SMOKE_PRODUCT_ID`.
2. Validate health and public product search.
3. Use the configured or first listed product ID for detail, pricing, media, and Bazos route checks when available.
4. Prove protected anonymous mutation/projection endpoints return 401.
5. Return structured JSON with pass/fail/skip by contract and nonzero exit code on failures.

## Test Plan

- `npm run smoke:e2e`
- `npm test -- --runInBand`
- `npm run build`
- `git diff --check`

## Validation Plan

Validation passes when the smoke script succeeds against the configured safe target, Jest/build pass, and the validation report records any skipped checks.

## Gate Commands

```bash
npm run smoke:e2e
npm test -- --runInBand
npm run build
git diff --check
```

## Documentation Updates

Update implementation state, orchestrator status, and Goal 9 validation report.

## Rollback Plan

Revert the Goal 9 commit. No schema, deployment, or production data rollback is required.

## Agent Handoff Prompt

Implement Goal 9 as a non-destructive smoke-test command. The default run must not require credentials, must not perform production mutations, and must clearly name failed contracts.

## Completion Checklist

- [ ] Implementation complete
- [ ] Smoke run complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
