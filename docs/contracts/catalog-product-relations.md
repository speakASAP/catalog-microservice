# Catalog Product Relations Contract

```yaml
id: CATALOG-PRODUCT-RELATIONS-CONTRACT
status: runtime-deployed-contract
owner: catalog-microservice
created: 2026-07-02
scope: Catalog-owned product relation metadata only
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog remains the product truth service and can expose bounded related-product and order-affinity metadata without owning Orders ingestion, checkout, or bundle selling.
- Goal Impact: downstream product-detail and operator surfaces can read deterministic relation scores and read-only bundle candidates from Catalog while cross-service bundle selling remains explicitly gated.
- System: `catalog-microservice` owns `product_relations`; Orders, FlipFlop checkout, Warehouse stock, Payments, and marketplace services remain outside this foundation.
- Feature: protected related-products, read-only bundle-candidates, and internal Marketing-owned `order_affinity` batch ingestion surfaces.
- Task: keep Catalog relation APIs deterministic and fail-closed while documenting the proven Orders/Marketing replay path and unresolved bundle checkout decisions.
- Execution Plan: see `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md`.
- Coding Prompt: preserve Catalog-only relation metadata; mark ingestion, replay, and selling blockers as `[MISSING: ...]` or `[UNKNOWN: ...]` instead of inventing upstream contracts.
- Code: `src/product-relations/*`, `scripts/migrations/20260702_product_relation_scores.sql`, `src/app.module.ts`.
- Validation: source validation is recorded under `reports/validation/VAL-GOAL-24-product-relations.md` and the 2026-07-03 contract refresh under `reports/validation/VAL-GOAL-24-bundle-order-affinity-contract.md`.

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

## Current Ecosystem Status

Order-affinity replay is no longer missing at the source-contract level:

- Orders documents `orders.order.created.v1` `payload.items[]` as the bounded product-affinity snapshot.
- Orders exposes internal replay candidates for paid, non-cancelled orders with at least two unique product ids.
- Marketing builds directed `order_affinity` candidates from replayed created-event envelopes.
- Marketing can publish batches to Catalog only through the Catalog internal batch endpoint when enabled and configured.
- Catalog forces `relationType=order_affinity` and `source=marketing_order_affinity` server-side.

Live replay remains dependency-gated:

- The read-only Marketing dry-run returned `inputRecords=0`, `acceptedCreatedEvents=0`, `aggregatePairs=0`, and `candidates=[]`.
- A non-empty central Orders publish run requires qualifying historical paid multi-product Orders rows, an owner-reviewed mutation window, and stale-row pruning/replacement semantics.
- Allegro one-time marketplace evidence has been published through the existing Marketing/Catalog path, but durable scheduling is now governed by `docs/contracts/catalog-marketplace-affinity-backfill.md`.
- Marketplace-owned replay endpoints remain implementation-gated until Marketing accepts marketplace source envelopes without requiring temporary Orders-compatible `/tmp` exports.

Bundle checkout remains outside this contract:

- FlipFlop has a local bundle-intent checkout path that stores/submits bundle identifiers, recomputes eligibility and savings server-side, creates a central Orders UUID before payment, and sends Payments the final server total.
- That FlipFlop-local path is not an ecosystem Catalog bundle aggregate, bundle SKU, Warehouse reservation, Orders bundle identity, or Payments pricing contract.

## Bundle Selling Decision Gate

Before any service implements real ecosystem bundle selling, owners must resolve these contracts:

- `[MISSING: Catalog bundle ownership decision: read-only candidate, standalone bundle aggregate, or product-like SKU]`
- `[MISSING: Orders bundle create-order contract and bundle identity representation beyond normal line items]`
- `[MISSING: Warehouse bundle reservation contract for stock and fulfillment effects]`
- `[MISSING: Payments metadata policy for bundle/free-shipping evidence without making Payments pricing truth]`
- `[MISSING: approved real checkout smoke scope]`
- `[MISSING: explicit discount/price presentation policy for bundle candidates]`

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





### `GET /api/products/:productId/bundle-candidates`

Read-only Catalog projection that derives candidate two-product bundles from existing `order_affinity` product relations. This endpoint does not create bundle SKUs, discounts, carts, checkout records, stock reservations, marketplace listings, or payment totals.

Query:

- `limit`: optional integer from `1` to `10`; default `3`.
- `freeShippingThreshold`: optional non-negative number. When present, Catalog returns a suggested bundle display price at least equal to the threshold and a `topUpAmount` when current product prices are below that threshold.
- `currency`: optional three-letter uppercase currency filter/check.

Response shape:

```json
{
  "success": true,
  "data": {
    "sourceProductId": "uuid",
    "relationType": "order_affinity",
    "source": "marketing_order_affinity",
    "freeShippingThreshold": 1000,
    "candidates": [
      {
        "candidateId": "order_affinity:<sourceProductId>:<targetProductId>",
        "productIds": ["uuid", "uuid"],
        "items": [
          { "productId": "uuid", "sku": "SKU", "title": "Title", "price": { "amount": 600, "currency": "CZK", "source": "base" } }
        ],
        "relation": { "relationId": "uuid", "relationType": "order_affinity", "source": "marketing_order_affinity", "score": 1, "confidence": 0.5 },
        "pricing": { "currency": "CZK", "subtotal": 950, "freeShippingThreshold": 1000, "suggestedBundlePrice": 1000, "topUpAmount": 50, "freeShippingEligible": true, "blockers": [] }
      }
    ],
    "blockers": []
  }
}
```

If `freeShippingThreshold` is missing, Catalog still returns candidates but includes `[MISSING: free-shipping threshold contract]` in the response blockers and in each candidate pricing blocker. Checkout, Orders, Payments, and marketplace services remain responsible for authoritative selling rules and totals.

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

Batch endpoint semantics:

- Upsert only.
- No deletion or pruning of missing rows.
- No live backfill trigger.
- No marketplace publication.
- No bundle SKU, checkout, warehouse, payment, or free-shipping mutation.

### `POST /api/internal/product-relations/order-affinity/replace-window`

Protected by `CatalogAuthGuard` and restricted to platform/catalog admin roles or internal Catalog service actors.

This endpoint is the Catalog-owned replacement surface for Marketing-derived complete source/window snapshots. Catalog still forces `relationType = order_affinity` and `source = marketing_order_affinity` server-side. It upserts the supplied candidates, stamps each row with `evidence.orderAffinityWindow`, and prunes only omitted rows whose existing evidence has the exact same `sourceOwner`, `channel`, `windowStart`, `windowEnd`, and `runId`.

Body:

```json
{
  "source": "marketing_order_affinity",
  "idempotencyKey": "marketing_order_affinity:allegro-service:allegro:2026-07-01:2026-07-03:marketplace-affinity-allegro-20260703:1",
  "generatedAt": "2026-07-03T10:00:00.000Z",
  "sourceOwner": "allegro-service",
  "channel": "allegro",
  "windowStart": "2026-07-01T00:00:00.000Z",
  "windowEnd": "2026-07-03T00:00:00.000Z",
  "runId": "marketplace-affinity-allegro-20260703",
  "completeSnapshot": true,
  "items": [
    {
      "sourceProductId": "uuid",
      "targetProductId": "uuid",
      "score": 1,
      "confidence": 0.5,
      "evidence": {
        "sourceSystem": "marketing-microservice",
        "candidateId": "non-sensitive-candidate-id"
      }
    }
  ]
}
```

Response extends the batch aggregate with `window`, `completeSnapshot: true`, `summary.pruned`, and `prunedRelations[]`.

Fail-closed rules:

- `completeSnapshot` must be exactly `true`.
- `sourceOwner` and `channel` must be lowercase source tokens.
- `windowStart` and `windowEnd` must be ISO timestamps and `windowEnd` must be after `windowStart`.
- `items` may be empty only on this replacement endpoint, allowing a complete empty snapshot to prune rows for the exact same window metadata.
- Catalog never prunes manual, curated, non-Marketing, non-window, checkout, product, price, stock, payment, marketplace listing, or rows whose `evidence.orderAffinityWindow` does not exactly match this request.
- This endpoint does not prove Marketing ledger completeness, marketplace replay completeness, or publish-window approval. The approved retention policy permits only exact source/window replacement; it does not permit time-based deletion, score decay, manual/non-window pruning, or legacy-row archival.

## Stale-Affinity Retention And Decay Policy

Catalog accepts the conservative Goal 24 policy for `marketing_order_affinity` rows:

- Replace only exact complete source/window snapshots through `POST /api/internal/product-relations/order-affinity/replace-window`.
- Prune only omitted rows whose existing `evidence.orderAffinityWindow` exactly matches the incoming `sourceOwner`, `channel`, `windowStart`, `windowEnd`, and `runId`.
- Retain legacy rows that do not carry matching window evidence; do not infer staleness from age, source name, channel, score, confidence, or absence from a different run.
- Do not perform time-based deletion, score decay, confidence decay, standalone prune-window cleanup, manual/non-window pruning, or archival without a new owner-approved contract.
- Never prune manual, curated, non-Marketing, checkout, product, price, stock, payment, marketplace listing, or unrelated relation rows.

This policy resolves the previous broad retention/decay blocker while preserving Catalog boundaries. Remaining scheduled replacement gates are Marketing durable ledger proof, marketplace producer completeness/repeatability, owner-reviewed publish windows, deployment approval, and protected runtime smoke.

## Blockers

- `[MISSING: docs-rag JWT_TOKEN]`
- `[MISSING: qualifying historical paid multi-product Orders rows for non-empty replay evidence]`
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`
- `[MISSING: Marketing parser support for marketplace-owned replay source envelopes]`
- `[MISSING: durable Marketing backfill run ledger and idempotency key registry]`
- `[MISSING: Allegro-owned protected replay endpoint so future runs do not require a temporary SQL export]`
- `[MISSING: Catalog bundle ownership decision: read-only candidate, standalone bundle aggregate, or product-like SKU]`
- `[MISSING: Orders bundle create-order contract and bundle identity representation beyond normal line items]`
- `[MISSING: Warehouse bundle reservation contract for stock and fulfillment effects]`
- `[MISSING: Payments metadata policy for bundle/free-shipping evidence without making Payments pricing truth]`
- `[MISSING: approved real checkout smoke scope]`
- `[UNKNOWN: whether current live Orders history should contain paid multi-product rows or whether upstream order capture is still empty]`
