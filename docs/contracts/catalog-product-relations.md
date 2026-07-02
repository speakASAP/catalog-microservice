# Catalog Product Relations Contract

```yaml
id: CATALOG-PRODUCT-RELATIONS-CONTRACT
status: draft
owner: catalog-microservice
created: 2026-07-02
scope: Catalog-owned product relation metadata only
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog remains the product truth service and can expose bounded related-product and order-affinity metadata without owning Orders ingestion, checkout, or bundle selling.
- Goal Impact: downstream product-detail and operator surfaces can read deterministic relation scores from Catalog once a migration is approved.
- System: `catalog-microservice` owns `product_relations`; Orders, FlipFlop checkout, Warehouse stock, Payments, and marketplace services remain outside this foundation.
- Feature: protected `GET /api/products/:productId/related` returns relation rows ordered by score, confidence, then target product id.
- Task: add an additive TypeORM table/entity/service/controller and focused tests for manual/admin relation writes and protected reads.
- Execution Plan: see `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md`.
- Coding Prompt: implement Catalog-only relation metadata and mark ingestion/selling blockers as missing rather than inventing upstream contracts.
- Code: `src/product-relations/*`, `scripts/migrations/20260702_product_relation_scores.sql`, `src/app.module.ts`.
- Validation: source validation is recorded under `reports/validation/VAL-GOAL-24-product-relations.md`.

## Ownership Boundary

Catalog owns:

- Product-to-product relation metadata keyed by `sourceProductId`, `targetProductId`, `relationType`, and `source`.
- Relation scores, confidence, provenance, evidence metadata, and deterministic read ordering.
- Protected read access through the existing Auth-backed `CatalogAuthGuard`.
- Admin/manual upsert for curated or imported relation rows.

Catalog does not own:

- Orders event ingestion or order-line affinity calculation.
- Checkout bundle construction, cart discounts, or payment behavior.
- Warehouse stock, reservations, logistics routes, or fulfillment.
- Channel-specific publication or marketplace compliance.

## API

### `GET /api/products/:productId/related`

Protected by `CatalogAuthGuard` with `catalog:authenticated`.

Optional query:

- `relationType`: lowercase token such as `related`, `order_affinity`, `substitute`, or `complementary`.

Response envelope:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceProductId": "uuid",
      "targetProductId": "uuid",
      "relationType": "order_affinity",
      "score": 12.5,
      "confidence": 0.75,
      "source": "manual",
      "evidence": {
        "reason": "operator-curated"
      },
      "createdAt": "2026-07-02T00:00:00.000Z",
      "updatedAt": "2026-07-02T00:00:00.000Z"
    }
  ]
}
```

Ordering is deterministic:

1. `score` descending.
2. `confidence` descending.
3. `targetProductId` ascending.

The source product must be visible through the current Catalog product-read scope. For non-admin human actors, target products that are not visible through the same scope are omitted from the result instead of leaking their ids.

### `PUT /api/products/:productId/related/:targetProductId`

Protected by `CatalogAuthGuard` and restricted to platform/catalog admin roles or internal Catalog service actors.

Body:

```json
{
  "relationType": "order_affinity",
  "score": 12.5,
  "confidence": 0.75,
  "source": "manual",
  "evidence": {
    "reason": "operator-curated"
  }
}
```

Validation:

- `sourceProductId` and `targetProductId` must differ.
- `relationType` and `source` must be lowercase tokens.
- `score` must be finite and non-negative.
- `confidence` defaults to `1` and must be finite between `0` and `1`.
- `evidence` defaults to `{}` and must be a JSON object.



### `POST /api/internal/product-relations/order-affinity/batch`

Protected by `CatalogAuthGuard` and restricted to platform/catalog admin roles or internal Catalog service actors.

This endpoint is the Catalog-owned write surface for Marketing-derived order affinity candidates. Catalog forces `relationType = order_affinity` and `source = marketing_order_affinity` server-side; callers cannot use it to create other relation types or sources.

Body:

```json
{
  "source": "marketing_order_affinity",
  "idempotencyKey": "marketing_order_affinity:2026-07-02T10:00:00Z:batch-001",
  "generatedAt": "2026-07-02T10:00:00.000Z",
  "items": [
    {
      "sourceProductId": "uuid",
      "targetProductId": "uuid",
      "score": 1,
      "confidence": 0.5,
      "evidence": {
        "sourceSystem": "marketing-microservice",
        "sourceEventType": "orders.order.created.v1",
        "candidateId": "non-sensitive-candidate-id"
      }
    }
  ]
}
```

Response returns per-item statuses: `upserted`, `updated`, or `failed`, plus aggregate counts. Invalid items do not abort the whole batch after root payload validation succeeds.

First version semantics:

- Upsert only.
- No deletion or pruning of missing rows.
- No live backfill trigger.
- No marketplace publication.
- No bundle SKU, checkout, warehouse, payment, or free-shipping mutation.

## Blockers

- `[MISSING: approved Marketing-to-Catalog service role beyond current internal Catalog service-token role]`
- `[MISSING: runtime deploy and protected smoke for internal order-affinity batch endpoint]`
- `[MISSING: bundle checkout contract owned by FlipFlop/Orders/Payments]`
- `[MISSING: runtime backfill source for historical order-affinity scores]`
