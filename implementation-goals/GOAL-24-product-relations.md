# GOAL 24 - Product Relations Foundation

```yaml
id: GOAL-24-product-relations
status: runtime-deployed
owner_role: catalog worker
created: 2026-07-02
deployment_status: deployed
database_status: migration_applied
```

## Goal

Create the first Catalog-owned foundation for related-products and order-affinity metadata without implementing Orders ingestion or bundle checkout.

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog remains the product truth service and can safely expose product relation metadata.
- Goal Impact: future product pages and operator workflows can consume deterministic related-product scores after migration/deploy approval.
- System: Catalog owns relation metadata; Orders owns future affinity generation; FlipFlop/Orders/Payments own checkout and bundle selling.
- Feature: additive relation table plus protected read and admin/manual upsert endpoints.
- Task: implement TypeORM entity, service, controller, migration, docs, and focused tests.
- Execution Plan: `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md`.
- Coding Prompt: keep implementation Catalog-only, additive, protected, deterministic, and explicit about missing upstream facts.
- Code: `src/product-relations/*`, `src/app.module.ts`, `scripts/migrations/20260702_product_relation_scores.sql`.
- Validation: `reports/validation/VAL-GOAL-24-product-relations.md`.

## Acceptance Criteria

- Additive SQL migration creates `product_relations` with source product, target product, relation type, score, confidence, source, evidence JSONB, and timestamps.
- Entity/service/controller are additive and wired through `AppModule`.
- `GET /api/products/:productId/related` is protected and returns deterministic order by score, confidence, target id.
- Admin/manual upsert rejects self-relations, negative or non-finite scores, invalid confidence, invalid tokens, and non-object evidence.
- Existing product, pricing, Warehouse, Orders, Payments, channel, deletion, and deploy flows are not changed.
- Focused Jest, `npm run build`, and `git diff --check` evidence is recorded.

## Runtime Closure

As of 2026-07-03, the additive `product_relations` migration is applied and the Catalog relation API is deployed. Runtime evidence in `docs/orchestrator/STATUS.md` confirms protected related-products readback, Marketing-owned `order_affinity` batch upsert for controlled canary rows, read-only `bundle-candidates` responses, active current-price evidence, and live FlipFlop-mapped product-pair readback.

Catalog still does not own Orders historical affinity replay, bundle checkout, Payments totals, Warehouse stock mutation, channel publication, or marketplace presentation.

## Allowed Files

- `docs/contracts/catalog-product-relations.md`
- `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md`
- `implementation-goals/GOAL-24-product-relations.md`
- `reports/validation/VAL-GOAL-24-product-relations.md`
- `scripts/migrations/20260702_product_relation_scores.sql`
- `src/product-relations/*`
- `src/app.module.ts`

## Forbidden Files And Actions

- `.env*`, secrets, k8s, deploy scripts, Dockerfiles, generated `dist`, `.next`, or `node_modules`.
- Product deletion flows or mass price changes.
- Warehouse, Orders, Payments, channel repos, live DB queries, live DB mutations, or deployment.
- Orders ingestion, RabbitMQ consumers, checkout bundles, discounts, or payment effects.

## Blockers

- `[MISSING: docs-rag JWT_TOKEN]`
- `[MISSING: scripts/pre_coding_gate.py]`
- `[MISSING: scripts/strict_doc_audit.py]`
- `[MISSING: Orders-owned affinity producer/event contract]`
- `[MISSING: bundle checkout contract owned by FlipFlop/Orders/Payments]`
- `[MISSING: runtime backfill source for historical order-affinity scores]`

## Parallel Execution

No parallel source workers were started because the backend change edits one shared schema/API contract and one module wiring point.

Future lanes are dependency-gated:

- Orders affinity producer: blocked on `[MISSING: Orders-owned affinity producer/event contract]`.
- Historical relation backfill: blocked on `[MISSING: owner-approved historical order-affinity source and live DB mutation approval]`.
- Frontend/operator relation display: ready to consume deployed related-products and bundle-candidates read APIs when a UI owner is assigned.
- Bundle checkout: blocked on `[MISSING: bundle checkout contract owned by FlipFlop/Orders/Payments]`.

## Rollback Notes

Before migration application, rollback is source-only: revert the additive files and `ProductRelationsModule` import. After migration application, rollback requires dropping or ignoring `product_relations` only with explicit DB approval.
