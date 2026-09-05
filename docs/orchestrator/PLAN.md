# Catalog Implementation Plan

## 2026-06-30 - Goal 19 Canonical Content Connectors

Active goal: canonical JSON product descriptions with marketplace connector renderers and previews across Catalog plus channel services.

Saved plan: `implementation-goals/GOAL-19-execution-plan.md`.

Current execution state: Catalog core source is implemented on `feature/catalog-goal-19-canonical-content-connectors`. It adds `products.description_rich`, canonical content document normalization, connector renderers, protected content preview endpoints, Catalog product-detail preview UI, and generated description use for Bazos/Allegro draft preparation when no explicit override is supplied. Channel service source integrations are also implemented for Allegro, Bazos, Aukro, and FlipFlop so each channel can request the Catalog canonical preview and show channel-local preview evidence before draft/publish actions.

Parallel execution:

- Lane A Catalog schema/renderers/UI: source complete, validation passed.
- Lane B Allegro local preview/draft rendering: source complete, validation passed in worker `019f1a1e-f607-7063-98ac-58475ad1c2a3`.
- Lane C Bazos local preview/draft rendering: source complete, validation passed in worker `019f1a1f-21a9-7991-8f5a-37bbd6cb1715`.
- Lane D Aukro local preview/draft rendering: source complete, validation passed in worker `019f1a1f-939e-7e41-a5e2-036f9902597a`.
- Lane E FlipFlop product-service/admin preview: source complete, validation passed in worker `019f1a1f-c418-70c3-8cf0-4dd270a273c4`.
- Lane F final integration/deploy readiness: isolated Catalog deploy candidate created at `/home/ssf/Documents/Github/catalog-goal19-deploy` on `codex/catalog-goal-19-deploy`; validation passed and runtime migration/deploy is next.

Validation evidence for Catalog core: `git diff --check` passed; focused renderer/product tests passed 2 suites/24 tests; full Jest passed 9 suites/70 tests; backend `npm run build` passed; frontend `./node_modules/.bin/tsc --noEmit` passed after Next build regenerated `.next/types`; frontend `npm run build` passed with existing multiple-lockfile warning only.

Channel validation evidence: Allegro passed `git diff --check`, IPS audit, IPS pre-coding gate, catalog sell-action spec, service build, and frontend build. Bazos passed `git diff --check`, shared build, Bazos/Aukro service build, and focused Bazos catalog sell-action tests. Aukro passed shared build, service tests, service build, strict IPS doc audit, pre-coding gate, deployment-readiness gate, and `git diff --check`. FlipFlop passed pre-coding gate, strict IPS doc audit, `git diff --check`, product-service build, and frontend build.

Current blockers: runtime Catalog migration/deploy not yet run; original Catalog worktree still contains unrelated or concurrent changes outside Goal 19 (`services/frontend/app/dashboard/admin/page.tsx`, `src/auth/auth.service.ts`, and Goal 20 bulk marketplace publication files), so deployments must use the isolated Goal 19 worktree. Aukro worktree also contains concurrent TASK-013 bulk publish candidate docs outside the Goal 19/TASK-012 lane.

## 2026-06-29 - TASK-STOCK-004 Warehouse Stock Propagation Active Goal

Active goal: Warehouse-backed product stock amounts and oversell prevention across Catalog and sales channels.

Saved plan: `docs/orchestrator/TASK-STOCK-004-warehouse-stock-propagation-plan.md`.

Current execution state: Catalog product detail and live availability endpoint show Warehouse `60/0/60` for the target product; Orders reservation gate is deployed and verifier coverage now proves insufficient-stock Warehouse reserve responses fail closed without leaking Warehouse details; Allegro local draft quantity is capped to Warehouse availability at prepare/edit/reuse time; Bazos catalog-origin draft quantity is capped to Warehouse availability at prepare/reuse time and deployed at `bazos-service@b15681c`; Aukro create/sync/publish policy paths already read Warehouse availability; the deployed Warehouse stock authority verifier, Allegro current-stock audit, guarded import command, Allegro Warehouse verifier, and Catalog central multi-product stock smoke prove configured Allegro accounts expose 9 unique stock-authoritative offers totaling 496 units, all 9 are mapped, Warehouse stock rows total 496 with zero reserved, Warehouse latest movements are `ALLEGRO_OFFER_STOCK_IMPORT`, Warehouse stock outbox rows are published, Allegro already matches Warehouse for all 9, Catalog/FlipFlop projections match Warehouse for all 9, Catalog read-only channel status envelopes match Warehouse for those products across FlipFlop, Allegro, Bazos, and Aukro, and Heureka readiness `availableStock` matches Warehouse for the same 9 products; physical stock beyond that is blocked on `[MISSING: authoritative BizBox/current stock export, real supplier source, or correctly authorized additional Allegro seller account]`.

Parallel next work: Lane A Allegro Imports public BizBox CSV upload/preview is deployed; Lane B BizBox source discovery found no source file; Lane C has a guarded Allegro current-stock Warehouse import command plus Warehouse-side and Allegro-side read-only verifiers ready; the 9 current authoritative offers already match Warehouse, while complete-stock import remains dependency-gated on owner-provided current stock source and authority confirmation; Lane D Suppliers real-source onboarding is dependency-gated; Lane E final validation now includes the Warehouse stock authority verifier, Allegro Warehouse verifier, and the single Catalog central stock/channel/Heureka smoke after any approved import.

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

