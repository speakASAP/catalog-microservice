# EP-CATALOG-06: FlipFlop Catalog Projection

```yaml
id: EP-CATALOG-06
status: planned
source_goal: implementation-goals/GOAL-06-flipflop-catalog-projection.md
owner: orchestrator
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: pre-coding-ready
```

## Metadata

Remote implementation repository: `alfares:/home/ssf/Documents/Github/catalog-microservice`.

Target branch: `feature/catalog-goal-06-flipflop-catalog-projection`.

Planning branch inspected: `feature/catalog-goal-06-flipflop-catalog-projection`.

Related consumer repository inspected for contract context only: `alfares:/home/ssf/Documents/Github/flipflop-service`.

## Upstream Traceability

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/MASTER_PROMPT.md`
- `docs/orchestrator/INTENT.md`
- `docs/orchestrator/GOALS.md`
- `docs/orchestrator/PLAN.md`
- `docs/orchestrator/STATUS.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/IMPLEMENTATION_ORCHESTRATOR.md`
- `docs/governance/PROJECT_INVARIANTS.md`
- `docs/process/OPERATIONAL_GATES.md`
- `docs/orchestration/branch-workflow.md`
- `implementation-goals/README.md`
- `implementation-goals/GOAL-06-flipflop-catalog-projection.md`
- Goal 2 product lifecycle/readiness evidence
- Goal 3 deterministic current-pricing evidence
- Goal 5 Catalog/Warehouse availability contract evidence
- FlipFlop reference: `flipflop-service/shared/clients/catalog-client.service.ts`
- FlipFlop reference: `flipflop-service/shared/clients/warehouse-client.service.ts`
- FlipFlop reference: `flipflop-service/services/frontend/lib/api/products.ts`
- FlipFlop reference: `flipflop-service/services/product-service/src/products/products.service.ts`

## Goal Impact

Goal 6 should make Catalog expose a stable projection contract for FlipFlop product consumption while keeping FlipFlop-specific storefront, cart, checkout, and UX behavior in FlipFlop.

Catalog already owns the underlying product truth, deterministic current pricing, channel readiness facts, and the Warehouse availability bridge. Goal 6 should compose those Catalog-owned contracts into a FlipFlop projection surface so FlipFlop can consume one documented Catalog contract instead of reinterpreting raw Catalog entities, current-price rows, and Warehouse availability separately.

## Project Invariants

- `CAT-INV-001`: Catalog remains the product identity and sellable-content authority.
- `CAT-INV-002`: Warehouse remains stock authority. FlipFlop projection may include Warehouse-sourced availability, but Catalog must not store or own stock truth.
- `CAT-INV-004`: FlipFlop owns storefront projection implementation, cart, checkout UX, and storefront-specific rendering. Catalog only exposes a product truth contract.
- `CAT-INV-009`: Existing product reads remain backward compatible. Goal 6 should add a new projection endpoint/module or docs, not mutate existing `GET /api/products` envelopes.

## Sensitive-Data Handling

Use synthetic product IDs, SKUs, and availability examples in tests and validation. Do not print service JWTs, runtime secrets, customer data, order data, supplier data, raw production product lists, or Warehouse location-sensitive data.

Runtime smoke may inspect response shape with bounded synthetic data or non-sensitive counts only. Any authorized production smoke that creates products, uses runtime tokens, or calls protected availability must require explicit approval and must not print token values.

## Current Contract Findings

Catalog currently exposes:

- `GET /api/products` and `GET /api/products/:id` with product entity fields and relations.
- `GET /api/pricing/product/:productId/current` with deterministic current price from Goal 3.
- `GET /api/products/:id/channel-readiness` with a FlipFlop readiness entry from Goal 4.
- `POST /api/products/availability/batch` with Warehouse-sourced availability from Goal 5.

FlipFlop currently expects product shapes with fields such as:

- `id`, `name`, `sku`, `description`, `brand`
- `price`
- `stockQuantity`
- `mainImageUrl`, `imageUrls` / `images`
- `categories`
- `seoData`, `tags`, timestamps

FlipFlop server-side code currently calls Catalog product and pricing endpoints and Warehouse stock endpoints separately. Some paths still rely on local `stockQuantity` and a Warehouse DB fallback. Goal 6 should not modify FlipFlop code, but the Catalog contract should be shaped so a later FlipFlop task can replace those N+1 and fallback paths.

## Proposed Catalog Projection Contract

Preferred additive endpoint:

```http
POST /api/products/projections/flipflop/batch
Authorization: Bearer <catalog-approved caller token> or approved internal service token
Content-Type: application/json

