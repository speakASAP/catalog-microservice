# GOAL-10 - Stock Origin Visibility Projection

Metadata:
- id: CAT-G10
- status: done
- owner: catalog-owner
- created: 2026-06-13
- last_updated: 2026-06-13
- completeness_level: complete
- upstream: BUSINESS.md, SYSTEM.md, docs/IMPLEMENTATION_STATE.md, /home/ssf/Documents/Github/warehouse-microservice/implementation-goals/GOAL-11-stock-origin-visibility.md, /home/ssf/Documents/Github/warehouse-microservice/docs/intent-preservation/validation-reports/VAL-WH-G11-T1.md
- downstream: implementation-goals/GOAL-10-execution-plan.md, reports/validation/GOAL-10-pre-coding-gate.md, reports/validation/VAL-GOAL-10-stock-origin-visibility.md

## Intent

Catalog should expose Warehouse-owned stock origin metadata to Catalog consumers so a sellable product can be understood as stocked in Alfares local warehouses, supplier warehouses, dropship warehouses, or a mix of origins. Catalog remains product truth and does not store or own stock quantities, reservations, movements, warehouse locations, or supplier credentials.

## Scope

- Extend Catalog Warehouse availability contract types with additive per-warehouse origin fields from Warehouse.
- Preserve and forward the fields in `POST /api/products/availability/batch`.
- Include those Warehouse-origin rows in `POST /api/products/projections/flipflop/batch` under `availability.warehouses`.
- Update contract documentation and focused Jest coverage.

## Non-Goals

- No Catalog database schema changes.
- No Catalog stock persistence.
- No Warehouse mutation or production stock changes.
- No Suppliers source changes in this slice.
- No FlipFlop checkout, cart, order, payment, or UX ownership moves into Catalog.
- No deployment without explicit owner approval.

## Acceptance Criteria

- Catalog availability bridge preserves warehouseCode, warehouseName, warehouseType, and supplierId from Warehouse rows.
- FlipFlop projection availability includes Warehouse-sourced per-warehouse rows with origin metadata.
- Existing total availability and stockQuantity behavior remains unchanged.
- Tests, build, and diff check pass.
