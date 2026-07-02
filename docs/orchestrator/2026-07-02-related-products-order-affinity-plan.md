# 2026-07-02 Related Products And Order Affinity Plan

```yaml
id: CATALOG-GOAL-24-PRODUCT-RELATIONS-PLAN
status: implemented-source
owner_role: catalog worker
repository: /home/ssf/Documents/Github/catalog-microservice
deployment: not requested
database_mutation: not run
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog remains the Statex product truth service while exposing relation metadata that future product-detail and operator experiences can consume.
- Goal Impact: establish a Catalog-owned relation score foundation before Orders ingestion, checkout bundles, or marketplace selling depend on it.
- System: Catalog persists and serves relation metadata; Orders remains the source for future affinity events; FlipFlop/Orders/Payments own cart, checkout, bundles, and payment effects.
- Feature: protected product-related read endpoint and admin/manual relation upsert.
- Task: add additive TypeORM table/entity/service/controller, SQL migration, and focused service tests.
- Execution Plan: implement only allowed Catalog files, preserve private-catalog read scope, and validate with focused Jest, build, and diff check.
- Coding Prompt: do not implement Orders ingestion, bundle checkout, live DB mutation, deployment, product deletion flows, or cross-repo changes.
- Code: `src/product-relations/*`, `src/app.module.ts`, `scripts/migrations/20260702_product_relation_scores.sql`.
- Validation: record results in `reports/validation/VAL-GOAL-24-product-relations.md`.

## Scope

Allowed and implemented:

- Additive table contract for relation score metadata.
- Protected `GET /api/products/:productId/related`.
- Admin-only `PUT /api/products/:productId/related/:targetProductId` for manual/admin upsert.
- Service validation for self-relations, finite non-negative scores, bounded confidence, token fields, JSON evidence object, and deterministic ordering.
- Product-read scope check for source product and target filtering for non-admin human actors.
- Focused service tests.

Not implemented:

- Orders ingestion, order-line joins, RabbitMQ consumers, batch backfill, or scheduled jobs.
- Bundle checkout, cart discounts, product bundles, payments, stock reservations, or storefront UX.
- Live migration application, DB queries, deployment, k8s, secrets, or runtime smoke.
- Product deletion or price mutation changes.

## Invariants

- `CAT-INV-001`: preserved. Catalog owns only product relation metadata attached to product truth.
- `CAT-INV-002`: preserved. No stock, reservation, movement, or warehouse-location fields were added.
- `CAT-INV-003`: preserved. Auth remains the credential authority through `CatalogAuthGuard`.
- `CAT-INV-004`: preserved. Checkout and bundle selling remain outside Catalog.
- `CAT-INV-005`: preserved. No Bazos or marketplace publishing path changed.
- `CAT-INV-006`: preserved. Product delete flows were not changed.
- `CAT-INV-007`: preserved. Pricing flows were not changed.
- `CAT-INV-008`: preserved. No media storage changed.
- `CAT-INV-009`: preserved. Existing product read envelopes are unchanged; new endpoint is additive.
- `CAT-INV-010`: preserved. Manual relation writes are protected and audited.

## Sensitive Data Classification

- Schema and source code only.
- No secrets, tokens, raw production data, customer identifiers, live private logs, or production screenshots.
- `evidence` is intended for non-sensitive provenance metadata only; producer contracts must define redaction before automated ingestion.

## Contract And Schema Impact

- Additive table: `product_relations`.
- Additive API: `GET /api/products/:productId/related`.
- Additive admin API: `PUT /api/products/:productId/related/:targetProductId`.
- No existing endpoint shape changes.
- SQL migration is committed but not applied.

## Replay And Determinism

Reads are deterministic by `score DESC`, `confidence DESC`, and `targetProductId ASC`.

Future Orders ingestion must provide idempotency semantics for affinity-source writes. Current manual upsert is idempotent on `(sourceProductId, targetProductId, relationType, source)`.

## Parallel Execution

This bounded source task is not safely split across multiple agents because it edits one shared schema/API contract and one Nest module integration point.

Future parallel lanes:

- Ready now: frontend/operator display can be planned after backend source review. Owner role: frontend worker. Dependency: backend endpoint contract accepted. Status: dependency-gated until backend migration/deploy approval.
- Dependency-gated: Orders affinity producer. Owner role: Orders worker. Blocker: `[MISSING: Orders-owned affinity producer/event contract]`.
- Dependency-gated: relation backfill. Owner role: data worker. Blocker: `[MISSING: owner-approved historical order-affinity source and live DB mutation approval]`.
- Blocked: bundle checkout. Owner role: FlipFlop/Orders/Payments integration. Blocker: `[MISSING: bundle checkout contract owned by FlipFlop/Orders/Payments]`.
- Final integration: Catalog migration application, deployment, and runtime smoke. Owner role: integration validator. Blocker: `[MISSING: owner approval to apply migration and deploy]`.

Shared files/contracts:

- `docs/contracts/catalog-product-relations.md`
- `scripts/migrations/20260702_product_relation_scores.sql`
- `src/product-relations/*`
- `src/app.module.ts`

Integration owner: Catalog orchestrator.

Validation owner: current worker session.

Merge order: backend source and docs first, migration application/deploy only after explicit approval.

## Known Gaps

- `[MISSING: docs-rag JWT_TOKEN]`
- `[MISSING: scripts/pre_coding_gate.py]`
- `[MISSING: scripts/strict_doc_audit.py]`
- `[MISSING: Orders-owned affinity producer/event contract]`
- `[MISSING: owner-approved migration application and deployment window]`
- `[MISSING: bundle checkout contract owned by FlipFlop/Orders/Payments]`
