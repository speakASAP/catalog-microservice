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

- `[RESOLVED: docs-rag JWT_TOKEN available in live docs-rag pod and accepted for retrieval auth]`
- `[RESOLVED: docs-rag indexed Catalog Goal 24 order-affinity context]`
- `[MISSING: scripts/pre_coding_gate.py]`
- `[MISSING: scripts/strict_doc_audit.py]`
- `[MISSING: qualifying historical paid multi-product Orders rows for non-empty replay evidence]`
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`
- `[RESOLVED: Marketing durable run ledger proving a complete source/window snapshot]`
- `[RESOLVED: Allegro protected repeatable replay producer completeness]`
- `[RESOLVED: Bazos protected replay endpoint compatible with Marketing marketplace replay contract]`
- `[RESOLVED/NARROWED: Bazos paid order history source implemented as local paid projection fields]`
- `[RESOLVED/NARROWED: Bazos persisted order item replay source implemented as bounded itemSnapshots]`
- `[RESOLVED/NARROWED: Bazos order item ingestion contract implemented for source item lines or linked Bazos ads with Catalog product IDs]`
- `[RESOLVED: live Bazos paid multi-product order replay evidence via budget source dry-run goal24-bazos-budget-paid-source-20260703-001]`
- `[MISSING: owner approval to activate recurring Bazos affinity publish after live dry-run evidence]`
- `[MISSING: non-empty real Aukro multi-Catalog-product replay evidence]`
- `[MISSING: owner-approved Aukro recurring schedule activation policy]`
- `[RESOLVED: Catalog standalone bundle aggregate API and persistence contract design owner-ready in docs/contracts/catalog-bundle-aggregate-v1.md]`
- `[RESOLVED: owner accepted catalog.bundle.v1 source implementation gate in Codex thread on 2026-07-03]`
- `[RESOLVED: Catalog additive migration/API source implemented for catalog.bundle.v1 in branch goal24-catalog-bundle-api]`
- `[RESOLVED: owner-approved Catalog bundle aggregate migration application/deploy/runtime smoke]`
- `[RESOLVED: Orders additive bundleEvidence metadata contract on create-order and idempotent replay merged in Orders commit 18892a5]`
- `[RESOLVED: Warehouse component-line reservation sign-off merged in Warehouse commit ae8c8fe and retained on main 74870b0]`
- `[RESOLVED: Payments bounded bundle metadata allowlist test covering free-shipping evidence merged in Payments commit aa79fa2]`
- `[RESOLVED: owner-approved Rung 1 non-mutating real checkout smoke passed against active catalog.bundle.v1 bundle e38ce03c-d18b-40a4-9898-f82a3f77dc0b]`
- `[UNKNOWN: whether current live Orders history should contain paid multi-product rows or whether upstream order capture is still empty]`
- `[RESOLVED/NARROWED: owner-approved paid/provider checkout implementation contract defined in docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md]`
- `[RESOLVED/NARROWED: owner-approved channel implementation contract defined in docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md]`
- `[MISSING: approved safe bundle target/product ids for paid/provider smoke]`
- `[MISSING: approved payment method/provider mode and maximum amount for paid/provider smoke]`
- `[MISSING: approved Warehouse stock hold/release window and max quantity]`
- `[MISSING: selected first channel for external bundle implementation canary]`
- `[MISSING: owner-approved live test listing/feed/import plan and cleanup plan]`

## Parallel Execution

The original backend foundation was not split because it edited one shared schema/API contract and one module wiring point. The 2026-07-03 contract refresh used read-only subagents for independent evidence collection and one Catalog integration owner for documentation updates.

Current integration owner: original Codex thread `019f2683-0cac-7ec0-b4cf-8fe83e07a74e` for Catalog docs/status reconciliation only.

Current lanes:

- `ready now`: Orders replay contract maintenance. Owner role: Orders worker. Scope: keep `orders.order.created.v1` item snapshots and replay verifier compatible with Marketing/Catalog affinity replay. Expected output: source-only verification or bounded fixes in Orders. Validation: `npm run verify:order-affinity-replay`.
- `ready now`: Marketing dry-run/export/backfill hardening. Owner role: Marketing worker. Scope: keep the backfill CLI, aggregation, and Catalog publisher safe and dry-run-first. Expected output: source-only verification or bounded fixes in Marketing. Validation: focused order-affinity backfill tests and non-mutating dry-run.
- `complete`: Marketing parser/ledger worker. Owner role: Marketing worker. Result: Marketing `main` at `0aa47ed` is deployed on image `localhost:5000/marketing-microservice:0aa47ed` and includes marketplace envelope parsing, source-specific token mapping, aggregate-only run ledger, persisted complete-snapshot proof, idempotency registry, scheduled publish ledger guard, runtime evidence for Allegro plus Aukro dry-runs, complete-snapshot ledger smoke `goal24-complete-snapshot-smoke-20260703123503`, and fail-closed replace-window guard `goal24-replace-window-blocked-20260703123529`.
- `complete`: W1 Allegro replay producer. Owner role: Allegro worker. Result: Allegro `main` has protected repeatable replay producer handoff at `37a5add` and hardened producer source already on `main`; remaining producer work is non-Allegro scheduled matrix coverage.
- `ready now`: Catalog product relation API maintenance. Owner role: Catalog worker. Scope: maintain protected related-products, bundle-candidates, and internal batch endpoint. Validation: focused product-relations Jest and `git diff --check`.
- `dependency-gated`: Non-empty historical affinity publish. Owner role: integration validator. Blockers: `[MISSING: qualifying historical paid multi-product Orders rows for non-empty replay evidence]`, `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`, and source-specific producer completeness/activation gates for non-Allegro sources.
- `complete`: Catalog standalone bundle aggregate contract/API/runtime. Owner role: Catalog/commerce architect. Result: `catalog.bundle.v1` design, source implementation, additive migration, deployment, and protected runtime smoke are complete through Catalog source commit `074de13` and runtime-doc commit `f2d3f42`.
- `complete`: Marketplace/operator bundle publication policy handoffs. Owner role: channel workers plus Catalog integration owner. Result: Catalog fail-closed default plus Allegro, Bazos, Aukro, and Heureka fail-closed channel policies are recorded; future external bundle publication remains owner-contract-gated.
- `[RESOLVED/NARROWED: Allegro-owned catalog.bundle.v1 external publication policy handoff recorded as fail-closed in Allegro main 8b05807 / handoff commit 27b5f88]`
- `[RESOLVED/NARROWED: Bazos-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Bazos source policy at Bazos main 9703b0c / source acc0ac9]`
- `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Aukro policy at Aukro main f44d7d7 / source bd86caa]`
- `[RESOLVED/NARROWED: Heureka-owned catalog.bundle.v1 feed publication policy handoff resolved to fail-closed Heureka policy at Heureka main 1cf0f32]`
- `contract-approved-runtime-gated`: Ecosystem real bundle selling beyond the existing FlipFlop-local bundle intent. Completed prerequisites: Orders bundleEvidence contract `18892a5`, Warehouse component-line reservation sign-off `ae8c8fe`/`74870b0`, Payments metadata allowlist `aa79fa2`, FlipFlop display adoption `5911523`, Rung 1 non-mutating real-bundle smoke, Rung 2 live pending-order/reservation-release evidence, and owner-approved next implementation contract in `docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md`. Evidence: [RESOLVED: owner-approved Rung 2 live pending-order smoke proved pending Orders create, Warehouse reservation, and payment-status cleanup release for catalog.bundle.v1 bundle 919be990-1c76-4f9c-b100-829281c6a709]. Contract status: `[RESOLVED/NARROWED: owner-approved paid/provider checkout implementation contract defined in docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md]`. Runtime blockers: `[MISSING: approved safe bundle target/product ids for paid/provider smoke]`, `[MISSING: approved payment method/provider mode and maximum amount for paid/provider smoke]`, `[MISSING: approved Warehouse stock hold/release window and max quantity]`, `[MISSING: Orders/Payments provider-success, provider-cancel, refund, and post-fulfillment cancellation event contract that maps to Warehouse fulfill/cancel/return calls]`, `[MISSING: proof that active checkout paths pass central Orders UUIDs to Payments]`, and `[MISSING: runtime verification of Payments Orders service token/role]`.

Shared files/contracts: `docs/contracts/catalog-product-relations.md`, `docs/contracts/catalog-bundle-commerce-contract.md`, Orders create-order contract, Warehouse reservation contract, Payments create-payment validation contract, FlipFlop GOAL-13 bundle intent docs, and Marketing orders-events integration contract. Integration owner: original Codex thread `019f2683-0cac-7ec0-b4cf-8fe83e07a74e` until a commerce integration owner is assigned. Validation owner: integration validator in the original thread. Merge order: Marketing parser/ledger handoff complete, Allegro producer handoff complete, Catalog integration reconciliation, then owner-reviewed runtime publish or checkout implementation only after all source-specific gates are proven.

## 2026-07-03 Parallel Worker Wave

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

- Vision: recurring marketplace affinity can improve Catalog relation surfaces without moving marketplace order extraction, Marketing aggregation, or docs-rag indexing ownership into Catalog.
- Goal Impact: remaining Goal 24 blockers are split into repo-owned, conflict-safe workstreams.
- System: Allegro owns protected replay production; Marketing owns parser, scheduler, run ledger, and idempotency; docs-rag owns indexed retrieval context; Catalog remains integration owner for relation contracts/status.
- Feature: parallel execution of producer, Marketing ledger/parser, and docs-rag indexing gates.
- Task: launch separate Codex worker threads with disjoint file ownership and preserve Catalog integration merge order.
- Execution Plan: each worker uses remote Alfares workflow, its own repo scope, focused validation, commit/push on its branch only, and final handoff; Catalog integration validates and merges after handoffs.
- Coding Prompt: do not edit shared Catalog contracts from worker repos except through integration handoff; mark unknowns as `[MISSING: ...]` or `[UNKNOWN: ...]`.
- Code: Catalog status docs only for this launch.
- Validation: `git diff --check`.
- State Update: W1, W2, and W3 are active in separate Codex threads.

| Workstream | Status | Thread | Owner role | Scope | Allowed files/repos | Forbidden files/repos | Dependencies | Expected validation | Handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W1 Allegro replay producer | complete | `019f268e-6e40-7063-80fd-6c81823638fb` | Allegro worker | Protected replay endpoint with complete/repeatable window evidence | `allegro` repo docs/source/tests | Catalog, Marketing, Orders, Warehouse, Payments, k8s, deploy scripts, secrets, live mutations | Catalog marketplace affinity contract | focused Allegro tests/build, `git diff --check` passed in worker; integration doc check passed | Allegro `main` `37a5add`; Marketing parser/token/ledger remains next |
| W2 Marketing parser/ledger | active | `019f268e-bf2c-7171-a545-bc810c99111d` | Marketing worker | Marketplace-owned envelope parser plus durable run ledger/idempotency if persistence is ready | `marketing` repo parser/backfill/ledger docs/source/tests | Catalog, Allegro, Orders, Warehouse, Payments, k8s, deploy scripts, secrets, unapproved publish | W1 response shape for full end-to-end publish; parser can proceed from contract | focused Marketing tests/build, dry-run evidence, `git diff --check` | branch, validation report, ledger/parser blocker status |
| W3 docs-rag indexed context | complete | `019f268e-fca4-7562-8538-c128284b714c` plus integration owner | Make Catalog Goal 24 order-affinity docs retrievable after auth succeeds | docs-rag repo indexing/config/docs; Catalog docs-only status only if evidence requires | Catalog source, Marketing/Allegro source, k8s manifests, deploy scripts, secrets, destructive index purge | docs-rag JWT access already resolved | catalog-only ingestion completed 163/163 chunks; sanitized retrieval returned non-zero Goal 24 context and sources | blocker resolved; future freshness source fix remains docs-rag-owned |
| W4 Catalog integration | active here | current thread | Catalog orchestrator | Validate handoffs, merge in order, update Goal 24 status/contracts | Catalog status/contracts/reports only after worker handoff | direct worker repo edits, runtime publish without owner window | W1-W3 handoffs | worker validation review, Catalog `git diff --check` | final Goal 24 closure or narrowed blockers |

Shared contracts: `docs/contracts/catalog-marketplace-affinity-backfill.md`, `docs/contracts/catalog-product-relations.md`, Marketing order-affinity contract docs, and Allegro replay endpoint/export docs.

Integration owner: Catalog orchestrator in this thread.

Validation owner: Catalog integration validator after worker handoffs.

Merge order: W1 producer complete, W2 parser/ledger complete, W3 docs-rag context complete, W4 Catalog integration status ongoing for non-Allegro producer gates.

## 2026-07-03 Stale-Affinity Retention Policy Update

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

- Vision: marketplace purchase history can improve product-relation surfaces while Catalog remains bounded to relation metadata.
- Goal Impact: recurring affinity replacement can proceed under a conservative owner-approved policy once external completeness gates are met.
- System: Catalog owns only `product_relations`; Marketing owns ledger/scheduling completeness; marketplace producers own repeatable source windows.
- Feature: stale `marketing_order_affinity` retention and replacement policy.
- Task: resolve the broad retention/decay blocker without adding deletion, decay, migration, deployment, or runtime mutation.
- Execution Plan: docs/contract-only update; preserve parallel lanes and remaining external blockers.
- Coding Prompt: choose exact source/window replacement only, retain legacy/non-window rows, and avoid invented archival or decay behavior.
- Code: Goal 24 contracts/status/validation docs only.
- Validation: `git diff --check`; no source tests required for docs-only policy update.
- State Update: broad owner-retention blocker resolved and Marketing ledger proof is deployed/smoked; scheduled replacement still requires source-specific producer completeness and owner-reviewed publish windows.

Selected policy: only the `replace-window` endpoint may prune `marketing_order_affinity` rows, and only when existing `evidence.orderAffinityWindow` exactly matches the incoming `sourceOwner`, `channel`, `windowStart`, `windowEnd`, and `runId`. Catalog does not support time-based deletion, score/confidence decay, manual/non-window pruning, standalone prune-window cleanup, or legacy-row archival. Legacy rows without exact matching window evidence are retained additively unless owners later approve a separate archival contract.


## 2026-07-03 B1.1 Catalog Bundle Aggregate API Source

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

- Vision: Catalog can expose durable bundle identity without owning checkout, stock, payment, or marketplace publication.
- Goal Impact: Catalog-owned additive source resolves the `catalog.bundle.v1` implementation blocker and leaves runtime/downstream gates explicit.
- System: Catalog owns bundle aggregate metadata over existing products only; Orders/Warehouse/Payments/FlipFlop retain their boundaries.
- Feature: protected create/read/list/update/activate/archive API plus additive persistence.
- Task: implement `src/bundles/*`, migration, focused tests, and docs/state evidence.
- Execution Plan: `implementation-goals/GOAL-24-bundle-aggregate-api-execution-plan.md`.
- Coding Prompt: no SKU, no final totals, no orders, no reservations, no payments, no marketplace publication, fail closed on missing downstream contracts.
- Code: `src/bundles/*`, `src/app.module.ts`, `scripts/migrations/20260703_catalog_bundle_aggregate.sql`, validation/status docs.
- Validation: docs-rag retrieval HTTP 200 with indexed context; pre-coding scripts missing; focused bundles Jest passed 1 suite/7 tests; `npm run build` passed; `git diff --check` passed.
- State Update: source implementation is complete; migration application/deploy/runtime smoke and downstream commerce contracts remain gated.


## 2026-07-03 B1.1 Catalog Bundle Aggregate Runtime Closure

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

- Vision: Catalog can expose durable bundle identity while preserving product truth and downstream checkout/stock/payment boundaries.
- Goal Impact: the Catalog-owned `catalog.bundle.v1` migration/API/deploy/runtime-smoke blocker is resolved.
- System: Catalog owns only bundle aggregate metadata over existing product IDs; downstream selling gates remain explicit.
- Feature: deployed protected bundle aggregate API and additive persistence.
- Task: apply additive migration, deploy `44ce06d`, and run bounded protected runtime smoke.
- Execution Plan: `implementation-goals/GOAL-24-bundle-aggregate-api-execution-plan.md`.
- Coding Prompt: do not create SKU, order, reservation, payment, provider call, marketplace publication, or stock movement.
- Code: `src/bundles/*`, `scripts/migrations/20260703_catalog_bundle_aggregate.sql` deployed at image `localhost:5000/catalog-microservice:44ce06d`.
- Validation: migration verification, deploy rollout, in-pod health, external health HTTP 200, protected create/activate/archive/read canary smoke, and post-smoke row counts.
- State Update: Catalog runtime lane complete; Orders/Warehouse/Payments/FlipFlop contract lanes remain.

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
- State Update: Catalog source/window replacement API source and runtime smoke are complete; Marketing ledger proof is deployed/smoked; scheduled use remains gated by source-specific marketplace producer completeness and owner-reviewed publish window.
