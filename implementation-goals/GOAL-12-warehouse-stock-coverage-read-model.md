# GOAL-12 - Warehouse Stock Coverage Read Model

Metadata:
- id: CAT-G12
- status: done
- owner: catalog-owner
- created: 2026-06-13
- last_updated: 2026-06-13
- completeness_level: complete

## Intent

Expose a Catalog read model that audits whether requested Catalog goods have mandatory Warehouse-backed stock coverage and a reservable Warehouse-owned logistics route.

## Scope

- Add a protected `POST /api/products/availability/coverage` endpoint.
- Reuse the existing Catalog-to-Warehouse availability and batch logistics bridge.
- Classify goods as `local_stock`, `supplier_stock`, `dropship_stock`, `mixed_stock`, or `out_of_stock`.
- Mark products as covered only when Warehouse reports available stock and at least one reservable logistics route.
- Preserve Warehouse ownership of stock, warehouse classification, reservations, and logistics route semantics.

## Completion Evidence

- Coverage endpoint returns totals and per-product coverage diagnostics.
- Missing stock is reported as `coverageStatus: "missing_stock"` with `sellableWithWarehouse: false`.
- Available stock without a reservable route is reported as `coverageStatus: "missing_route"` with `sellableWithWarehouse: false`.
- Validation passed: `npm test -- --runInBand`, `npm run build`, and `git diff --check`.

## Non-Goals

- No Catalog stock persistence.
- No direct Warehouse database access from Catalog.
- No stock mutation or supplier reconciliation from Catalog.
- No production deployment without owner approval.
