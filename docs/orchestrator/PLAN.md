# Catalog Implementation Plan

## 2026-06-29 - TASK-STOCK-004 Warehouse Stock Propagation Active Goal

Active goal: Warehouse-backed product stock amounts and oversell prevention across Catalog and sales channels.

Saved plan: `docs/orchestrator/TASK-STOCK-004-warehouse-stock-propagation-plan.md`.

Current execution state: Catalog product detail and live availability endpoint show Warehouse `60/0/60` for the target product; read-only Catalog stock consistency smoke now asserts Warehouse `totalAvailable` equals FlipFlop projected/channel stock for the target product; Orders reservation gate is deployed and verifier coverage now proves insufficient-stock Warehouse reserve responses fail closed without leaking Warehouse details; Allegro local draft quantity is capped to Warehouse availability at prepare/edit/reuse time; Bazos catalog-origin draft quantity is capped to Warehouse availability at prepare/reuse time and deployed at `bazos-service@b15681c`; Aukro create/sync/publish policy paths already read Warehouse availability; Heureka readiness exposes Warehouse `availableStock=60` while correctly blocking feed eligibility on missing category/settings; the deployed Allegro current-stock audit proves configured Allegro accounts expose only 9 unique stock-authoritative offers totaling 496 units; physical stock beyond that is blocked on `[MISSING: authoritative BizBox/current stock export, real supplier source, or correctly authorized additional Allegro seller account]`.

Parallel next work: Lane A Allegro Imports public BizBox CSV upload/preview is deployed; Lane B BizBox source discovery found no source file; Lane C approved Warehouse import is dependency-gated on owner-provided current stock source and authority confirmation; Lane D Suppliers real-source onboarding is dependency-gated; Lane E final validation is final integration after import.

## Execution Rule

Work one goal chunk at a time. Prefer a complete, verifiable chunk over starting multiple tracks.

## Active Goal

No active goal.

All documented Catalog implementation goals are complete, merged, pushed, deployed, and post-deploy or runtime verified through Goal 16.

### Goal 1 Closure Evidence

- Commit `2611124` contains Goal 1 auth boundary and audit logging source/docs.
- `./scripts/deploy.sh` deployed image `localhost:5000/catalog-microservice:2611124` on 2026-06-12.
- Production health check returned `healthy`.
- In-pod runtime smoke returned health `200`, anonymous category `POST` `401`, authorized category `POST` `201`, authorized cleanup `DELETE` `200`.
- Active pod logs emitted structured `catalog.write` entries for category create/delete with synthetic actor and request id.


### Goal 2 Closure Evidence

- Commit `fcb1919` was deployed to production with `./scripts/deploy.sh` on 2026-06-12.
- Production schema was inspected with `psql` before migration; `products` uses quoted `isActive`, matching the migration.
- `scripts/migrations/20260612_goal02_product_lifecycle.sql` applied successfully; `products.lifecycle`, `products_lifecycle_check`, and `idx_products_lifecycle` were verified.
- Deployment phases completed successfully: preflight, image build, push, manifest apply, rollout, and health check.
- Runtime in-pod smoke returned health `200`, preserved the `GET /api/products` envelope, created and updated synthetic lifecycle products, verified readiness lifecycle/checks/issues, verified quality audit `missingEan` and duplicate summary shapes, and removed all synthetic products through the hard-delete approval gate.
- Synthetic JWT was generated inside the pod from runtime secret and was not printed. A post-cleanup database check found zero `CODEX-GOAL2-%` products.


### Goal 3 Closure Evidence

- Commit `d222e11` contains Goal 3 pricing integrity source/docs.
- Branch `feature/catalog-goal-03-pricing-integrity` was pushed to `origin`.
- `./scripts/deploy.sh` deployed image `localhost:5000/catalog-microservice:d222e11` on 2026-06-12.
- Production health check returned `healthy`.
- Runtime in-pod smoke verified invalid pricing rejection, deterministic sale current-price selection, mass pricing guard rejection without human review, mass pricing acceptance with `x-human-review: explicit`, audit-log metadata, and synthetic cleanup.


### Goal 4 Closure Evidence

- Commit `75d0700` contains Goal 4 channel readiness source/docs.
- Branch `feature/catalog-goal-04-channel-readiness-model` was pushed to `origin`; deployment ran from current branch head `5f0e087`.
- `./scripts/deploy.sh` deployed image `localhost:5000/catalog-microservice:5f0e087` on 2026-06-13.
- Production health check returned `healthy`.
- Runtime in-pod smoke created a synthetic incomplete product, verified `GET /api/products/:id/channel-readiness` returned `200`, two channel entries, FlipFlop missing fields for description/categories/media/pricing, and Bazos draft readiness with `authority: "bazos"` and policy-deferred issue.
- Runtime smoke verified no Bazos publish-permission fields and cleaned the synthetic product through the hard-delete approval gate.
- Post-cleanup search for `CODEX-GOAL4` returned zero products. Synthetic JWT was generated inside the pod from runtime secret and was not printed.

### Goal 2 Planning Chunk

Deliverables:

- Execution plan for product lifecycle/readiness diagnostics.
- Source inspection of product entity, DTO/service/controller, media model, and existing response contracts.
- Pre-coding gate evidence before model/API changes.

Verification:

- Goal 2 plan names applicable invariants and validation commands.
- Public product read compatibility is preserved by design before coding.

### Goal 5 Planning Evidence

