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

Follow-up read-only evidence on 2026-07-03 confirmed the Orders replay endpoint, Marketing order-affinity aggregator, Marketing-to-Catalog publisher, and Catalog internal batch endpoint exist and pass focused source checks. The live Marketing dry-run remained empty (`inputRecords=0`, `acceptedCreatedEvents=0`, `aggregatePairs=0`, `candidates=[]`), so automated historical replay is gated on qualifying order evidence and publish/pruning decisions, not on missing source infrastructure.

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
- `[MISSING: qualifying historical paid multi-product Orders rows for non-empty replay evidence]`
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`
- `[MISSING: Marketing durable run ledger proving a complete source/window snapshot]`
- `[MISSING: marketplace producer guarantee that replay window is complete and repeatable]`
- `[MISSING: owner-approved retention/decay policy for stale affinity rows]`
- `[MISSING: Catalog standalone bundle aggregate API and persistence contract]`
- `[MISSING: Orders additive bundleEvidence metadata contract on create-order and idempotent replay]`
- `[MISSING: Warehouse approval that first ecosystem bundle selling reserves component lines only]`
- `[MISSING: Payments bounded bundle metadata allowlist test covering free-shipping evidence without pricing authority]`
- `[MISSING: owner-approved Rung 1 non-mutating real checkout smoke credentials and target products]`
- `[MISSING: owner-approved Rung 2 live pending-order smoke plan if production order/reservation evidence is required]`
- `[UNKNOWN: whether current live Orders history should contain paid multi-product rows or whether upstream order capture is still empty]`

## Parallel Execution

The original backend foundation was not split because it edited one shared schema/API contract and one module wiring point. The 2026-07-03 contract refresh used read-only subagents for independent evidence collection and one Catalog integration owner for documentation updates.

Current lanes:

- `ready now`: Orders replay contract maintenance. Owner role: Orders worker. Scope: keep `orders.order.created.v1` item snapshots and replay verifier compatible with Marketing/Catalog affinity replay. Expected output: source-only verification or bounded fixes in Orders. Validation: `npm run verify:order-affinity-replay`.
- `ready now`: Marketing dry-run/export/backfill hardening. Owner role: Marketing worker. Scope: keep the backfill CLI, aggregation, and Catalog publisher safe and dry-run-first. Expected output: source-only verification or bounded fixes in Marketing. Validation: focused order-affinity backfill tests and non-mutating dry-run.
- `ready now`: Catalog product relation API maintenance. Owner role: Catalog worker. Scope: maintain protected related-products, bundle-candidates, and internal batch endpoint. Validation: focused product-relations Jest and `git diff --check`.
- `dependency-gated`: Non-empty historical affinity publish. Owner role: integration validator. Blockers: `[MISSING: qualifying historical paid multi-product Orders rows for non-empty replay evidence]`, `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`, and `[MISSING: pruning/replacement semantics for stale affinity rows]`.
- `ready now`: Catalog standalone bundle aggregate contract design. Owner role: Catalog/commerce architect. Scope: define `catalog.bundle.v1` API/persistence plan from `docs/contracts/catalog-bundle-commerce-contract.md`; source implementation remains gated until the plan is accepted.
- `dependency-gated`: Marketplace/operator bundle suggestions. Owner role: channel worker. Blocker: `[MISSING: channel-specific external marketplace bundle publication policies]`.
- `dependency-gated`: Ecosystem real bundle selling beyond the existing FlipFlop-local bundle intent. Blockers: `[MISSING: Orders additive bundleEvidence metadata contract on create-order and idempotent replay]`, `[MISSING: Warehouse approval that first ecosystem bundle selling reserves component lines only]`, `[MISSING: Payments bounded bundle metadata allowlist test covering free-shipping evidence without pricing authority]`, and `[MISSING: owner-approved Rung 1 non-mutating real checkout smoke credentials and target products]`.

Shared files/contracts: `docs/contracts/catalog-product-relations.md`, `docs/contracts/catalog-bundle-commerce-contract.md`, Orders create-order contract, Warehouse reservation contract, Payments create-payment validation contract, FlipFlop GOAL-13 bundle intent docs, and Marketing orders-events integration contract. Integration owner: Catalog orchestrator until a commerce integration owner is assigned. Validation owner: integration validator. Merge order: source contract verification before any runtime publish or checkout implementation.

## Rollback Notes

Before migration application, rollback is source-only: revert the additive files and `ProductRelationsModule` import. After migration application, rollback requires dropping or ignoring `product_relations` only with explicit DB approval.

## 2026-07-03 Scheduled Marketplace Backfill Contract Update

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

- Vision: marketplace purchase history can improve related-product surfaces without moving customer, payment, address, stock, checkout, or publication ownership into Catalog.
- Goal Impact: the owner-approved Allegro one-time affinity publish is now translated into a repeatable implementation contract.
- System: marketplace services own replay producers, Marketing owns aggregation/scheduling/idempotency, and Catalog owns upsert-only relation persistence.
- Feature: protected marketplace replay candidates and scheduled dry-run-first backfill orchestration.
- Task: define Allegro replay endpoint semantics, Marketing run ledger/idempotency, Catalog pruning gates, and cross-channel parallel workstreams.
- Execution Plan: docs-only contract update; no service code or runtime mutation.
- Coding Prompt: record `[MISSING: ...]` blockers instead of inventing parser, endpoint, ledger, or pruning contracts.
- Code: `docs/contracts/catalog-marketplace-affinity-backfill.md` and linked Goal 24 docs.
- Validation: `git diff --check`.
- State Update: W1 Allegro replay producer is ready now; Marketing parser/ledger and Catalog prune/replace work are dependency-gated.


## 2026-07-03 Source/Window Replacement API Update

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

- Vision: marketplace purchase history can improve related-product surfaces without moving customer, payment, address, stock, checkout, or publication ownership into Catalog.
- Goal Impact: recurring Marketing order-affinity publishes have a bounded Catalog replacement surface instead of additive-only stale rows.
- System: Catalog owns only `product_relations`; Marketing must still prove source/window completeness through its run ledger; marketplace producers must prove repeatable snapshots.
- Feature: internal `order_affinity` `replace-window` endpoint that upserts a complete snapshot and prunes only exact same-window Marketing rows.
- Task: implement fail-closed source/window scoped replacement in `src/product-relations/*`, update contracts, and validate focused tests/build/diff.
- Execution Plan: single Catalog owner lane; no parallel source edits because the relation service/controller/contract are shared files.
- Coding Prompt: require `completeSnapshot=true`; force `relationType=order_affinity` and `source=marketing_order_affinity`; stamp `evidence.orderAffinityWindow`; never prune manual/non-window/non-Marketing rows.
- Code: `src/product-relations/product-relations.dto.ts`, `src/product-relations/product-relations.controller.ts`, `src/product-relations/product-relations.service.ts`, `src/product-relations/product-relations.service.spec.ts`, Goal 24 contracts/status docs.
- Validation: `npm test -- --runInBand src/product-relations/product-relations.service.spec.ts`, `npm run build`, `git diff --check`.
- State Update: Catalog source/window replacement API source is complete; scheduled use remains gated by Marketing ledger, marketplace producer completeness, owner retention policy, deployment, and runtime smoke.
