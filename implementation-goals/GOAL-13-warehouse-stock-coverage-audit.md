# GOAL-13 - Warehouse Stock Coverage Audit

Metadata:
- id: CAT-G13
- status: done
- owner: catalog-owner
- created: 2026-06-13
- last_updated: 2026-06-13
- completeness_level: complete

## Intent

Give operators a paginated Catalog audit that finds active goods missing mandatory Warehouse-backed stock coverage or reservable Warehouse logistics routes.

## Scope

- Add protected `GET /api/products/availability/coverage/audit`.
- Page through Catalog products using existing Catalog query semantics.
- Default the audit to active products because those are the goods expected to be sellable.
- Reuse the Warehouse-backed coverage read model for each page.
- Return Catalog pagination, normalized audit query, coverage totals, and per-product coverage diagnostics.

## Completion Evidence

- Audit endpoint defaults `isActive` to true.
- Audit endpoint supports requested inactive audits and comma-separated Warehouse filters.
- Empty Catalog pages return empty coverage without calling Warehouse.
- Validation passed: focused Warehouse availability spec, full Jest suite, `npm run build`, and `git diff --check`.

## Non-Goals

- No Catalog stock persistence.
- No direct Warehouse database access from Catalog.
- No Warehouse stock mutation or supplier reconciliation.
- No production deployment without owner approval.
