# Corrected Stock Reconciliation Plan - 2026-06-29

## Intent Preservation Chain

- Vision: Warehouse remains the single sellable stock authority for Catalog and all sales channels.
- Goal Impact: Prevent oversell by importing only current physical stock into Warehouse and requiring all channel publish/order flows to consume Warehouse availability.
- System: Allegro is a source candidate for current offer stock; Catalog stores product identity; Warehouse stores stock truth; FlipFlop, Allegro, Bazos, Aukro, Heureka consume Warehouse stock and must not treat local draft/order-history quantities as sellable truth.
- Feature: Cross-channel stock authority and propagation.
- Task: Reconcile the corrected expectation of about 30 Allegro SKUs and one high-quantity warehouse item with live Alfares data, then define the safe implementation lane.
- Execution Plan: This document.
- Coding Prompt: See "Agent-ready workstreams".
- Code: No code change in this correction pass. Current evidence is read-only.
- Validation: Live read-only DB/API probes listed below.

## Corrected Owner Expectation

The owner corrected the earlier assumption: the expected shape is about 30 SKU, not about 500 items, and one SKU is expected to have about 300 units in the warehouse.

## Live Evidence Summary

### Warehouse

- Current Warehouse stock rows: 16 product IDs.
- Current Warehouse total quantity: 696.
- Current Warehouse maximum product quantity: 124.
- No Warehouse row currently has about 300 units.
- The target product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` has quantity 60, reserved 0, available 60.

### Catalog

- Catalog products: 42.
- Catalog `ALLEGRO-OFFER-*` products: 32.
- Non-Allegro Catalog products: 10.
- Catalog explains the "about 30 SKU" shape: all 32 Allegro products exist locally.
- Only 9 of the 32 Allegro products correspond to current Allegro API offers with Warehouse stock.
- The other 23 products are active Catalog rows tagged with order-history/source-quality markers such as `data-quality:order-line-item-only`, but they do not have current Warehouse stock rows.

### Allegro

- Allegro local projection has 32 offers:
  - 9 `syncSource=ALLEGRO_API`, `status=ACTIVE`, `publicationStatus=ACTIVE`, total stock 496.
  - 23 `syncSource=ORDER_HISTORY`, `status=ORDER_HISTORY_ONLY`, `publicationStatus=UNKNOWN`, total stock 0.
- `/sale/offers` across all configured account tokens returns exactly 9 current offers, total stock 496.
- `/sale/offers?publication.status=ACTIVE` returns 9.
- `/sale/offers?publication.status=INACTIVE`, `ENDED`, and `ACTIVATING` return 0.
- For the 23 order-history offer IDs:
  - `/sale/product-offers/{id}` returned 404 for every configured account token.
  - `/sale/offers/{id}` returned 403 for every configured account token.
  - No endpoint returned a stock value.
- Conclusion: the 23 order-history offers are product/order evidence only, not a current physical stock source through the configured Allegro API credentials.

### Channel Caches

- FlipFlop local product cache has 7 tracked products, total stock 200, max stock 55.
- Bazos has 2 draft rows, both `stockQuantity=0`.
- Aukro has no local offer rows.
- Heureka local offer table is not present in the current DB.
- Suppliers has import-job evidence only for stock-related persistence, mostly synthetic traceability runs; no product stock table with about 30 SKUs or a 300-unit row was found.

## Current Risk

The live system currently has 32 Allegro-shaped Catalog products, but only 9 are stock-authoritative. The other 23 should not be presented to sales channels as sellable unless a current stock source is found. Their local Catalog `isActive=true` state is misleading unless downstream views and channel selectors explicitly gate on Warehouse availability and source quality.

## Implementation Decision

Do not import stock for the 23 `ORDER_HISTORY_ONLY` products from Allegro order lines. Order-line quantity is historical demand, not current stock.

Do not fabricate the expected about-300 unit SKU. It is absent from the checked live Warehouse, Allegro current offers, FlipFlop, Bazos, Aukro, Heureka, and Suppliers evidence.

Proceed with a fail-closed implementation:

1. Keep Warehouse as the only sellable stock source.
2. Classify `ORDER_HISTORY_ONLY` Allegro/Catalog products as not stock-authoritative.
3. Exclude products without positive Warehouse availability from sales-channel publish candidates.
4. Show zero/unavailable stock in Catalog views when Warehouse has no route/stock row.
5. Add an operator audit report that lists:
   - 9 current stock-authoritative Allegro SKUs.
   - 23 order-history-only Allegro SKUs with no current stock source.
   - any Catalog active products without Warehouse availability.
6. Add a reconciliation input hook for a future owner-confirmed physical stock file/source if the about-300 SKU exists outside the checked systems.

## Parallel Execution Plan

### Workstream A - Catalog Visibility Gate

- Status: ready now.
- Owner role: Catalog frontend/backend worker.
- Objective: Ensure Catalog product detail and channel candidate lists surface Warehouse availability and fail closed when no Warehouse row exists.
- Allowed files: `catalog-microservice` product read controllers/services, frontend product detail/channel components, focused tests/docs.
- Forbidden files: Warehouse stock mutation code, Allegro import mutation code, shared auth secrets.
- Dependencies: none.
- Validation evidence: product with Warehouse stock shows 60; order-history-only product shows zero/unavailable and is not channel-publishable.
- Handoff: Report exact routes and screenshots/API payload snippets.

### Workstream B - Allegro Import Classification

- Status: ready now, but avoid dirty file conflicts in `allegro-service`.
- Owner role: Allegro import worker.
- Objective: Ensure import scripts never treat order history as current stock and persist source-quality/status fields consistently.
- Allowed files: Allegro import scripts/services and tests only after checking current dirty files.
- Forbidden files: Warehouse mutation endpoints, unrelated operation/order-forwarding dirty files.
- Dependencies: dirty worktree ownership must be inspected before editing.
- Validation evidence: current offers import stock from `/sale/product-offers/{id}.stock.available`; order-history rows retain stock 0 and `ORDER_HISTORY_ONLY`.
- Handoff: Include dry-run output showing 9 current offers and 23 order-history-only rows.

### Workstream C - Channel Fail-Closed Gates

- Status: dependency-gated by Workstream A availability contract.
- Owner role: channel integration worker.
- Objective: Confirm Bazos, Aukro, Heureka, FlipFlop, and Allegro publish/order flows consume Warehouse availability and block when unavailable.
- Allowed files: channel policy/publish candidate services and focused tests.
- Forbidden files: shared Warehouse schema, live marketplace mutation code, secrets.
- Dependencies: Catalog/Warehouse availability response contract.
- Validation evidence: each channel blocks a no-Warehouse-stock Catalog product and allows a known stocked product within available quantity.

### Workstream D - Physical Source Discovery

- Status: blocked.
- Owner role: operator/data-source worker.
- Objective: Locate the owner-expected about-300 unit SKU if it exists outside the checked live systems.
- Allowed sources: owner-provided export, warehouse sheet/file, real supplier payload, or Allegro UI evidence with account/session proof.
- Forbidden actions: guessing quantities, using order-line demand as stock, mutating Warehouse without approved source evidence.
- Dependencies: [MISSING: authoritative source for the about-300 unit SKU].
- Validation evidence: source artifact with SKU/product identity, current physical quantity, timestamp, and source owner.

## Merge Order

1. Workstream A.
2. Workstream B, after dirty-file ownership is clear.
3. Workstream C.
4. Workstream D only after source evidence exists; apply Warehouse stock mutation through an idempotent dry-run/apply path.

## Current Blocker

[MISSING: authoritative live source for the expected about-300 unit SKU]. Current configured Allegro API credentials and checked Alfares services do not expose it.