{
  "productIds": ["catalog-product-1"],
  "includeUnavailable": false
}
```

Optional list endpoint, if implementation stays simple and bounded:

```http
GET /api/products/projections/flipflop?limit=20&page=1&search=&categoryId=&includeUnavailable=false
```

Planned response envelope:

```ts
type FlipFlopCatalogProjectionResponse = {
  requestedProductIds: string[];
  invalidProductIds: string[];
  items: Array<{
    id: string;
    productId: string;
    sku: string;
    name: string;
    title: string;
    description: string | null;
    brand: string | null;
    manufacturer: string | null;
    lifecycle: "draft" | "active" | "archived" | "needs_review";
    isActive: boolean;
    categories: Array<{ id: string; name: string; slug?: string; path?: string }>;
    media: Array<{ id: string; type: string; url: string; thumbnailUrl?: string; altText?: string; isPrimary: boolean; position: number }>;
    mainImageUrl: string | null;
    imageUrls: string[];
    price: {
      amount: number;
      currency: string;
      basePrice: number;
      salePrice: number | null;
      priceType: string;
      source: "catalog_pricing";
    } | null;
    availability: {
      source: "warehouse";
      totalQuantity: number;
      totalReserved: number;
      totalAvailable: number;
    };
    stockQuantity: number;
    readiness: {
      channel: "flipflop";
      ready: boolean;
      status: string;
      missingFields: string[];
    };
    seoData: Record<string, unknown> | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  }>;
};
```

Compatibility aliases `name`, `price.amount`, and `stockQuantity` are allowed only as projection fields for FlipFlop compatibility. They must be documented as mapped values:

- `name` = Catalog `title`.
- `price.amount` = deterministic current sale price when present, otherwise base price.
- `stockQuantity` = Warehouse `totalAvailable`, with `availability.source: "warehouse"`.

## Scope

- Document FlipFlop projection contract in Catalog.
- Add additive Catalog projection endpoint/module if implementation proceeds.
- Compose product identity/content, categories, media, deterministic current price, FlipFlop readiness, and Warehouse-sourced availability.
- Preserve existing product read envelopes.
- Keep availability batch-based; no per-product Warehouse N+1 calls.
- Add focused tests for field mapping, current-price mapping, availability mapping, readiness mapping, invalid IDs, and ownership boundaries.
- Record validation evidence in `reports/validation/`.

## Non-Goals

- Do not implement FlipFlop frontend, cart, checkout, product-service, or API gateway changes in this Catalog goal.
- Do not move storefront UX, checkout, cart, payment, or order behavior into Catalog.
- Do not store stock quantity or Warehouse rows in Catalog.
- Do not query Warehouse directly from FlipFlop in this Catalog task.
- Do not change existing public product response envelopes unless a separate compatibility decision is approved.
- Do not deploy production changes without explicit owner approval.

## Files To Inspect

- `src/products/products.controller.ts`
- `src/products/products.service.ts`
- `src/products/product.entity.ts`
- `src/pricing/pricing.service.ts`
- `src/pricing/product-pricing.entity.ts`
- `src/channel-readiness/channel-readiness.service.ts`
- `src/channel-readiness/channel-readiness.types.ts`
- `src/warehouse-availability/warehouse-availability.service.ts`
- `src/warehouse-availability/warehouse-availability.types.ts`
- `src/app.module.ts`
- FlipFlop reference: `shared/clients/catalog-client.service.ts`
- FlipFlop reference: `shared/clients/warehouse-client.service.ts`
- FlipFlop reference: `services/product-service/src/products/products.service.ts`
- FlipFlop reference: `services/frontend/lib/api/products.ts`

## Files To Create

Preferred source layout:

- `src/flipflop-projection/flipflop-projection.types.ts`
- `src/flipflop-projection/flipflop-projection.service.ts`
- `src/flipflop-projection/flipflop-projection.controller.ts`
- `src/flipflop-projection/flipflop-projection.module.ts`
- `src/flipflop-projection/flipflop-projection.service.spec.ts`
- `docs/contracts/flipflop-catalog-projection.md`
- `reports/validation/VAL-GOAL-06-flipflop-catalog-projection.md`

## Files To Modify

- `src/app.module.ts` to import the projection module.
- `src/products/products.service.ts` only if batch product lookup helpers with relations are needed.
- `src/warehouse-availability/warehouse-availability.service.ts` only if a reusable internal helper is needed; preserve Goal 5 behavior.
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `docs/orchestrator/PLAN.md`
- `implementation-goals/GOAL-06-flipflop-catalog-projection.md` for status/checklist updates.

## Files That Must Not Be Modified

- FlipFlop repository source code unless the owner opens a separate FlipFlop task.
- Warehouse source code.
- Existing `GET /api/products` and `GET /api/products/:id` response shapes, except additive docs or tests.
- Auth, Orders, Payments, Bazos, Supplier, or API Gateway code.
- Runtime secrets, local `.env` files, generated frontend build output, or production data.

## Implementation Steps

1. Confirm branch `feature/catalog-goal-06-flipflop-catalog-projection` and clean or documented working tree.
2. Add typed request/response projection contracts.
3. Add a product batch lookup that includes categories, media, and pricing relations without changing existing reads.
4. Reuse deterministic current-price selection from `PricingService.getCurrentPrice`.
5. Reuse Goal 5 availability batch behavior for product IDs, with stock fields marked Warehouse-sourced.
6. Reuse or derive FlipFlop readiness from `ChannelReadinessService` and expose only readiness fields FlipFlop needs.
7. Map Catalog fields to FlipFlop compatibility fields without changing ownership: `title -> name`, current price -> `price`, Warehouse `totalAvailable -> stockQuantity`.
8. Reject unknown product IDs or report them explicitly before projection mapping.
9. Add Jest coverage for mapping and boundary behavior.
10. Run validation: `npm test -- --runInBand`, `npm run build`, and `git diff --check`.
11. Record validation evidence in Goal 6 validation report, orchestrator status, and implementation state.

## Test Plan

- Unit-test `title` maps to `name` while preserving `title`.
- Unit-test deterministic current sale/base price maps to projection price with `source: "catalog_pricing"`.
- Unit-test Warehouse `totalAvailable` maps to `stockQuantity` and `availability.source: "warehouse"`.
- Unit-test availability lookup is batched for multiple product IDs.
- Unit-test readiness maps the FlipFlop channel entry and does not claim Catalog owns storefront/checkout readiness.
- Unit-test invalid Catalog product IDs are rejected or returned in `invalidProductIds` before any projection is emitted.
- Unit-test archived/draft/unready products are excluded when `includeUnavailable` is false or clearly marked unready when included.
- Keep all fixtures synthetic.

## Validation Plan

Required before source closure:

```bash
npm test -- --runInBand
npm run build
git diff --check
```

Production smoke after deployment, only with owner approval:

- `GET /health` returns `200`.
- Projection endpoint rejects anonymous access if protected.
- Authorized synthetic smoke verifies a projected product shape without printing tokens or production product data.

## Gate Commands

Pre-coding planning gate for this artifact:

```bash
git status --short --branch
python3 -c "from pathlib import Path; files=[Path(p) for p in ['docs/orchestrator/GOALS.md','docs/orchestrator/PLAN.md','docs/orchestrator/STATUS.md','docs/IMPLEMENTATION_STATE.md','implementation-goals/GOAL-06-flipflop-catalog-projection.md','implementation-goals/GOAL-06-execution-plan.md']]; markers=[chr(91)+'MISSING:', chr(91)+'UNKNOWN:']; hits=[str(f) for f in files if f.exists() and any(m in f.read_text() for m in markers)]; print('missing_marker_hits=' + str(hits)); raise SystemExit(1 if hits else 0)"
git diff --check
```

## Documentation Updates

- Create `implementation-goals/GOAL-06-execution-plan.md`.
- Create `reports/validation/GOAL-06-pre-coding-gate.md`.
- Update `docs/orchestrator/PLAN.md` with the Goal 6 planning checkpoint.
- Update `docs/orchestrator/STATUS.md` with planning/pre-coding evidence.
- Update `docs/IMPLEMENTATION_STATE.md` with Goal 6 active planning state.

## Handoff Prompt

Implement Goal 6 source changes from `implementation-goals/GOAL-06-execution-plan.md`. Stay in Catalog only unless the owner explicitly opens a FlipFlop task. Preserve Catalog product truth, Warehouse stock ownership, FlipFlop storefront/checkout ownership, and existing product read compatibility.