- Branch `feature/catalog-goal-05-catalog-warehouse-contract` was created from the clean Goal 4 head.
- `implementation-goals/GOAL-05-execution-plan.md` defines the source implementation plan.
- `reports/validation/GOAL-05-pre-coding-gate.md` records the pre-coding gate result.
- Catalog source inspection found no existing warehouse availability integration under `src/`.
- Warehouse source/docs inspection confirmed `POST /api/stock/availability/batch` exists and is protected by the global JWT roles guard.
- Planned implementation is additive and schema-neutral: validate Catalog product IDs, call Warehouse batch availability once, and return warehouse-sourced availability without storing stock truth in Catalog.


### Goal 5 Source Implementation Evidence

- Added protected `POST /api/products/availability/batch` as an additive Catalog contract.
- Added `ProductsService.findIdentitiesByIds` so Catalog proves product IDs before Warehouse use.
- Added Warehouse batch availability client that calls Warehouse once per request and reads service credentials from runtime env only.
- Response items include Catalog SKU metadata and `source: "warehouse"`; stock totals and warehouse rows remain Warehouse-sourced.
- No Catalog stock quantity, reservation, movement, or warehouse-location persistence was added.
- Validation passed: `npm test -- --runInBand` 4 suites/15 tests, `npm run build`, and `git diff --check`.

### Goal 5 Deployment Evidence

- Commit `874e080` deployed with `./scripts/deploy.sh`.
- Production rollout and deploy health check passed.
- Safe production smoke verified `/health` `200` and anonymous `POST /api/products/availability/batch` `401`, confirming the endpoint is deployed and protected.
- Full authorized Warehouse runtime smoke is deferred until explicit approval for production synthetic product mutations and runtime credential use.

### Goal 6 Planning Evidence

- Branch `feature/catalog-goal-06-flipflop-catalog-projection` was created from the Goal 5 closure head.
- `implementation-goals/GOAL-06-execution-plan.md` defines the source implementation plan.
- `reports/validation/GOAL-06-pre-coding-gate.md` records the pre-coding gate result.
- Catalog inspection confirmed available inputs: product reads, deterministic current pricing, channel readiness, and Warehouse-sourced availability.
- FlipFlop inspection confirmed current consumers expect `name`, `price`, `stockQuantity`, image URLs, categories, SEO/tags, and timestamps, with separate Catalog and Warehouse client calls today.
- Planned implementation is additive and contract-focused: Catalog may expose a FlipFlop projection surface, but FlipFlop storefront, cart, checkout, and UX stay in FlipFlop.


### Goal 6 Source Implementation Evidence

- Added protected `POST /api/products/projections/flipflop/batch` as an additive Catalog contract.
- Added typed projection contracts and focused Jest coverage.
- Projection composes Catalog product truth, deterministic current pricing, FlipFlop readiness, and Warehouse-sourced availability.
- Compatibility aliases remain projection-only: `title` to `name`, current Catalog price to `price`, and Warehouse `totalAvailable` to `stockQuantity`.
- Existing product read envelopes remain unchanged and no FlipFlop source code was changed.
- Validation passed: `npm test -- --runInBand` 5 suites/21 tests, `npm run build`, and `git diff --check`.

### Goal 8 Closure Evidence

- Commit `d5e82dc` added protected `POST /api/imports/reconciliation/dry-run`.
- Dry-run reconciliation reports create/update/skip decisions, SKU/product identity evidence, category matching, duplicate identity issues, missing fields, inline media rejection, pricing validation, and mass pricing human-review marker.
- Validation passed: focused import reconciliation spec, `npm test -- --runInBand`, `npm run build`, and `git diff --check`.

### Goal 9 Closure Evidence

- Commit `47b9c93` added `scripts/catalog-smoke.js` and `npm run smoke:e2e`.
- Merge commit `89e9f24` was deployed to production.
- Post-deploy smoke against `https://catalog.alfares.cz` passed: 9 passed, 0 skipped, 0 failed.
- Smoke covered health, product search/detail, pricing envelope, media envelope, protected mutation rejection, Warehouse availability protection, FlipFlop projection protection, and Bazos draft protection.

### Goal 10-13 Closure Evidence

- Goal 10/11 projection isolation, Goal 12 Warehouse stock coverage read model, and Goal 13 Warehouse stock coverage audit are merged into the deployed main line.
- Catalog forwards Warehouse-owned stock origin and logistics data without owning stock, reservations, movements, warehouse locations, or fulfillment logic.
- Coverage diagnostics remain Warehouse-backed and non-mutating.

## Goal 16 Source Evidence

- Added a sanitized contract monitor wrapper around the existing smoke contracts.
- Added `npm run monitor:contracts`.
- Added Kubernetes CronJob manifest for recurring drift checks.
- Updated deployment manifest application to include the CronJob.
- Validation passed: anonymous monitor, authorized runtime-token monitor, default smoke, Jest, build, CronJob server dry-run, diff check, and sensitive-pattern scan.

## Goal 16 Runtime Evidence

- Source merged to `main` with `baad7fb`.
- Final deployment from `f6abce4` completed successfully.
- Live manual Job from `cronjob/catalog-contract-monitor` passed anonymous and authorized profiles.
- CronJob schedule is `*/30 * * * *` and not suspended.

## Next Goal Selection

No numbered goal remains pending. Next valid work is owner review, scheduled monitor observation, or creating the next owner-approved goal.
