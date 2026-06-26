# Goal 17 - Product Marketplace Sales Statistics

```yaml
id: GOAL-CATALOG-17-PRODUCT-MARKETPLACE-SALES-STATISTICS
status: planned
owner: project owner
created: 2026-06-26
source_request: product admin page must show per-product sales statistics by connected marketplaces
source_page: https://catalog.alfares.cz/admin/products/c0de0000-0000-4000-8000-000000000011
```

## Vision

Catalog remains the product truth service and gives operators one product-centric view of how a catalog product performs across connected sales channels.

## Goal Impact

Operators can open any Catalog product and see the total sold count, revenue summary, and recent sales history split by marketplace: FlipFlop, Bazos, Allegro, and future channels. Current production values may be zero, but the contract must be real and product-specific.

## System Ownership Boundary

- Catalog owns product identity and the product admin page.
- Orders owns order, order item, order status, channel, channel account, quantity sold, and revenue truth.
- FlipFlop, Bazos, Allegro, Aukro, Heureka, and future channel services own channel ingestion, external order fetches, and forwarding external orders into Orders.
- Warehouse owns stock movements and fulfillment effects.
- Payments owns payment provider truth, payment status reconciliation, refunds, and provider identifiers.
- Catalog must not become the order source of truth, payment authority, stock owner, or channel order crawler.

## Feature

Add a protected read contract that lets Catalog request product-level sales aggregates from Orders and render the result in the Catalog admin product page.

Target UI block:

- total sales count for the product;
- total gross revenue in CZK and optionally source currency subtotals;
- per-marketplace rows for FlipFlop, Bazos, Allegro, Aukro, Heureka, and future channels;
- recent product sales history with order date, channel, quantity, bounded order reference, and status;
- explicit zero values when no sales exist;
- explicit `unavailable` channel status when a marketplace cannot supply order data yet.

## Task

Implement product marketplace sales statistics end to end as an additive, read-only feature.

## Acceptance Criteria

- Catalog product detail page shows a product-specific marketplace sales block for every product.
- Sales counts and revenue are returned by Orders or an Orders-owned read model, not computed from Catalog tables.
- Aggregation groups by canonical `productId` and `channel` from `orders.create.v1` order items.
- Channel adapters either forward orders into Orders with catalog product IDs or expose `[MISSING: channel order ingestion capability]` in the rollout report.
- Current no-sale products display zero totals, not blank or fake values.
- Protected admin/API endpoints do not expose raw customer data, payment data, addresses, secrets, tokens, or provider payloads.
- Public product reads remain backward compatible.
- No product deletion, order cancellation, refund, payment mutation, stock mutation, or channel publish action is introduced.

## Non-Goals

- Do not store order rows, order items, payment truth, or customer data in Catalog.
- Do not make Catalog poll marketplaces directly for orders.
- Do not infer sales from stock movements, listing status, Bazos drafts, or publish attempts.
- Do not expose raw order/customer/payment/provider data in the Catalog UI.
- Do not deploy production changes until validation and deployment-readiness evidence exist.

## Current Evidence

- Catalog currently has product detail, pricing/media management, Bazos draft/listing status, FlipFlop projection, and Warehouse availability contracts.
- Catalog does not currently expose product-level sales statistics or sales history.
- Orders is documented as the canonical order processing and lifecycle service and supports `orders.create.v1` from channels `flipflop`, `allegro`, `aukro`, `bazos`, and `heureka`.
- FlipFlop and marketplace services have Orders clients or order-forwarding intent, but each channel needs concrete verification for catalog product ID fidelity and runtime order ingestion completeness.
- `[MISSING: Orders product sales statistics endpoint]`
- `[MISSING: authenticated service-to-service contract from Catalog to Orders for product sales stats]`
- `[UNKNOWN: whether all live Allegro/Bazos/FlipFlop orders currently carry canonical Catalog product IDs]`

## Validation

Minimum validation before source completion:

```bash
git diff --check
npm run build
npm test -- --runInBand
cd services/frontend && npm run build
```

Additional validation after Orders contract exists:

```bash
npm run smoke:e2e
CATALOG_SMOKE_AUTHORIZED=true npm run smoke:e2e:authorized
```

Runtime validation must use synthetic or redacted order data only. Do not print customer data, payment data, addresses, raw provider payloads, bearer tokens, or secrets.

## Parallel Execution

Shared contract owner: Orders contract owner.
Integration owner: Catalog orchestrator.
Validation owner: final integration validator.
Merge order: Orders read contract -> channel adapter verification -> Catalog service bridge -> Catalog admin UI -> smoke/production deploy.

### Workstream A - Orders Product Sales Read Model

