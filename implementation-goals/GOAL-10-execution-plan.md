# GOAL-10 Execution Plan - Stock Origin Visibility Projection

Metadata:
- id: CAT-G10-EP
- status: validated
- goal_id: CAT-G10
- created: 2026-06-13
- last_updated: 2026-06-13
- completeness_level: complete

## Upstream Traceability

- implementation-goals/GOAL-10-stock-origin-visibility.md
- Warehouse WH-G11 validation report: /home/ssf/Documents/Github/warehouse-microservice/docs/intent-preservation/validation-reports/VAL-WH-G11-T1.md

## Goal Impact

This plan makes Catalog projections more useful for operators and storefront consumers by showing whether product stock originates from local physical warehouses or supplier/dropship warehouses, while preserving Warehouse as stock authority.

## Project Invariants

- Catalog owns product identity, sellable content, pricing, media, readiness, and projections.
- Warehouse owns stock quantities, reservations, movements, warehouse locations, and warehouse-origin metadata.
- Suppliers owns supplier integrations, credential references, validated import jobs, and idempotency.
- Catalog must not persist stock or supplier credentials.

## Sensitive-Data Handling

No secrets, tokens, raw supplier payloads, customer data, or production stock samples are used. `supplierId` is a Warehouse reference only and does not expose supplier credentials.

## Contract Validation Plan

Additive fields only. Existing availability totals, SKU enrichment, `source: "warehouse"`, and `stockQuantity` stay unchanged. New `availability.warehouses[]` projection rows mirror the Catalog availability bridge rows.

## Replay/Determinism Plan

Read-only projection mapping. No mutations, events, idempotency, or retries are changed.

## Scope

- src/warehouse-availability/warehouse-availability.types.ts
- src/warehouse-availability/warehouse-availability.service.ts
- src/warehouse-availability/warehouse-availability.service.spec.ts
- src/flipflop-projection/flipflop-projection.types.ts
- src/flipflop-projection/flipflop-projection.service.ts
- src/flipflop-projection/flipflop-projection.service.spec.ts
- docs/contracts/flipflop-catalog-projection.md
- docs/orchestrator/STATUS.md
- docs/IMPLEMENTATION_STATE.md

## Non-Goals

No Catalog schema changes, no Warehouse write client, no Suppliers adapter, no production deployment, no runtime token printing.

## Files To Inspect

- src/warehouse-availability/warehouse-availability.types.ts
- src/warehouse-availability/warehouse-availability.service.ts
- src/flipflop-projection/flipflop-projection.types.ts
- src/flipflop-projection/flipflop-projection.service.ts
- existing focused specs

## Files To Create

- implementation-goals/GOAL-10-stock-origin-visibility.md
- implementation-goals/GOAL-10-execution-plan.md
- reports/validation/GOAL-10-pre-coding-gate.md
- reports/validation/VAL-GOAL-10-stock-origin-visibility.md

## Files To Modify

- src/warehouse-availability/warehouse-availability.types.ts
- src/warehouse-availability/warehouse-availability.service.ts
- src/warehouse-availability/warehouse-availability.service.spec.ts
- src/flipflop-projection/flipflop-projection.types.ts
- src/flipflop-projection/flipflop-projection.service.ts
- src/flipflop-projection/flipflop-projection.service.spec.ts
- docs/contracts/flipflop-catalog-projection.md
- docs/orchestrator/STATUS.md
- docs/IMPLEMENTATION_STATE.md

## Files That Must Not Be Modified

- BUSINESS.md
- Production secrets or environment files
- Warehouse and Suppliers repositories in this Catalog slice

## Implementation Steps

1. Add optional origin fields to Catalog Warehouse availability row types.
2. Preserve those fields when mapping Warehouse dependency responses.
3. Add `warehouses` to FlipFlop projection availability type and mapper.
4. Update focused tests for availability bridge and FlipFlop projection.
5. Update contract docs and validation report.
6. Run npm test -- --runInBand, npm run build, and git diff --check.

## Test Plan

Focused Jest coverage should prove the Catalog bridge preserves origin fields and the FlipFlop projection includes them in `availability.warehouses` without changing `stockQuantity`.

## Validation Plan

- npm test -- --runInBand
- npm run build
- git diff --check

## Rollback Plan

Revert CAT-G10 source/docs changes. No migration or data rollback is required.

## Agent Handoff Prompt

Implement CAT-G10 exactly as scoped: propagate Warehouse-owned origin metadata from Catalog availability into FlipFlop projection availability, preserve existing totals and boundaries, update docs, and validate. Do not deploy.
