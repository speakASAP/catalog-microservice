# GOAL-11 - Warehouse Logistics Route Projection

Metadata:
- id: CAT-G11
- status: done
- owner: catalog-owner
- created: 2026-06-13
- last_updated: 2026-06-13
- completeness_level: complete

## Intent

Forward Warehouse-owned product logistics route plans through Catalog availability and FlipFlop projection without making Catalog a logistics authority.

## Scope

- Call Warehouse POST /api/warehouses/logistics/batch once for a product batch.
- Attach Warehouse logistics plans to Catalog availability items.
- Expose the same logistics object under FlipFlop projection availability.
- Keep stock totals and route semantics owned by Warehouse.

## Completion Evidence

- Catalog Warehouse bridge calls POST /api/warehouses/logistics/batch once per product batch.
- Catalog availability items include Warehouse-owned logistics plans.
- FlipFlop projection exposes logistics under availability.logistics.
- Validation passed: npm test -- --runInBand, npm run build, git diff --check.