## 2026-06-29 - Final Stock Acceptance Gate Runner

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: prevent selling more units than Warehouse can fulfill while keeping Warehouse as stock authority.
- Goal Impact: give the orchestrator one repeatable read-only gate that proves Allegro current-stock import evidence, Warehouse stock authority rows, and Catalog/channel propagation agree before any stock-sensitive release.
- System: `catalog-microservice` owns the central ops runner; `warehouse-microservice`, `allegro-service`, Catalog, FlipFlop/Bazos/Aukro/Heureka projections remain the validated systems under test.
- Feature: `scripts/run-stock-acceptance-gates.sh` runs the already-deployed verifiers in their live pods and emits `stock-acceptance-gates.v1`, including Catalog credential wiring, Auth/Warehouse/Allegro/Catalog deployment image evidence, and channel propagation status.
- Task: default the gate to the 9 current Allegro-authoritative product IDs and their expected Warehouse totals: `124,87,50,25,110,60,10,3,27`.
- Execution Plan: verify Catalog stock credential wiring by manifest source/key and runtime key names, select only running pods matching the current deployment image, run Warehouse authority verifier, run Allegro current-stock dry-run with `--verify-warehouse`, run Catalog authorized stock/channel/Heureka smoke, then parse each JSON result and fail closed on mismatches.
- Coding Prompt: add a read-only ops script plus `npm run verify:stock-acceptance:gates`; do not add stock mutations, DB writes, deploy manifests, schema changes, or secret printing.
- Code: `scripts/run-stock-acceptance-gates.sh`; `package.json` script entry.
- Validation: `bash -n`, `git diff --check`, focused Catalog Warehouse availability spec, `npm run build`, and Catalog deploy passed. Current live read-only acceptance gate against Allegro image `localhost:5000/allegro-service:c0d4953` still fails at the Catalog propagation leg because Warehouse rejects all configured Catalog Warehouse credentials. Warehouse authority and Allegro-vs-Warehouse verification pass for the 9-product set with `totalAvailable=496` and `warehouseMatches=9`.
- Current follow-up: the gate includes read-only Catalog stock credential wiring, Catalog Warehouse credential preflight, and Auth deployment image evidence so the `stock-acceptance-gates.v1` summary reports both runtime secret source readiness and Auth/Warehouse acceptance by environment key name without printing token values. This does not replace the owner-approved service-principal/token provisioning lane.

Parallel execution:

- Ready now: central acceptance gate validation in Catalog ops script. Owner role: orchestrator/integration. Allowed files: `scripts/run-stock-acceptance-gates.sh`, `package.json`, `docs/orchestrator/PLAN.md`, `docs/orchestrator/STATUS.md`.
- Dependency-gated: passing Catalog propagation acceptance. Blocker: `[MISSING: valid Auth-issued or owner-approved machine credential for Catalog-to-Warehouse calls]`.
- Dependency-gated: adding new products beyond the 9 current Allegro-authoritative items. Blocker: `[MISSING: complete physical stock authority source beyond current Allegro product-offers]`.
- Blocked: automatic sales-channel stock push for products absent from Warehouse. Blocker: `[MISSING: source data and owner-approved import for remaining physical stock]`.
- Final integration: rerun the gate after every stock import/deploy and before enabling publish/sellable actions for a new product set.

Continuation lanes:

- Ready with explicit owner approval: Warehouse machine-auth receiver lane. Objective: accept Catalog as a service actor for Warehouse read-only availability/logistics calls using the approved machine-identity contract, then rerun `npm run verify:stock-acceptance:gates`. Forbidden without approval: broad admin bypass, accepting static tokens for mutations, or treating machine tokens as human Auth users.
- Ready now: Catalog stock credential wiring preflight. Owner role: orchestrator/integration. Allowed files: `scripts/check-stock-credential-wiring.sh`, `package.json`, `docs/orchestrator/PLAN.md`, `docs/orchestrator/STATUS.md`. Objective: make the post-approval token mount path verifiable by manifest path/property and runtime key names only, without reading token values.
- Ready now: Catalog Warehouse token mount runbook. Owner role: orchestrator/integration. Allowed files: `docs/orchestrator/TASK-STOCK-004-catalog-warehouse-token-runbook.md`, `docs/orchestrator/PLAN.md`, `docs/orchestrator/STATUS.md`. Objective: make the owner-approved runtime credential lane executable without secret disclosure or contract drift.
- Ready with explicit read approval: Suppliers source audit lane. Objective: read sanitized supplier/import metadata to determine whether a real BizBox/current-stock/supplier source exists. Forbidden: running imports, applying Warehouse stock, reading decoded supplier credentials, or dumping production payloads.
- Dependency-gated: supplier/BizBox import implementation. Objective: map an owner-approved source payload into Suppliers/Warehouse stock candidates and apply only after validation and explicit mutation approval. Blocker: `[MISSING: real source contract and approval]`.