Status: ready now.
Owner role: Orders backend implementer.
Objective: add a protected read-only Orders endpoint for product sales aggregation.
Scope: `orders-microservice` only.
Allowed files: Orders service/controller/DTO/read-model tests/docs under `/home/ssf/Documents/Github/orders-microservice`.
Forbidden files: Catalog source, channel source, payment mutation flows, cancellation/refund flows, customer data rendering.
Expected output: `GET /api/orders/statistics/products/:productId` or equivalent protected endpoint returning totals, per-channel summaries, and bounded recent history.
Dependencies: existing Orders order/order_items schema and `orders.create.v1` channel fields.
Blockers: `[UNKNOWN: current order_items field names and indexes in live schema]`.
Validation evidence: unit tests for aggregates; build; auth rejection smoke; redacted sample response.
Handoff notes: response must use canonical `productId`, channel enum, bounded order reference, quantity, gross totals, currency, status, and orderedAt.

### Workstream B - Channel Adapter Fidelity Audit

Status: ready now.
Owner role: marketplace integration auditor.
Objective: verify FlipFlop, Bazos, Allegro, Aukro, and Heureka forward orders to Orders with canonical Catalog product IDs and channel names.
Scope: read-only first across channel services; source fixes only after audit plan is accepted.
Allowed files: channel service docs/tests/adapter code in their own repos.
Forbidden files: Catalog admin UI, Orders aggregate endpoint, payment provider code, stock mutation code.
Expected output: per-channel matrix: supports order ingestion yes/no, catalogProductId field source, external order id, channelAccountId, known gaps, required fixes.
Dependencies: Orders contract from Workstream A for final response expectations.
Blockers: marketplace APIs may not expose historical sales for all channels; mark as `[MISSING: ...]` instead of inventing.
Validation evidence: static adapter verification and, where safe, protected auth rejection or synthetic order tests.
Handoff notes: channels that cannot supply sales must return explicit unavailable status through Orders/Catalog, not fake zeros for historical imports.

### Workstream C - Catalog Orders Bridge

Status: dependency-gated.
Owner role: Catalog backend implementer.
Objective: add a read-only Catalog bridge endpoint for product sales stats after Orders contract is stable.
Scope: `catalog-microservice` backend only.
Allowed files: product controller/service, Orders client module, DTO/types, tests, contract docs.
Forbidden files: order persistence in Catalog, migrations creating order tables, payment/stock/channel publish code.
Expected output: protected `GET /api/products/:id/sales-statistics` that validates product existence and proxies bounded Orders aggregates.
Dependencies: Workstream A endpoint and service credential contract.
Blockers: `[MISSING: Catalog-to-Orders service token/env contract]`.
Validation evidence: unit tests for product existence, Orders timeout fallback, auth behavior, zero aggregate mapping.
Handoff notes: failure mode should show `unavailable` per channel or whole-source unavailable, not crash the product edit page.

### Workstream D - Catalog Admin Product UI

Status: dependency-gated; placeholder block exists with zero values until the API contract lands.
Owner role: Catalog frontend implementer.
Objective: render product-specific totals and sales history from `GET /api/products/:id/sales-statistics`.
Scope: Catalog frontend product detail page and typed API client.
Allowed files: `services/frontend/app/admin/products/[id]/page.tsx`, `services/frontend/lib/api/products.ts`, optional small component under `services/frontend/components/`.
Forbidden files: backend order aggregation, channel adapters, payment/stock mutations.
Expected output: Marketplace sales block with totals, per-channel cards, loading/error/empty states, and recent bounded history.
Dependencies: Workstream C response shape.
Blockers: none after Workstream C.
Validation evidence: `cd services/frontend && npm run build`; browser verification of product page with zero, loading, unavailable, and nonzero mocked states.
Handoff notes: keep UI copy operational and avoid raw customer/payment data.

### Workstream E - Final Integration And Runtime Smoke

Status: final integration.
Owner role: integration validator.
Objective: prove the end-to-end product page uses real Orders-owned statistics without breaking existing Catalog behavior.
Scope: Catalog plus Orders deployment gates and production-safe smokes.
Allowed files: validation reports/status docs only unless fixing integration defects.
Forbidden files: destructive order/product/stock/payment operations.
Expected output: validation report, status update, deployment evidence if approved, and product page smoke for `c0de0000-0000-4000-8000-000000000011` showing zeros or real totals from Orders.
Dependencies: A-D complete.
Blockers: owner approval for production deployment and any runtime credential changes.
Validation evidence: health checks, protected unauth smoke, authorized synthetic/read-only smoke, frontend build, screenshot if needed.
Handoff notes: if live marketplaces lack historical order ingestion, document the gap and leave channel status `unavailable` until ingestion is implemented.

## Coding Prompt

Implement Goal 17 as an additive, read-only product sales statistics feature. Preserve Catalog as product truth and Orders as order truth. Do not store orders or customer/payment data in Catalog. Start with the Orders aggregate read contract, verify channel adapter fidelity, then bridge Catalog to Orders and render the admin product page. Mark unavailable channel facts as `[MISSING: ...]` or `[UNKNOWN: ...]`. Validate with builds/tests and production-safe smokes before deployment.
