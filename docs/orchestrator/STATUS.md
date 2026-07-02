## 2026-07-03 - Goal 25 Product Quality Review Admin Closed

Change: closed Catalog Goal 25 after the W5 runtime deploy/read-smoke closure and final channel-state sweep. The execution plan now marks Goal 25 complete, with backend policy/API, validation/reporting, admin UI, and all five channel consumer lanes accepted.

Intent Preservation Chain: Vision - Catalog remains product truth for sellable content/readiness. Goal Impact - incomplete products and channel paths fail closed on mandatory quality blockers. System - Catalog owns quality/readiness while Warehouse/Auth/channel services keep their boundaries. Feature - Product Quality Review Admin and `catalog.product_quality.v1` consumer adoption. Task - close W5 from recorded runtime evidence. Execution Plan - `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`. Coding Prompt - docs-only closure, no deployment or mutation. Code - status/goal/plan docs only. Validation - `git diff --check` and prior runtime evidence in `reports/validation/VAL-GOAL-25-W4-import-channel-consumers.md`.

Boundary decision: no Catalog deploy, production data mutation, Warehouse mutation, marketplace publish, draft confirm, queue action, destructive command, or secret output was performed for this closure. Side-effect-risk authenticated draft/publish-path smokes remain out of scope unless separately approved with a safe scenario.

Final runtime refresh: Heureka advanced concurrently after the earlier `cf14a73` sweep and is now live healthy on tag `336fc90` for service/api-gateway. The Heureka repo is `main...origin/main` at `336fc90` with unrelated dirty public dashboard/controller files left untouched.

Next action: No Goal 25 action needed.

## 2026-07-03 - Goal 25 Live Authorized Smoke Refresh

Change: aligned Allegro runtime with Goal 25 source commit `5d189ee` and reran protected Catalog live smokes. Allegro service, api-gateway, settings, imports, and frontend rollouts completed on image tag `5d189ee`.

Validation evidence: Allegro diff check, focused Goal 25 specs, shared build, and service build passed. Catalog authorized smoke passed with 11 pass / 4 skip / 0 fail. Read-only channel-status smoke passed with 19 pass / 1 skip / 0 fail. Live product-quality API validation passed in read-only API mode with products=60, blocked=45, readyForActivation=15, blockers=[].

Boundary: Bazos authorized draft smoke remained skipped because it is side-effect-risk. No marketplace publish/confirm/queue action, Warehouse mutation, production data mutation, or Auth/RBAC change was performed.

Next action: no Goal 25 action remains unless owner wants side-effect-risk Bazos draft smoke or marketplace-account-specific live checks.

## 2026-07-03 - Goal 25 W4 Cross-Channel Subagent Rollup Complete

Change: completed the Goal-driven subagent rollup for all Catalog product-quality channel consumers. Allegro, Aukro, FlipFlop, and Heureka returned clean pushed handoffs after the previously accepted Bazos lane. W4 channel consumer implementation/validation is now complete; W5 remains limited to deploy-readiness/runtime smoke decisions where source commits are not deployed.

Validation evidence: Allegro `5d189ee` guards local draft creation, sell-action prepare/edit/confirm, lifecycle confirm/queue/execute, and legacy publish-adjacent routes with focused sell-action/lifecycle/policy/offers specs and service build passing. Aukro `f276a8c` records direct create/update/sync plus publish-adjacent fail-closed coverage with service spec, service build, full service test, IPS gates, and diff check passing. FlipFlop `3462917` expands blocker verification across policy normalization, selection, offer filtering, publish dry-run/status, reconciliation, shared/product-service/frontend builds, IPS gates, and diff check. Heureka `7ea1f79` refreshes validation after feed/dashboard/source checks passed with shared/service builds and blocker-lane verifier. Bazos remains complete/deployed at `b3576a6` with image `localhost:5000/bazos-service:b583b10`.

Boundary: no Catalog deploy, Catalog backend source mutation, marketplace publish/confirm/queue action, Warehouse mutation, production data mutation, Auth/RBAC change, destructive command, or secret output was performed in this subagent rollup. Channel deployment state is mixed: Bazos/Aukro have deployed evidence; Allegro/Heureka/FlipFlop source validation is complete but this thread did not run deploys.

Next action: run owner-approved W5 deployment/runtime smoke only for channels whose latest Goal 25 commits are not yet deployed, or keep Goal 25 source accepted if deployment is intentionally deferred.

## 2026-07-03 - Goal 25 W5 Cross-Channel Acceptance Refresh

Change: refreshed W5 evidence after Aukro Goal 25 consumer deployment and generated-description state resolution. Catalog contract now resolves generated descriptions through `catalog.generated_description_state.v1` backed by `Product.descriptionRich`; channel consumer ownership boundaries remain unchanged.

Validation evidence: Catalog product/import focused tests passed with 2 suites / 49 tests, Catalog build passed, synthetic `validate:product-quality` passed with products=3 blocked=2 readyForActivation=1, Allegro catalog sell-action spec passed, Bazos focused shared tests passed with 3 suites / 67 tests, Aukro focused service tests passed and runtime health returned HTTP 200 on image `localhost:5000/aukro-service:4cdd671`, Heureka feed readiness self-test plus shared/service builds passed, and FlipFlop product-quality blocker verification plus shared/product-service builds passed.

Boundary: no marketplace publish/confirm/queue action, Warehouse mutation, production data mutation, Auth/RBAC change, or secret output was performed.

Next action: keep Goal 25 accepted unless a live authorized smoke uncovers a runtime-only channel issue; marketplace/account blockers remain channel-owned.

## 2026-07-03 - Goal 25 Bazos Product Quality Consumer Lane Closed

Change: accepted the Bazos channel consumer handoff for Catalog Goal 25 and marked that lane complete. Bazos is clean and synced on `main` at `b3576a6`, with Catalog product-quality blockers consumed before prepare, confirm, and publish-adjacent queue paths. Bazos-created Catalog products remain draft/non-active, and the runtime maps `CATALOG_INTERNAL_SERVICE_TOKEN` from the existing Auth secret for protected Catalog readiness calls.

Validation evidence: Bazos durable report `reports/validation/2026-07-02-goal-25-bazos-product-quality-consumer.md` records `git diff --check` pass, Kubernetes ExternalSecret server dry-run pass, focused shared tests pass with 3 suites / 67 tests, shared build pass, `services/aukro-service` build pass from the Bazos monorepo command, pod-to-Catalog review endpoint HTTP 200, exact readiness endpoint HTTP 200 with issues array present, production health `status=ok`, and deployment ready=1 updated=1 available=1 on image `localhost:5000/bazos-service:b583b10`.

Boundary decision: no Catalog deploy, Catalog source mutation outside status/report docs, production DB mutation, Warehouse stock ownership change, product deletion, channel publication, or secret output was run by this orchestrator closure. Existing unrelated dirty `src/product-relations/*` files were left untouched.

Next action: continue Goal 25 cross-channel rollup for Allegro, Aukro, FlipFlop, Heureka, and final W5 integration after their handoffs are verified.

## 2026-07-02 - Goal 25 Product Quality Review Admin W1-W3

Change: completed and pushed the product-quality admin source slice through W3. Catalog now has the Goal 25 review/export/bulk-update/activate backend API, `npm run validate:product-quality` report generation, and a protected admin UI at `/dashboard/admin/product-review` with filters, owner report export, explicit selection, guarded bulk update controls, and activation through the Catalog quality gate.

Validation evidence: `npm test -- --runInBand src/products/products.service.spec.ts` passed with 1 suite / 41 tests; `cd services/frontend && npm run build` passed and listed `/dashboard/admin/product-review`; `git diff --check` passed. W3 validation details are recorded in `reports/validation/VAL-GOAL-25-product-quality-review-admin-ui.md`.

Boundary decision: no deploy, migration, production data mutation, Warehouse stock ownership change, product deletion, marketplace publication, queueing, confirmation, or secret output was run. Optional completeness fields remain separate from mandatory owner blockers. W4 import/channel consumer work is active in Codex thread `019f24ba-0695-7bc2-aff7-27d9df27ea9a`.

Next action: finish W4 import/channel consumer validation or bounded implementation, then run W5 full validation and deployment-readiness review.

## 2026-07-02 - Goal 25 Canonical JSON Propagation Runtime Closed

Change: confirmed the canonical JSON/manual marketplace override slice after the k3s recovery. The additive `manual_overrides`/`source_state` migration is applied, Catalog backend and frontend are available `1/1`, and the deployed marketplace-fields route is reachable behind Auth.

Validation evidence: `https://catalog.alfares.cz/health` returned HTTP 200 with `status=healthy` and product event outbox health `up`; `https://catalog.alfares.cz/` returned HTTP 200; anonymous `GET /api/products/00000000-0000-4000-8000-000000000001/marketplace-fields/bazos` returned protected HTTP 401 `Missing or invalid Authorization header`; post-recovery backend logs showed no fresh Goal 25 schema/relation errors; authenticated in-pod read-only smoke used `CATALOG_INTERNAL_SERVICE_TOKEN` without printing token values and returned HTTP 200 `success=true` for product `8edc51f2-bed2-433f-8a3c-5738b49a02e1` on `bazos` with `propagationStatus=current`, `fieldCount=10`, `manualFieldCount=0`, `staleFieldCount=0`, `profileHasManualOverrides=true`, and `profileHasSourceState=true`.

Boundary decision: no product rows, listing rows, Orders, Warehouse, Payments, channel publication, queueing, confirmation, or external marketplace state were mutated. No token values were printed.

Next action: continue with channel consumer adoption or stricter renderer source-hash comparison after consumers are ready.

## 2026-07-02 - Goal 24/25 Runtime Recovery And Smoke Closed

Change: confirmed k3s/node recovery after the earlier infrastructure incident. `alfares` node is `Ready`; `coredns`, `metrics-server`, and `local-path-provisioner` are `Running`; Catalog backend and frontend deployments are `1/1` available with service endpoints.

Validation evidence: external `https://catalog.alfares.cz/health` returned HTTP 200 with `status=healthy`; external Catalog frontend returned HTTP 200; anonymous related-products request returned HTTP 401 `Missing or invalid Authorization header`; protected in-pod non-mutating related-products smoke used the runtime internal token without printing it and returned HTTP 200 `{"success":true,"data":[]}` for product `8edc51f2-bed2-433f-8a3c-5738b49a02e1`.

Boundary decision: no relation rows were inserted, no product/order/payment/warehouse data was mutated, no token values were printed, and no marketplace publication was run. Goal 24 Catalog relation foundation is deployed and smoke-verified; relation scoring/backfill and bundle creation remain separate follow-up workstreams.

Next action: continue with the next ready related-products workstream: order-affinity scoring/backfill contract and safe producer/consumer integration.

## 2026-07-02 - C1 Orders Source Contract Closed

Change: Orders now implements the missing product-scoped `lifecycleStatistics` and `orderDeliveryStatistics` fields for `GET /api/orders/statistics/products/:productId`. Catalog already treats those fields as optional, aggregate-only, and fail-soft; no Catalog source change was required for this closure.

Validation evidence: Catalog consumer revalidation passed with `npm test -- --runInBand src/products/products.service.spec.ts` (1 suite, 39 tests), `npm run build`, and `cd services/frontend && npm run build` with only the existing Next.js multiple-lockfile workspace-root warning. Orders validation passed with `git diff --check`, `npm run build`, `npm run verify:product-sales-statistics`, and full `npm test`.

Deploy gate: live Catalog product-statistics smoke remains blocked until the Orders source contract is deployed/scaled in production after the Warehouse WH-G16 fulfillment-order deployment gate.

Next action: after the Warehouse/Orders deployment wave, run protected Catalog product-statistics smoke and confirm `lifecycleStatistics.sourceStatus=available` from live Orders.

## 2026-07-02 - C1 Catalog/Admin Order And Delivery Statistics

Change: extended the existing Orders-backed Catalog product sales statistics bridge and admin product panel for the C1 order/delivery statistics lane. Catalog now normalizes the current Orders product statistics response shape (`byChannel`, `byStatus`, `grossItemRevenue`, `lastOrderAt`) in addition to the older Catalog UI shape, renders product-level order status rows, and exposes lifecycle/payment/delivery aggregate slots only when Orders supplies product-scoped aggregate fields. When those fields are absent, the product page shows `[MISSING: Orders stats endpoint]` instead of using global Orders admin lifecycle summaries or inventing lifecycle/delivery counts.

Boundary decision: Orders remains the lifecycle, order status, payment status, channel, and delivery exception authority. Catalog does not store order rows, infer delivery state from stock/listings, call global lifecycle summaries as product facts, mutate Orders/Warehouse/Payments, or touch product-quality/manual-overrides/product-relations/local-resale/canonical JSON work. No deployment or push was run.

Validation evidence: `npm test -- --runInBand src/products/products.service.spec.ts` passed (1 suite, 39 tests); `git diff --check` passed; `npm run build` passed; `cd services/frontend && npm run build` passed with only the existing Next.js multiple-lockfile workspace-root warning.

Deploy gate: Orders source now provides the required product-scoped lifecycle/payment/delivery aggregates and channel-level lifecycle/delivery exception counts. C1 delivery/lifecycle detail remains fail-soft only until the Orders production deployment/scale-up and live Catalog product-statistics smoke complete.

Next action: deploy/scale Orders after the Warehouse WH-G16 gate, then rerun Catalog C1 live smoke and confirm real Orders lifecycle/delivery aggregates render in the product admin panel.

## 2026-07-02 - Goal 24/25 Deploy Recovery Follow-up

Change: after k3s briefly returned `Ready`, removed only stuck `Terminating` application pod API records in `statex-apps` with `kubectl delete pod --force --grace-period=0` to free the single-node pod limit. No DB, MinIO, Redis, PVC, deployment, service, secret, configmap, or stateful volume was deleted.

Validation evidence: pod slots freed enough for Catalog pods to move from unschedulable `Too many pods` to scheduled `ContainerCreating`, but Catalog backend/frontend endpoints remained empty. `kube-system` pods including `coredns`, `metrics-server`, and `local-path-provisioner` are also stuck in `ContainerCreating`, proving the remaining outage is k3s/containerd/CNI node runtime recovery, not Catalog application code.

Current runtime state: `systemctl is-active k3s` returns `active` and `kubectl get nodes` returns `alfares Ready`, but most pods are still `ContainerCreating`/init states without pod IPs; external `https://catalog.alfares.cz/health` returns Cloudflare HTTP 521. k3s logs show node relationship/status-manager errors for old pods and container runtime `NotFound` cleanup errors after the unclean restart.

Boundary decision: no root-level service restart, no host process kill, no secret/token read, no product/order/payment/warehouse mutation, and no marketplace publication was performed. Remaining repair requires operator-level access to restart/clean k3s/containerd/CNI state safely.

Next action: use an operator/root-capable session to repair k3s/containerd/CNI, then rerun Catalog rollout, external health, anonymous 401 guard, and protected non-mutating related-products smoke.

## 2026-07-02 - Goal 24/25 Catalog Deploy Attempt And Infrastructure Block

Change: after owner approval, applied the additive Goal 25 migration `scripts/migrations/20260702_marketplace_manual_overrides.sql` and the already-present product event outbox migration `scripts/migrations/20260702_catalog_product_event_outbox.sql` in addition to the previously applied Goal 24 `product_relations` migration. Backend source validation passed for product-relations and marketplace-fields focused Jest, backend `npm run build`, frontend `npm run build`, and `git diff --check`. Catalog backend deploy built and pushed `localhost:5000/catalog-microservice:9f89315` successfully; Catalog frontend deploy built and pushed `localhost:5000/catalog-frontend:a8b1675` successfully. A concurrent Catalog deploy later advanced the repo/runtime target to `363f50c`/intermediate deployment state.

Validation evidence: DB schema verification confirmed `product_relations` exists with 7 indexes, 9 constraints, and 0 rows; `product_marketplace_profiles.manual_overrides` and `source_state` exist with their GIN indexes; `catalog_product_event_outbox` exists with 9 indexes and 0 rows. External runtime checks initially returned Catalog `/health` 200 and protected related-products anonymous request 401 as expected.

Infrastructure block: during final rollout validation, the single-node k3s cluster moved to `NotReady`; `kubectl get nodes` reports `alfares NotReady`, Catalog backend/frontend deployments report `0/1` available, and external `https://catalog.alfares.cz/health` returns HTTP 503 `no available server`. k3s logs show repeated `Waiting for containerd startup` against `/run/k3s/containerd/containerd.sock`; `systemctl restart k3s` and `sudo -n systemctl restart k3s` are not available to this SSH user because interactive admin authentication is required. No destructive process kill or credential workaround was performed.

Boundary decision: migrations were additive only and inserted no relation/outbox rows. No Orders/Payments/Warehouse mutation, no bundle checkout behavior, no marketplace publication, no secret/token printing, and no forced k3s restart/kill was performed. Protected in-pod relation endpoint smoke remains blocked by Kubernetes node/runtime readiness, not by source build validation.

Next action: restore k3s/node readiness with an operator account that can restart or repair k3s/containerd, let the active Catalog rollout finish, then rerun Catalog health, frontend, anonymous 401 guard, and protected non-mutating related-products smoke.

## 2026-07-02 - Goal 24 Product Relations Runtime Migration

Change: applied additive Catalog migration `scripts/migrations/20260702_product_relation_scores.sql` to `catalog_db` after owner approval. The migration created `product_relations`, relation constraints, and relation indexes. It does not ingest Orders, create bundles, change checkout, mutate stock, publish to channels, or insert relation rows.

Validation evidence: `psql -U dbadmin -d catalog_db -v ON_ERROR_STOP=1` migration execution completed; schema verification confirmed `public.product_relations`, 7 indexes, 9 constraints, and `product_relation_rows=0`.

Boundary decision: no Catalog deploy, frontend deploy, runtime API smoke, secret print, product data mutation, Warehouse/Orders/Payments mutation, or external marketplace mutation was run.

Next action: deploy Catalog only after source review/staging, then run protected non-mutating relation endpoint smoke with an approved Auth token.


## 2026-07-02 Goal 25 Canonical JSON Propagation Source

Change: completed source implementation for manual marketplace override tracking and stale canonical source markers. Manual marketplace profile overrides now write `manual_overrides` metadata and `source_state`; marketplace field responses return propagation state and per-field manual/stale markers; Catalog frontend shows Manual and Source changed badges with a review warning.

Validation evidence: focused marketplace-fields Jest passed (`1` suite, `4` tests), backend `npm run build` passed, frontend `npm run build` passed with the existing multiple-lockfile warning only, and `git diff --check` passed.

Boundary decision: no production migration, deploy, channel draft, publish, queue, confirmation, Warehouse mutation, Orders mutation, or external marketplace mutation was run.

Next action: review/apply the additive migration and deploy Catalog only after approval, then run protected API/runtime smoke with an approved Auth token.

## 2026-07-02 - Goal 23 Alfares Default Source Guard

Change: restored the Goal 23 source contract after conflicting default-on commits. Newly provisioned seller settings keep Alfares products disabled by default while community products remain opt-in. The legacy-named migration `scripts/migrations/20260702_catalog_alfares_default_enabled.sql` sets `include_alfares_catalog DEFAULT false`, Catalog service/entity defaults are `includeAlfaresCatalog=false`, and Goal 23 contract/planning/validation docs are aligned. Existing `catalog_user_settings` rows are intentionally not bulk-updated because true or false may represent an explicit seller choice.

Validation evidence: `npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts` passed; `npm run build` passed; `cd services/frontend && npm run build` passed with only the existing Next.js multiple-lockfile warning; focused source-default grep and `git diff --check` passed.

Boundary decision: no Warehouse, Orders, Payments, Auth, marketplace publication, customer data mutation, or destructive DB operation is included in this correction. The migration changes only the database default for future settings rows and does not bulk-update existing seller settings.

Next action: deploy the fail-closed Catalog backend/frontend image and then validate channel repository integrations.

## 2026-07-02 - Goal 22/23 Catalog Runtime Deployment

Change: applied the fail-closed Catalog source model to production runtime. `catalog_user_settings` now exists with `include_alfares_catalog=false` and `include_community_catalog=false`; `products.resale_enabled=false` exists; owner-scope and resale indexes are present. Backend and frontend are deployed from `10c48de`.

Validation evidence: sequential migration rerun completed cleanly after an initial concurrent idempotent-index race; schema checks confirmed source defaults and indexes. `./scripts/deploy.sh` built/pushed `localhost:5000/catalog-microservice:10c48de`, rolled out successfully, and pod health returned `status=healthy`. `./scripts/deploy-frontend.sh` built/pushed `localhost:5000/catalog-frontend:10c48de` and rollout succeeded. Runtime smoke with a synthetic Auth user verified defaults false/false, effective product count 0 before opt-in, Alfares count 0 before opt-in, Alfares count 56 after explicit opt-in, and effective count 0 after disabling sources again.

Boundary decision: no product rows were created or mutated, no customer data was printed, token/password values were not printed, no Warehouse/Orders/Payments code changed, no channel repo deploy happened, and no live marketplace mutation was run. One synthetic Auth user remains as smoke evidence until an owner cleanup/retention decision is made.

Next action: integrate the deployed Catalog contract into Allegro, Aukro, Bazos, FlipFlop, and Heureka user-facing product pickers/callbacks, then run channel validation before any channel deploy.

## 2026-07-02 - Goal 23 Reseller Community Catalog Source

Change: implemented the corrected seller-community resale model in Catalog. Alfares products are disabled by default, products from other sellers are disabled by default, and a seller-owned product is visible to other sellers only when the owner enables resale on that product. Added `products.resale_enabled`, `catalog_user_settings.include_alfares_catalog`, `catalog_user_settings.include_community_catalog`, protected source settings/provision endpoints, `catalogScope=own|effective|alfares|community|all`, owner-only mutation guards for non-owned visible products, Catalog dashboard source checkboxes, `/dashboard/settings`, product create/edit resale checkboxes, and Goal 23 contract/planning/validation docs.

Validation evidence: `npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts` passed with 2 suites and 34 tests; `npm run build` passed; `cd services/frontend && npm run build` passed with only the existing Next.js multiple-lockfile warning; `git diff --check` passed.

Boundary decision: no production migration application, deployment, runtime smoke, token/secret read, production data mutation, Auth code change, Warehouse/Orders/Payments change, or channel repo source edit was performed. Existing dirty Goal 22/event files remain separate. Channel-service product pickers are ready follow-up lanes after Catalog contract review; Bazos remains blocked by its package JSON validation issue.

Next action: review/stage the Goal 23 Catalog source patch, then either deploy Catalog after migration approval or dispatch independent channel workers for Allegro/Aukro/FlipFlop and dependency-gated Bazos/Heureka.

## 2026-07-02 - Goal 22 W1 Catalog Backend Source

Change: implemented Catalog-side private user catalog settings and Alfares resale opt-in source scope. Added `src/catalog-access/*`, additive migration `scripts/migrations/20260702_catalog_user_settings.sql`, and product access changes for `catalogScope=own|effective|alfares`. Human users now default to own products only; `effective` includes shared Alfares products only after `includeAlfaresCatalog=true`; shared Alfares products are read-only for ordinary users; publication flows return `alfares_catalog_opt_in_required` when a user tries to publish a shared product without opt-in.

Validation evidence: `npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts` passed with 5 tests; `npm test -- --runInBand src/products/products.service.spec.ts` passed with 32 tests; `npm run build` passed; `git diff --check` passed.

Boundary decision: no migration application, deployment, runtime smoke, secret/token read, production data mutation, Auth fanout, channel repo edits, Warehouse/Orders/Payments changes, or public FlipFlop storefront changes were performed. The first validation report path was renamed to `reports/validation/VAL-GOAL-22-user-catalog-access.md` because repo `.gitignore` ignores filenames containing `private`.

Next action: review/stage the W1 source patch; then decide whether to run Catalog migration/deploy or start dependency-gated Catalog UI/Auth/channel workers.

## 2026-07-02 - Goal 22 Private User Catalogs And Alfares Resale Toggle Planning

Change: created the Goal 22 planning package for private user catalogs across Catalog, Auth, Allegro, Bazos, Aukro, FlipFlop, and Heureka. The planned contract keeps `products.owner_user_id IS NULL` as Alfares shared catalog rows, keeps `products.owner_user_id=<Auth subject>` as private user rows, and adds `catalog_user_settings.include_alfares_catalog=false` as the default disabled resale setting. New users should see an empty private product list until they create/import products or explicitly enable Alfares shared products.

Validation/planning evidence: local IPS standards and repo-local Catalog agent instructions were read; remote Catalog preflight was clean on `main` at `6f444f7`; cross-repo preflight found `auth-microservice` ahead of origin by 4 commits, `allegro`, `bazos`, and `flipflop` already dirty with unrelated catalog-event/proactive-consumer work, and `aukro`/`heureka` dirty in `reports/validation/ips-pre-coding-gate.json`. Bazos gateway validation has a current JSON parse blocker in `services/api-gateway/package.json`. Sub-agent explorers completed read-only Catalog, Auth, and sales-point investigations. No code, production migration, runtime data, deploy script, secret, Warehouse/Orders/Payments behavior, or channel repo file was changed in this planning step.

Parallel execution state: W0 contract/planning is active in the original thread. W1 Catalog backend implementation is ready now and owns `src/catalog-access/**`, `src/products/**`, `src/app.module.ts`, `scripts/migrations/20260702_catalog_user_settings.sql`, and Goal 22 validation docs. W2 Catalog frontend, W3 Auth provisioning decision, W4 sales-point repo workers, W5 FlipFlop seller/public boundary, W6 migration/deploy, and W7 cross-repo runtime validation are dependency-gated or final integration as defined in `docs/orchestrator/2026-07-02-private-catalog-cross-repo-plan.md`.

Boundary decision: first durable guarantee is Catalog lazy provisioning, not Auth distributed fanout. Sales points must forward the human bearer token and use Catalog effective scope for user-facing product pickers. Ordinary users must not edit/delete Alfares shared products even when resale is enabled.

Next action: implement W1 Catalog backend source with focused tests; do not deploy or start channel code workers until the Catalog API contract is validated.

## 2026-07-02 - Goal 21 Catalog Product Events Outbox

Change: implemented the Catalog-side product event contract and durable outbox producer foundation. Added `docs/contracts/catalog-events.md`, `implementation-goals/GOAL-21-catalog-product-events.md`, `implementation-goals/GOAL-21-execution-plan.md`, `reports/validation/GOAL-21-pre-coding-gate.md`, `reports/validation/VAL-GOAL-21-catalog-product-events.md`, `scripts/migrations/20260702_catalog_product_event_outbox.sql`, and `src/product-events/*`. `ProductsService` now records outbox event intents transactionally for product create/update/soft-delete/archive/hard-delete paths when the event publisher is injected.

Validation evidence: `npm test -- --runInBand src/products/products.service.spec.ts` passed with 1 suite and 28 tests; `npm run build` passed; `git diff --check` passed; direct changed-file control-character scan passed.

Boundary decision: Catalog remains product-truth owner only. No stock quantities/reservations/movements, channel publishing/compliance, Orders/Payments behavior, deploy scripts, secrets, production data mutation, migration application, RabbitMQ publisher runtime, or deployment was changed. Full runtime publishing remains blocked on `[MISSING: owner-approved Catalog event publisher runtime wiring and broker deployment contract]`. Migration and runtime health/readiness counters are also not applied/wired in this lane.

Next action: review and commit source scope, then plan the runtime publisher/migration/health-counter lane separately before any deployment.

## 2026-06-30 - Goal 19 Runtime Deployment And Preview Smoke

Change: deployed Goal 19 from isolated Catalog and Aukro worktrees to avoid unrelated dirty Goal 20/admin/auth changes. Catalog commit `03e3e6e` is live after applying additive `products.description_rich` migration and verifying the GIN index. Allegro commit `df078df`, Bazos commit `10514ac`, Aukro isolated commit `5fc56aa`, and FlipFlop commits `1580942`, `0c199ce`, and `e4f8781` are deployed.

Runtime evidence: Catalog in-pod content preview smoke for product `9715929e-cd7c-4c5e-be15-c08179127ec7` returned HTTP 200, `success=true`, and four previews: Allegro `html`, Bazos `plain_text`, Aukro `plain_text`, and FlipFlop `structured_blocks` with 32 blocks. FlipFlop deployment completed successfully after repairing gateway CMD layout, product-service Prisma client packaging, and product-service entrypoint layout tolerance; public `/` and `/api/products?limit=1` returned HTTP 200. Channel preview surfaces are deployed behind existing login/JWT guards; anonymous checks returned Allegro gateway 401, Bazos 401, Aukro 403, and FlipFlop preview route mapped with missing-token shared guard currently surfacing as 500.

Boundary decision: no raw legacy HTML cleanup, channel publish, Allegro confirmation, Bazos queueing, Aukro publication, FlipFlop storefront/checkout ownership change, stock mutation, price mutation, customer data read, or secret/token printing was performed.

Next action: Goal 19 is closed. Optional follow-up: normalize FlipFlop shared guard missing/invalid token errors to HTTP 401 instead of 500.

## 2026-06-30 - Goal 19 Canonical Content Connectors Catalog Core

Change: implemented the Catalog-owned canonical content connector core on `feature/catalog-goal-19-canonical-content-connectors`. Added additive `products.description_rich` migration, `descriptionRich` entity/DTO support, content document normalization, `src/content-connectors` renderer/controller/module, protected `GET /api/products/:productId/content-previews` and `GET /api/products/:productId/content-previews/:marketplace`, Catalog product detail content preview panel, and generated connector descriptions for Bazos/Allegro draft preparation when no explicit description override is provided.

Validation evidence: `git diff --check` passed; focused renderer/product tests passed 2 suites/24 tests; full Jest passed 9 suites/70 tests; backend `npm run build` passed; frontend `./node_modules/.bin/tsc --noEmit` passed; frontend `npm run build` passed with the existing Next.js multiple-lockfile warning only.

Parallel execution state: Allegro worker `019f1a1e-f607-7063-98ac-58475ad1c2a3`, Bazos worker `019f1a1f-21a9-7991-8f5a-37bbd6cb1715`, Aukro worker `019f1a1f-939e-7e41-a5e2-036f9902597a`, and FlipFlop worker `019f1a1f-c418-70c3-8cf0-4dd270a273c4` completed channel-service preview/draft lanes against the Catalog preview endpoint contract. Allegro now loads Catalog Allegro preview evidence for sell-action prepare/status/update/confirm responses, applies generated description only when no explicit override is supplied, fixes frontend confirm to send `{ previewToken }`, and shows Catalog preview/source/warnings without rendering the raw token. Bazos now fetches Bazoš preview text for guarded catalog sell-action UI and submits canonical plain text unless the seller edits it. Aukro now fetches Aukro preview text before draft creation and stores source evidence in catalog-origin draft snapshots. FlipFlop now exposes product-service/admin read-only Catalog preview and shows it in admin sync.

Validation evidence: Catalog core validation passed as above. Allegro passed `git diff --check`, `npm run ips:audit`, `npm run ips:pre-coding`, catalog sell-action spec, Allegro service build, and frontend build. Bazos passed `git diff --check`, shared build, service build, and focused Bazos catalog sell-action tests. Aukro passed shared build, service tests, service build, strict IPS doc audit, pre-coding gate, deployment-readiness gate, and `git diff --check`. FlipFlop passed pre-coding gate, strict IPS doc audit, `git diff --check`, product-service build, and frontend build.

Boundary decision: no production deployment, migration application, raw data cleanup, stock mutation, price mutation, channel publish, Bazos queueing, Allegro confirmation, Aukro publication, or FlipFlop checkout/storefront ownership change was performed. Unrelated or concurrent dirty files present and not touched by Goal 19 include `services/frontend/app/dashboard/admin/page.tsx`, `src/auth/auth.service.ts`, and Goal 20 bulk marketplace publication work.

Next action: commit isolated Goal 19 candidate, apply the Catalog migration/deploy sequence, then run runtime preview smoke.

## 2026-06-29 - TASK-STOCK-004 Final Stock Acceptance Gate Passed

Change: completed the owner-approved runtime credential lane and fixed the last Catalog channel-stock mismatch. Auth now has service principals for Catalog and Heureka with `internal:warehouse-microservice:admin`; their JWTs were written only to pod temp files, copied into Vault, shape-checked without printing values, synced through ExternalSecrets, and temp token/provisioner files were removed from the Auth pod. Catalog `WAREHOUSE_SERVICE_TOKEN` is sourced from `secret/prod/auth-microservice#CATALOG_WAREHOUSE_SERVICE_TOKEN`; Heureka `WAREHOUSE_SERVICE_TOKEN` was rotated at `secret/prod/heureka-service#WAREHOUSE_SERVICE_TOKEN`.

Code/deploy evidence: Catalog commit `0485f43` (`fix: source flipflop status stock from catalog projection`) makes `GET /api/products/:id/flipflop-status` use Catalog's Warehouse-backed FlipFlop projection instead of legacy public FlipFlop storefront stock. Catalog commit `bc61485` (`fix: avoid redundant catalog runtime npm install`) removes a redundant production-stage `npm install --omit=dev` that repeatedly failed with network `ECONNRESET`/`ETIMEDOUT` and was overwritten by copied builder `node_modules`. Standard Catalog deploy succeeded with image `localhost:5000/catalog-microservice:bc61485`; health returned healthy.

Validation evidence: `npm run verify:stock-credential:wiring` passed with Catalog image `bc61485`, Auth image `97ea521-20260629180327`, Warehouse image `8a66b27`, and expected Warehouse token source `secret/prod/auth-microservice#CATALOG_WAREHOUSE_SERVICE_TOKEN`. Final `npm run verify:stock-acceptance:gates` passed with `status=ok`, command statuses `catalogStockCredentialWiring=0`, `warehouse=0`, `allegro=0`, `catalogWarehouseCredential=0`, and `catalog=0`. Warehouse checked `9` products with `totalQuantity=496`, `totalReserved=0`, `totalAvailable=496`, and `expectedTotalsChecked=9`. Allegro dry-run verifier checked `3` accounts with `uniqueStockAuthoritativeOffers=9`, `stockAuthoritativeTotal=496`, `warehouseMatches=9`, `warehouseMismatches=0`, and `warehouseVerifyFailed=0`. Catalog smoke passed `59`, skipped `1`, failed `0`, checked `9` products, `38` channel statuses, and `9` Heureka readiness rows; `authorized-stock-consistency` passed with Warehouse and FlipFlop quantities matching, including target product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee=60`.

Boundary decision: no token values were printed, no stock quantity mutation was run in this final pass, no Warehouse reservation/order mutation was run, and no channel draft/publish/queue/confirmation was executed. Complete physical stock beyond the 9 currently Allegro-authoritative offers remains source-gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing additional current full offers]`.

Next action: use `npm run verify:stock-acceptance:gates` as the regression gate before further stock/channel changes; separately provide/authorize the missing complete physical stock source if stock beyond the 9 current Allegro-authoritative offers must be imported.

## 2026-06-29 - TASK-STOCK-004 Current Acceptance Snapshot After Allegro c0d4953

Change: reran the central read-only `npm run verify:stock-acceptance:gates` after Allegro advanced to `allegro-service@c0d4953` / image `localhost:5000/allegro-service:c0d4953`.

Validation evidence: the gate failed safely with exit `1` for the same Catalog credential blocker, while current Warehouse and Allegro evidence still passed. Deployment images: Auth `localhost:5000/auth-microservice:97ea521-20260629180327`, Catalog `localhost:5000/catalog-microservice:67c29f8`, Warehouse `localhost:5000/warehouse-microservice:8a66b27`, Allegro `localhost:5000/allegro-service:c0d4953`. Command statuses: `catalogStockCredentialWiring=1`, `warehouse=0`, `allegro=0`, `catalogWarehouseCredential=1`, `catalog=1`. Warehouse checked `9` products with `totalQuantity=496`, `totalReserved=0`, `totalAvailable=496`, and `expectedTotalsChecked=9`. Allegro checked `3` accounts and still reported `warehouseMatches=9`, `warehouseMismatches=0`, `warehouseVerifyFailed=0`. Catalog stock credential wiring still fails only because current `WAREHOUSE_SERVICE_TOKEN` source is `secret/prod/catalog-microservice#WAREHOUSE_SERVICE_TOKEN` while the post-approval target is `secret/prod/auth-microservice#CATALOG_WAREHOUSE_SERVICE_TOKEN`; Catalog Warehouse credential preflight still has `acceptedCandidate=null`.

Boundary decision: read-only validation only. No Auth helper execution, DB mutation, token issuance, Vault/Kubernetes secret mutation, ExternalSecret remap, deploy, stock import, reservation, or channel mutation was performed.

Next action: runtime execution remains owner-approval-gated via `docs/orchestrator/TASK-STOCK-004-catalog-warehouse-token-runbook.md`; complete physical stock beyond the 9 current Allegro-authoritative offers remains source-gated.

## 2026-06-29 - TASK-STOCK-004 Catalog Warehouse Token Mount Runbook

Change: added `docs/orchestrator/TASK-STOCK-004-catalog-warehouse-token-runbook.md`, a concrete approval-gated operator runbook for the remaining Catalog-to-Warehouse credential lane. It records the Auth helper command, target Auth-owned Vault property, Catalog ExternalSecret remap, deploy/force-sync sequence, and final `verify:stock-credential:wiring` plus `verify:stock-acceptance:gates` validation without exposing token values.

Validation evidence: `git diff --check` passed; `bash -n scripts/check-stock-credential-wiring.sh` passed; `bash -n scripts/run-stock-acceptance-gates.sh` passed; `npm run build` passed.

Boundary decision: documentation only. No Auth helper execution, DB mutation, token issuance, Vault/Kubernetes secret mutation, ExternalSecret remap, deploy, stock import, reservation, or channel mutation was performed.

Next action: runtime execution remains owner-approval-gated; use this runbook only after explicit approval for Auth DB/token issuance, Vault secret mutation, Catalog ExternalSecret remap, and Catalog deploy.

## 2026-06-29 - TASK-STOCK-004 Acceptance Gate Includes Credential Wiring

Change: integrated `npm run verify:stock-credential:wiring` into the central `npm run verify:stock-acceptance:gates` runner. The final `stock-acceptance-gates.v1` summary now reports the Catalog ExternalSecret source-path/property readiness for the future Auth-owned Warehouse token before the Warehouse, Allegro, Catalog credential, and channel propagation legs.

Validation evidence: `bash -n scripts/run-stock-acceptance-gates.sh` passed; `git diff --check` passed; `npm run build` passed. Live read-only `npm run verify:stock-acceptance:gates` failed safely with exit `1` and now reports `commandStatuses.catalogStockCredentialWiring=1`, `warehouse=0`, `allegro=0`, `catalogWarehouseCredential=1`, and `catalog=1`. The new `catalogStockCredentialWiring` summary failed only on the expected source checks: current `WAREHOUSE_SERVICE_TOKEN` source is `secret/prod/catalog-microservice#WAREHOUSE_SERVICE_TOKEN`, while the post-approval target is `secret/prod/auth-microservice#CATALOG_WAREHOUSE_SERVICE_TOKEN`. Warehouse still passed for `9` products with `totalQuantity=496`, `totalReserved=0`, `totalAvailable=496`, and `expectedTotalsChecked=9`; Allegro dry-run still reported `warehouseMatches=9`, `warehouseMismatches=0`, and `warehouseVerifyFailed=0`; Catalog Warehouse credential preflight still had `acceptedCandidate=null`.

Boundary decision: read-only gate integration only. It does not run the Auth provisioning helper, read or print secret values, alter Vault/Kubernetes secrets, deploy, import stock, mutate reservations, or publish channel listings.

Next action: after owner-approved Auth token provisioning and Catalog secret remap, rerun this single acceptance gate to prove credential wiring, Warehouse authority, Allegro import evidence, and Catalog/channel propagation together.

## 2026-06-29 - TASK-STOCK-004 Catalog Stock Credential Wiring Preflight

Change: added a read-only Catalog preflight for the approval-gated Catalog-to-Warehouse credential lane. `npm run verify:stock-credential:wiring` checks the `WAREHOUSE_SERVICE_TOKEN` ExternalSecret source path/property, confirms the existing Auth-owned `CATALOG_INTERNAL_SERVICE_TOKEN` pattern, reports runtime Kubernetes Secret key names only, and records Auth/Catalog/Warehouse deployment images without reading token values.

Validation evidence: `bash -n scripts/check-stock-credential-wiring.sh` passed; `git diff --check` passed; `npm run build` passed. Live read-only `npm run verify:stock-credential:wiring` failed safely with status `failed` only on the expected source checks: `WAREHOUSE_SERVICE_TOKEN` is currently mapped from `secret/prod/catalog-microservice#WAREHOUSE_SERVICE_TOKEN`, while the post-approval target is `secret/prod/auth-microservice#CATALOG_WAREHOUSE_SERVICE_TOKEN`. The same run passed `catalogInternalTokenAlreadyAuthOwned`, `runtimeSecretHasWarehouseServiceTokenKey`, `runtimeSecretHasCatalogInternalServiceTokenKey`, `externalSecretSynced`, and Auth/Catalog/Warehouse deployment readiness checks with images `localhost:5000/auth-microservice:97ea521-20260629180327`, `localhost:5000/catalog-microservice:67c29f8`, and `localhost:5000/warehouse-microservice:8a66b27`.

Boundary decision: this is a verifier only. It does not run the Auth provisioning helper, read or print secret values, alter Vault/Kubernetes secrets, roll deployments, bypass Warehouse auth, import stock, reserve stock, or publish channel listings.

Next action: use this preflight as the pre/post check around the owner-approved token provisioning lane; do not change the ExternalSecret mapping until the Auth-owned token property exists.

## 2026-06-29 - TASK-STOCK-004 Acceptance Gate Records Auth Deployment Evidence

Change: extended `scripts/run-stock-acceptance-gates.sh` so the `stock-acceptance-gates.v1` summary records the deployed `auth-microservice` image next to Warehouse, Allegro, and Catalog images. This ties the Catalog Warehouse credential preflight to the live Auth build expected to expose service actor projection for approved Catalog service principals.

Validation evidence: `bash -n scripts/run-stock-acceptance-gates.sh` passed; `git diff --check` passed; `npm run build` passed. Live read-only `npm run verify:stock-acceptance:gates` failed safely with exit `1` and emitted deployment images for Warehouse `localhost:5000/warehouse-microservice:8a66b27`, Allegro `localhost:5000/allegro-service:50b5858`, Catalog `localhost:5000/catalog-microservice:67c29f8`, and Auth `localhost:5000/auth-microservice:97ea521-20260629180327`. Warehouse verifier status was `0` for `9` products with `failedProductCount=0`; Allegro dry-run status was `0` with `warehouseMatches=9`, `warehouseMismatches=0`, and `warehouseVerifyFailed=0`; `catalogWarehouseCredential` status was `1` with `acceptedCandidate=null`; Catalog smoke status was `1` because no Catalog Warehouse credential candidate was accepted by Warehouse.

Boundary decision: this only adds read-only deployment evidence to the acceptance summary. It does not run the Auth provisioning helper, issue or print tokens, alter Vault/Kubernetes secrets, bypass Warehouse auth, import stock, mutate reservations, or publish channel listings.

Next action: with explicit owner approval, run the Auth service-principal/token provisioning lane, mount the resulting token through approved runtime secret management, roll Catalog, and rerun `npm run verify:stock-acceptance:gates`.

## 2026-06-29 - TASK-STOCK-004 Auth Service Principal Projection Deployed

Change: deployed Auth commit `97ea521` (`feat: prepare catalog warehouse service token provisioning`) so `/auth/validate` can expose service actor fields for approved `userType=service` principals and Auth has an approval-gated helper for Catalog-to-Warehouse service token provisioning.

Validation evidence: Auth deploy ran `npm run test:auth-contract` with 16 passing tests, built and pushed backend image `localhost:5000/auth-microservice:97ea521-20260629180327` and web image `localhost:5000/auth-microservice-web:97ea521-20260629180327`, rolled out both deployments ready `1/1`, public Auth `/health` returned `success=true,status=ok`, and running compiled backend code contains `resolveServiceIdentity`, `serviceIdentity`, and `auth-service-jwt`.

Boundary decision: no Auth helper execution, DB mutation, service-principal creation, role assignment, token issuance, Vault/Kubernetes secret value change, Catalog runtime config change, Warehouse import, stock mutation, reservation, or channel publish was performed. The Catalog acceptance credential preflight will still fail until an owner-approved Catalog service principal/token is provisioned and mounted.

Next action: with explicit owner approval, run Auth `scripts/provision-catalog-warehouse-service-token.ts --apply` using the guarded confirmations, store the token through approved runtime secret management, refresh Catalog runtime config, and rerun `npm run verify:stock-acceptance:gates`.

## 2026-06-29 - TASK-STOCK-004 Catalog Warehouse Credential Preflight Added

Change: extended `scripts/run-stock-acceptance-gates.sh` with a read-only Catalog Warehouse credential preflight. The gate now checks the deployed Catalog pod's configured Warehouse credential candidates by environment variable name only (`WAREHOUSE_SERVICE_TOKEN`, `WAREHOUSE_INTERNAL_SERVICE_TOKEN`, `JWT_TOKEN`, `CATALOG_INTERNAL_SERVICE_TOKEN`, `INTERNAL_SERVICE_TOKEN`), validates each candidate against Auth `/auth/validate` and Warehouse `POST /api/stock/availability/batch`, and includes a redacted `catalogWarehouseCredential` section in `stock-acceptance-gates.v1`.

Validation evidence: `bash -n scripts/run-stock-acceptance-gates.sh` passed; `git diff --check` passed; `npm run build` passed. Live read-only `npm run verify:stock-acceptance:gates` ran the updated script and failed safely with Warehouse status `0`, Allegro status `0`, Catalog Warehouse credential preflight status `1`, and Catalog smoke status `1`. The preflight reported `WAREHOUSE_SERVICE_TOKEN`, `JWT_TOKEN`, and `CATALOG_INTERNAL_SERVICE_TOKEN` present but rejected by Auth and Warehouse with HTTP `401`; `WAREHOUSE_INTERNAL_SERVICE_TOKEN` and `INTERNAL_SERVICE_TOKEN` were missing; `acceptedCandidate=null`. Warehouse authority still checked 9 products with `totalAvailable=496`, and Allegro dry-run still reported `warehouseMatches=9`, `warehouseMismatches=0`, and `warehouseVerifyFailed=0`.

Boundary decision: the preflight does not print token values and does not mutate Warehouse. It does not provision a credential, assign Auth roles, create a service principal, alter Vault/Kubernetes secrets, bypass Warehouse auth, import stock, reserve stock, or publish any channel listing. It makes the existing acceptance blocker machine-readable before the broader Catalog smoke fails.

Next action: validate, deploy the updated Catalog ops image if approved by source gates, rerun `npm run verify:stock-acceptance:gates`, and use the credential preflight result to confirm the remaining owner-approved runtime credential work.

## 2026-06-29 - TASK-STOCK-004 Supplier Source Recheck

Change: inspected current `suppliers-microservice@407b76f` source/docs after its current-head stock traceability closure. The generic REST/JSON adapter and synthetic traceability runtime evidence remain source/runtime complete for approved synthetic proof, but real physical stock onboarding is still data-gated.

Evidence: Suppliers docs state real supplier onboarding remains blocked until owner supplies supplier metadata, endpoint/runtime reference plan, credential refs, payload examples, mapping facts, and explicit runtime/import approvals. `TASK-002_DERIVED_REST_JSON_DETAILS.md` still lists `[MISSING: real supplier display name...]`, `[MISSING: private endpoint...]`, `[MISSING: authentication shape...]`, `[MISSING: sanitized examples...]`, and `[MISSING: warehouse/location mapping...]`.

Boundary decision: no Suppliers DB/API query, supplier import, credential read, production payload read, Catalog write, Warehouse mutation, or deployment was performed.

Next action: keep complete physical stock import blocked on owner-provided BizBox/current export, real supplier API contract, additional seller authorization, or explicit authority confirmation.

## 2026-06-29 - TASK-STOCK-004 Auth-Compatible Catalog Warehouse Token Path Prepared

Change: continued the Catalog propagation acceptance blocker through the safe Auth-compatible path. Read-only subagents confirmed Warehouse already supports the preferred receiver contract through Auth-validated bearer tokens and service actor fields, while Auth had no existing service-JWT provisioning endpoint or runbook for `catalog-microservice` with `internal:warehouse-microservice:admin`. Added and pushed Auth commit `212f719` (`chore: support internal role assignment dry runs`) so `scripts/assign-role-by-email.ts` can parse `internal:<service>:<role>` and run `--dry-run` for the future role shape `internal:warehouse-microservice:admin`.

Validation evidence: Auth helper compile command passed, shell wrapper `bash -n` passed, `git diff --check` passed, and Auth `npm run build` passed. The Auth commit is pushed to `origin/main`.

Boundary decision: no Auth DB mutation, role assignment, service principal creation, token issuance, Vault/Kubernetes secret mutation, Warehouse receiver bypass, Catalog runtime config change, deployment, decoded secret/JWT inspection, Warehouse import, stock mutation, reservation, or channel publish was performed. The stock acceptance gate is still blocked until an owner-approved Auth-compatible Catalog Warehouse credential is provisioned and mounted into Catalog runtime config.

Next action: with explicit owner approval, create or identify the Catalog service principal, assign `internal:warehouse-microservice:admin`, issue/rotate an Auth-compatible runtime token without printing it, update Catalog runtime config, then rerun `npm run verify:stock-acceptance:gates`.

# Catalog Orchestrator Status

## 2026-06-29 - TASK-STOCK-004 Warehouse Stock Authority Verifier Deployed

Result: added and deployed a read-only Warehouse live verifier at `warehouse-microservice@8a66b27`, with packaged command `npm run verify:stock-authority-live`. The verifier checks Warehouse DB stock rows, stock invariants, optional expected totals, latest movement evidence, stock-event outbox evidence, and active reservation totals without calling mutation endpoints.

Validation evidence: pre-deploy and post-deploy verifier runs against the 9 current Allegro-authoritative product IDs both passed with `checkedProductCount=9`, `failedProductCount=0`, `totalQuantity=496`, `totalReserved=0`, `totalAvailable=496`, expected totals checked for all 9, quantities `124`, `87`, `50`, `25`, `110`, `60`, `10`, `3`, and `27`, outbox status `published`, movement reason `ALLEGRO_OFFER_STOCK_IMPORT`, and no product issues. Deploy built/pushed `localhost:5000/warehouse-microservice:8a66b27`, ran migrations with no pending migrations, rolled out successfully, and health returned database/RabbitMQ up.

Boundary decision: verifier is read-only. No Warehouse import, stock mutation, reservation, order ingestion, channel draft, publish, queue, confirmation, or external marketplace mutation was run. This gives a Warehouse-side authority gate that complements the Allegro Warehouse verifier and Catalog central stock/channel/Heureka smoke. Complete physical stock beyond the 9 current Allegro-authoritative products remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing additional current full offers]`.

Next action: obtain/provide the missing complete physical stock source or additional seller authorization, then rerun Warehouse stock authority verifier, Allegro Warehouse verifier, and the single Catalog central stock/channel/Heureka smoke as final acceptance gates.

## 2026-06-29 - TASK-STOCK-004 Catalog Central Stock Smoke Includes Heureka

Result: deployed Catalog commit `5844e8a` (`test: include Heureka readiness in stock smoke`). The central `scripts/catalog-smoke.js` now has opt-in `CATALOG_SMOKE_ENABLE_HEUREKA_READINESS=true`, reads Heureka feed readiness per configured product, records `stockEvidence.heurekaReadiness`, compares Heureka `availableStock` against Warehouse `totalAvailable`, and fails if Heureka reports `STOCK_UNKNOWN` or `ZERO_STOCK` while Warehouse has positive availability.

Validation evidence before deploy: `git diff --check`, `node --check scripts/catalog-smoke.js`, `npm run build`, and default `npm run smoke:e2e` passed (`9` passed, `2` skipped, `0` failed). A pre-deploy in-pod read-only smoke copied the patched script into the previous Catalog pod and passed with `59` passed, `1` skipped, `0` failed; it checked `9` products, `38` per-product channel statuses, and `9` Heureka readiness rows.

Deployment evidence: `./scripts/deploy.sh` built and pushed image `localhost:5000/catalog-microservice:5844e8a` with digest `sha256:e4f82109d2f277f0bf6b89f21662146c30d78870a867e9c50e772fd8d32443d4`, rolled out successfully, and returned healthy status from the new pod.

Post-deploy smoke evidence: running deployed `scripts/catalog-smoke.js` inside the `5844e8a` pod with `CATALOG_SMOKE_AUTHORIZED=true`, `CATALOG_SMOKE_ASSERT_STOCK=true`, `CATALOG_SMOKE_ENABLE_CHANNEL_STATUS=true`, `CATALOG_SMOKE_ENABLE_HEUREKA_READINESS=true`, internal Catalog service token, internal Heureka base URL, and the 9 current Allegro-authoritative product IDs passed with `59` passed, `1` skipped, `0` failed. It checked product count `9`, channel statuses `38`, Heureka readiness rows `9`, and matched Heureka quantities `124`, `87`, `50`, `25`, `110`, `60`, `10`, `3`, and `27` against Warehouse.

Boundary decision: this was a read-only validation harness deployment and smoke. No Warehouse import, stock mutation, reservation, Heureka feed regeneration, order ingestion, channel draft, publish, queue, confirmation, or external marketplace mutation was run. Complete physical stock beyond the 9 current Allegro-authoritative products remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing additional current full offers]`.

Next action: obtain/provide the missing complete physical stock source or additional seller authorization, then rerun Allegro Warehouse verifier plus the single Catalog central stock/channel/Heureka smoke as final acceptance gates.

## 2026-06-29 - TASK-STOCK-004 Heureka Stock Readiness Live Verifier Deployed

Result: added and deployed a read-only Heureka live verifier at `heureka-service@92c0bb0` (`build: package Heureka verification scripts`, following `482f425 test: verify Heureka stock readiness live`). The verifier compares Heureka feed readiness `availableStock` with Warehouse `GET /api/stock/:productId/total`, defaults to product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`, supports comma-separated `HEUREKA_VERIFY_PRODUCT_IDS`, and fails if Heureka reports `STOCK_UNKNOWN` or `ZERO_STOCK` while Warehouse has positive stock.

Validation evidence before deploy: `git diff --check`, `node --check scripts/verify_heureka_stock_readiness_live.js`, `npm run verify:heureka-order-ingestion`, `npm --prefix shared run build`, and `npm --prefix services/heureka-service run build` all passed. Pre-deploy in-pod verifier copied into the old pod passed with Warehouse total available `60`, Heureka readiness available stock `60`, readiness `blocked`, and blockers `MISSING_CATEGORY` plus `SETTINGS_INACTIVE`.

Deployment evidence: Heureka deploy built and pushed `localhost:5000/heureka-service:92c0bb0` with digest `sha256:f9b18c2c2389fd91efc5d24583c3bfe7fd0904e1fd481cf76f9d5690370101e9`, applied manifests, rolled out successfully, and left the new pod ready `1/1`.

Post-deploy evidence: running packaged `npm run verify:heureka-stock-readiness-live` inside the `92c0bb0` pod returned contract `heureka-stock-readiness-live.v1`, checked product count `1`, Warehouse total available `60`, Heureka readiness available stock `60`, readiness `blocked`, and blockers `MISSING_CATEGORY` and `SETTINGS_INACTIVE`. This closes the live Heureka stock-readiness evidence for the target product; the remaining Heureka blockers are feed metadata/settings blockers, not stock propagation blockers.

Extended evidence: the same packaged verifier passed for all 9 currently Allegro-authoritative Catalog product IDs. Warehouse totals matched Heureka readiness for every product with quantities `124`, `87`, `50`, `25`, `110`, `60`, `10`, `3`, and `27`; every product remained blocked only by `MISSING_CATEGORY` and `SETTINGS_INACTIVE`, with no `STOCK_UNKNOWN` or `ZERO_STOCK` blocker.

Boundary decision: verifier is read-only. No Heureka order ingestion, feed regeneration, Warehouse stock import/mutation, reservation, channel draft, publish, or external marketplace mutation was run. Complete physical stock beyond the 9 current Allegro-authoritative products remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing additional current full offers]`.

Next action: obtain/provide the missing complete physical stock source or additional seller authorization, then rerun Allegro Warehouse verifier plus Catalog multi-product stock/channel smoke and Heureka stock-readiness verifier as final acceptance gates.

## 2026-06-29 - TASK-STOCK-004 Catalog Multi-Product Channel Status Smoke Deployed

Result: deployed Catalog commit `2362f8b` (`refactor: enhance authorized channel status checks for multi-product support`). The smoke now checks read-only channel status per configured product instead of overwriting evidence by channel name, stores `stockEvidence.channelStatuses` by `channel:productId`, and compares each reported channel stock quantity to that product's Warehouse `totalAvailable`.

Validation evidence before deploy: remote `npm run build` passed. A pre-deploy in-pod read-only smoke copied the patched script into the previously deployed Catalog pod and passed with `50` passed, `1` skipped, `0` failed. It checked `9` products, `38` per-product channel status envelopes, and all `38` channel checks passed: FlipFlop `9`, Allegro `9`, Bazos `9`, Aukro `9`, plus `2` account/status checks.

Deployment evidence: `./scripts/deploy.sh` built and pushed image `localhost:5000/catalog-microservice:2362f8b` with digest `sha256:1ee8fc8a602b121d2bb5d7cf71c8d76b9ba7ecdcf1c371d52558ac487ae056ca`, rolled out successfully, and returned healthy status from the new pod.

Post-deploy smoke evidence: the deployed `2362f8b` image ran `scripts/catalog-smoke.js` with `CATALOG_SMOKE_AUTHORIZED=true`, `CATALOG_SMOKE_ASSERT_STOCK=true`, `CATALOG_SMOKE_ENABLE_CHANNEL_STATUS=true`, and the 9 currently Allegro-authoritative product IDs. Result: `50` passed, `1` skipped, `0` failed; `checkedProductCount=9`; `checkedChannelStatuses=38`; `stockEvidenceProducts=9`; `stockEvidenceChannelStatuses=38`; all channel status checks passed with no mismatches.

Boundary decision: this was a read-only validation harness deployment and smoke. No Warehouse import, stock mutation, reservation, channel draft, publish, queue, confirmation, or external marketplace mutation was run. It proves Catalog can validate Warehouse-to-channel read projections for all 9 currently mapped Allegro-authoritative products, but complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing additional current full offers]`.

Next action: obtain/provide the missing complete physical stock source or additional seller authorization, then rerun Allegro Warehouse verifier plus Catalog multi-product stock/channel smoke as final acceptance gates.

## 2026-06-29 - TASK-STOCK-004 Catalog Multi-Product Stock Smoke Deployed

Result: extended Catalog smoke to accept comma-separated `CATALOG_SMOKE_PRODUCT_IDS` for read-only batch Warehouse and FlipFlop projection checks. The existing single-product behavior remains compatible; default public smoke still passed. The new batch mode records per-product Warehouse quantity/reserved/available and FlipFlop projected stock, then fails if any product projection differs from Warehouse `totalAvailable`.

Validation evidence before deploy: `node --check scripts/catalog-smoke.js` passed; `git diff --check` passed; `npm run build` passed; default `npm run smoke:e2e` passed with `9` passed, `2` skipped, `0` failed. A pre-deploy in-pod read-only batch smoke using the Catalog internal service token passed for the 9 Allegro-authoritative product IDs with `12` passed, `2` skipped, `0` failed.

Deployment evidence: Catalog commit `9df5df2` (`test: support multi-product stock smoke`) was pushed and deployed. Live deployment image is `localhost:5000/catalog-microservice:9df5df2`; deploy health returned healthy. The new deployed pod `catalog-microservice-7dc7456d96-mgpvf` passed the same read-only 9-product stock smoke with `12` passed, `2` skipped, `0` failed.

Deployed smoke stock evidence: checked product count `9`; all 9 Warehouse totals matched FlipFlop projected stock. Per-product Warehouse/FlipFlop quantities were `124`, `87`, `50`, `25`, `110`, `60`, `10`, `3`, and `27`. Target product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` remained `warehouseAvailable=60`, `warehouseQuantity=60`, `warehouseReserved=0`, and `flipflopStockQuantity=60`.

Boundary decision: smoke was read-only. No Warehouse stock import, order reservation, channel draft, publish, confirmation, or external sales-channel mutation was run. This expands Catalog/FlipFlop propagation validation from the single target product to all 9 currently Allegro-authoritative products, but complete physical stock beyond those products remains gated on the missing source or additional seller authorization.

Next action: provide/authorize the missing complete physical stock source or additional Allegro seller account, then rerun Allegro Warehouse verifier plus Catalog multi-product smoke as acceptance gates.

## 2026-06-29 - TASK-STOCK-004 Allegro Warehouse Stock Verifier Deployed

Result: extended the guarded Allegro current-stock command at `allegro-service@50b5858` (`feat: verify Allegro stock against Warehouse`) with read-only `--verify-warehouse` mode. The verifier reuses the same authoritative Allegro source rules, then reads Warehouse `GET /api/stock/:productId/total` for each mapped Catalog product and reports `warehouseMatchesAllegro` per offer plus aggregate match/mismatch counts. It does not require `--apply`, does not write Warehouse, and does not update local Allegro rows.

Validation evidence: `npm --prefix services/allegro-service run build` passed; `npx prisma validate --schema prisma/schema.prisma` passed; `git diff --check` passed; the negative `--apply` guard still failed without `--confirm-apply ALLEGRO_CURRENT_STOCK_IMPORT`. Deploy completed successfully for Allegro service, API gateway, imports, settings, and frontend at image tag `50b5858`, all ready `1/1`; public `https://allegro.alfares.cz/` returned HTTP `200`.

Deployed verifier evidence: `node dist/scripts/import-current-allegro-stock-to-warehouse.js --all-accounts --dry-run --verify-warehouse --detail-limit 20` returned `mutatesWarehouse=false`, `mutatesLocalAllegroOffer=false`, `verifiesWarehouse=true`, `uniqueStockAuthoritativeOffers=9`, `stockAuthoritativeTotal=496`, `warehouseMatches=9`, `warehouseMismatches=0`, and `warehouseVerifyFailed=0`. Target offer `18106496345` / product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` had Allegro stock `60`, Warehouse total available `60`, and `warehouseMatchesAllegro=true`.

Boundary decision: no confirmed `--apply` was run and no Warehouse, local Allegro, account, token, offer, or channel mutation was performed. The verifier proves the 9 currently visible Allegro-authoritative offers are already in Warehouse and matching; it does not resolve stock beyond the configured Allegro accounts.

Next action: provide/authorize the missing complete physical stock source or additional seller account for stock beyond the 9 matching offers, then use the verifier as the post-import acceptance gate before final Catalog/channel validation.

## 2026-06-29 - TASK-STOCK-004 Allegro Stock Import Apply Confirmation Guard Deployed

Result: hardened the guarded Allegro current-stock Warehouse import command at `allegro-service@276ac21` (`fix: require confirmation for Allegro stock apply`). Warehouse mutation mode now requires both `--apply` and the exact phrase `--confirm-apply ALLEGRO_CURRENT_STOCK_IMPORT`; otherwise the command fails before Warehouse id resolution or any `POST /api/stock/set` call. Dry-run remains the default.

Validation evidence: `npm --prefix services/allegro-service run build` passed during deploy; `npx prisma validate --schema prisma/schema.prisma` passed; `git diff --check` passed; service-working-directory negative guard test returned status error `Refusing to apply without --confirm-apply ALLEGRO_CURRENT_STOCK_IMPORT`. Deployed images for Allegro service, API gateway, imports, settings, and frontend are all tag `276ac21` and ready `1/1`; public `https://allegro.alfares.cz/` returned HTTP `200`.

Deployed runtime validation: running `node dist/scripts/import-current-allegro-stock-to-warehouse.js --all-accounts --apply` in the new pod failed with the confirmation error and exit code 1. Running `--all-accounts --dry-run --detail-limit 20` in the new pod remained read-only with `mutatesWarehouse=false`, `mutatesLocalAllegroOffer=false`, `uniqueStockAuthoritativeOffers=9`, `stockAuthoritativeTotal=496`, `wouldSet=9`, and target offer `18106496345` mapped to product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` at stock `60`.

Boundary decision: no confirmed `--apply` was run, no Warehouse stock was mutated, no local Allegro rows were updated, no account/token/offer write operation was run. The mutation lane is now explicitly owner-approval-gated in code and runtime.

Next action: only after explicit owner approval, run `npm run import:current-stock:warehouse -- --all-accounts --dry-run`, record the plan totals, then run `--apply --confirm-apply ALLEGRO_CURRENT_STOCK_IMPORT` for the 9 currently authoritative offers or provide the missing complete-stock source for the broader import.

## 2026-06-29 - TASK-STOCK-004 Guarded Allegro Current Stock Warehouse Import Deployed

Result: added, pushed, and deployed a guarded Allegro current-stock-to-Warehouse import command at `allegro-service@c90c55e` (`feat: add guarded Allegro current stock Warehouse import`). The command is `npm run import:current-stock:warehouse -- --all-accounts --dry-run` by default; `--apply` is required before it calls Warehouse. It reads Allegro `/sale/offers` only to discover offer ids, treats only `/sale/product-offers/{offerId}.stock.available` as current stock-authoritative, deduplicates repeated accounts by Allegro offer id, requires local `AllegroOffer.catalogProductId` mapping, and records Warehouse audit intent with reason `ALLEGRO_CURRENT_STOCK_IMPORT`. Apply mode writes Warehouse `POST /api/stock/set` only; local AllegroOffer rows remain read-only.

Validation evidence: `npm --prefix services/allegro-service run build` passed; `npx prisma validate --schema prisma/schema.prisma` passed; `git diff --check` passed; pre-deploy in-pod dry-run passed with `mutatesWarehouse=false` and `mutatesLocalAllegroOffer=false`. Deploy completed successfully for Allegro service, API gateway, imports, settings, and frontend at image tag `c90c55e`, all ready `1/1`; public `https://allegro.alfares.cz/` returned HTTP `200`.

Deployed dry-run evidence from the new Allegro pod: `accountCount=3`; `stockAuthoritativeAppearances=27`; `uniqueStockAuthoritativeOffers=9`; `duplicateStockAuthoritativeAppearances=18`; `stockAuthoritativeTotal=496`; `wouldSet=9`; `applied=0`; `missingLocalOffer=0`; `missingCatalogMapping=0`; `applyFailed=0`. Target offer `18106496345` maps to Catalog product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` with Allegro current stock `60` and action `would_set_warehouse_stock`.

Boundary decision: no `--apply` run was performed, no Warehouse stock was mutated, no local Allegro rows were updated, no offers were imported, no account activation/token refresh was run, and no Allegro write API was called. This creates the approved-command lane for the currently authoritative 9 Allegro offers, but it does not solve the complete physical-stock source gap beyond 496 units.

Next action: obtain explicit owner approval to run `--apply` for the 9 current-stock-authoritative offers, or provide/authorize the missing complete physical stock source for the broader import; then rerun Warehouse/Catalog/channel consistency validation after the mutation.

## 2026-06-29 - TASK-STOCK-004 Orders Insufficient Stock Reservation Coverage

Result: strengthened Orders reservation-gate evidence for the explicit oversell case. Orders commit `1272309` (`test: cover insufficient stock reservation failure`) adds verifier coverage where Warehouse rejects `POST /api/reservations/reserve` with an insufficient-stock style response (`409`, `INSUFFICIENT_STOCK`, available/requested details). Orders now has focused verification that this remains a bounded failed handoff: `status=failed`, `reservedCount=0`, `failedCount=1`, `failureCode=warehouse_request_failed`, and no Warehouse response body, available quantity, requested quantity, or raw error text leaks into Orders handoff metadata.

Validation evidence: in `orders-microservice`, `npm run build` passed; `npm run verify:warehouse-handoff` passed; `npm run verify:order-reservation-gate` passed; `git diff --check` passed before commit. The Orders warehouse handoff contract doc now explicitly states that insufficient available stock causes sellable order creation to fail closed before `orders.order.created.v1` and does not make Orders the stock authority.

Boundary decision: this was verifier/docs-only. No Orders deployment was required and no live order, reservation, Warehouse stock, payment, or channel mutation was run. Runtime Orders deployment remains the previously deployed reservation gate; this change adds durable regression evidence for the oversell rejection path.

Next action: obtain the owner-approved complete physical stock source or authorize the missing seller account that exposes additional current full offers, then preview/import and rerun final stock consistency plus live reservation validation.


## 2026-06-29 - TASK-STOCK-004 Allegro Current Stock Source Audit Deployed

Result: added and deployed a read-only Allegro current stock source audit at `allegro-service@8614ea9` (`test: add Allegro current stock source audit`). The command `npm run audit:current-stock-source -- --all-accounts --detail-limit 500` lists configured Allegro accounts, reads `/sale/offers` across `ACTIVE`, `INACTIVE`, `ENDED`, and `ACTIVATING`, then checks `/sale/product-offers/{offerId}` details. It does not import offers, activate accounts, refresh tokens, write Warehouse stock, or mutate local rows. Only successful `product-offers.stock.available` is treated as current stock-authoritative evidence.

Deployment evidence: Allegro service, API gateway, imports, settings, and frontend all rolled out at image tag `8614ea9` and are ready `1/1`; public `https://allegro.alfares.cz/` returned HTTP `200`.

Live audit evidence from the deployed Allegro pod: `accountCount=3`; `listedOffers=27`; `detailChecked=27`; `detailOk=27`; `detail404=0`; `detailErrors=0`; account-summed `stockAuthoritativeOffers=27`, `stockAuthoritativeTotal=1488`; but unique by Allegro offer id is only `uniqueStockAuthoritativeOffers=9`, `uniqueStockAuthoritativeTotal=496`, with `duplicateStockAuthoritativeAppearances=18`. Unique current-stock offer ids are `18106037370`, `18106190486`, `18106229125`, `18106300892`, `18106436117`, `18106496345`, `18106529080`, `18106938601`, and `18231907833`. The target offer `18106496345` remains current-stock-authoritative at `60`.

Source conclusion: the currently configured Allegro OAuth accounts all expose the same 9 active stock-authoritative offers totaling 496 unique units. The 23 local order-history-only/statex rows remain non-authoritative for current physical stock. This confirms the expected 1000+ stock cannot be obtained from current configured Allegro accounts alone; final import still requires `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing additional current full offers]`.

Boundary decision: no Allegro import, Catalog write, Warehouse import, reservation, order mutation, draft preparation, publish, token refresh, or account activation was run.

Next action: obtain the owner-approved complete physical stock source or authorize the missing seller account that exposes additional current full offers, then preview/import and rerun the final stock consistency/reservation validation.


## 2026-06-29 - TASK-STOCK-004 Stock Consistency Smoke Added And Validated

Result: strengthened the read-only Catalog smoke with opt-in `CATALOG_SMOKE_ASSERT_STOCK=true` stock consistency assertions. The smoke now records Warehouse `totalQuantity`, `totalReserved`, and `totalAvailable`, records FlipFlop projection `stockQuantity`, records any stock quantity present in read-only channel status envelopes, and fails if FlipFlop or any reported channel stock differs from Warehouse `totalAvailable`.

Hosted-Auth live evidence: using Auth pod `TEST_EMAIL`/`TEST_PASSWORD` without printing credentials or token material, Auth `/auth/login` and `/auth/validate` succeeded with roles `app:allegro-service:admin`, `app:allegro-service:user`, `app:bazos-service:admin`, `internal:catalog-microservice:admin`, and `global:superadmin`. The read-only target smoke for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` passed with `18` passed, `1` skipped, `0` failed. Stock evidence was Warehouse `totalQuantity=60`, `totalReserved=0`, `totalAvailable=60`; FlipFlop projection `stockQuantity=60`; FlipFlop channel status `stockQuantity=60`, `warehouseSource=warehouse-microservice`; Allegro/Bazos/Aukro product status and Bazos/Aukro account status all returned HTTP `200` and preserved channel authority. `authorized-stock-consistency` passed with `checkedChannelStatuses=6`.

Validation evidence before commit/deploy: `node --check scripts/catalog-smoke.js` passed; `git diff --check` passed; `npm run build` passed; default `npm run smoke:e2e` passed with `9` passed, `2` skipped, `0` failed; target internal-token stock consistency smoke passed with `12` passed, `2` skipped, `0` failed; hosted-Auth target stock/channel smoke passed with `18` passed, `1` skipped, `0` failed. Catalog commit `d531d73` (`test: assert catalog stock consistency`) was pushed and deployed. Live deployment image is `localhost:5000/catalog-microservice:d531d73`, readiness is `1/1`, deploy health returned healthy, and the deployed in-pod smoke with `CATALOG_SMOKE_ASSERT_STOCK=true` passed with `12` passed, `2` skipped, `0` failed, Warehouse `60/0/60`, and FlipFlop `60`.

Boundary decision: the smoke is read-only. No Bazos draft, Aukro draft, Allegro draft, publish, queue, confirmation, reservation, Warehouse import, or stock mutation was run. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: obtain the owner-approved complete physical stock source, preview it through Allegro Imports, and run the approved Warehouse import plus final over-reservation/channel propagation validation.


## 2026-06-29 - TASK-STOCK-004 Bazos Draft Quantity Cap Validated

Result: closed the Bazos catalog sell-action oversell gap. Bazos catalog-origin draft preparation now reads Warehouse availability through `WarehouseClientService`, stores the local draft `stockQuantity` as `min(requestedQuantity, Warehouse totalAvailable)`, defaults missing requested quantity to Warehouse availability, and records `draftOptions.warehouseStock` with `source=warehouse-microservice`, `totalAvailable`, `requestedQuantity`, `quantity`, and `capped`. Reused local Bazos drafts are capped before returning to the confirmation path, and the sell-action response now includes the stored draft `stockQuantity`.

Aukro inspection result: no patch was required in this pass. Aukro `OffersService` already uses `warehouseClient.getTotalAvailable(productId)` for create-from-catalog, sync-from-catalog, draft policy evidence, and publish policy evidence. Publish remains gated by Warehouse stock availability and other policy checks.

Validation evidence: Bazos `npm --prefix shared test -- bazos-catalog-sell-action.service.spec.ts --runInBand` passed (`10` tests); `git diff --check` passed; `npm --prefix shared run build` passed; `npm --prefix services/aukro-service run build` passed. Commit `b15681c` (`fix: cap Bazos catalog stock to Warehouse availability`) was pushed and deployed. Live deployment image is `localhost:5000/bazos-service:b15681c`, readiness is `1/1` in namespace `statex-apps`, public `https://bazos.alfares.cz/` returned HTTP `200`, and the running pod compiled artifact contains `resolveWarehouseStock`, `warehouseStock`, and `warehouse-microservice` cap evidence.

Boundary decision: no Bazos draft prepare/confirm, publish queue, external Bazos submission, reservation, Warehouse import, or stock mutation was run. This closes another local channel quantity path, but final physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: obtain the owner-approved complete physical stock source, preview it through Allegro Imports, then run approved Warehouse import and final over-reservation/channel propagation validation.


## 2026-06-29 - TASK-STOCK-004 Product Detail And Allegro Draft Quantity Cap Validated

Result: verified the original Catalog product-detail requirement and closed an Allegro oversell gap. The live Catalog product page bundle for `/dashboard/products/884c1c5e-fe94-46c7-aab1-78bcc424e7ee` contains the Warehouse stock panel and calls `POST /products/availability/batch`. Running-pod Catalog backend evidence returned `totalQuantity=60`, `totalReserved=0`, `totalAvailable=60`, warehouse code `CODEX-OWN-011`, warehouse type `own`. Catalog frontend source also passed `npm --prefix services/frontend run build` with only the existing Next.js multiple-lockfile warning.

Allegro change: deployed `allegro-service@10009cb` (`fix: cap Allegro draft stock to Warehouse availability`). `CatalogSellActionService` now injects `WarehouseClientService`, enriches Catalog products with current Warehouse availability, caps explicit requested draft quantity and Allegro marketplace override quantity to Warehouse `totalAvailable`, and also reduces reused local drafts before publish preparation if their stored quantity is above Warehouse availability. Create/reuse draft metadata records `warehouseStock.source=warehouse-microservice`, `totalAvailable`, `requestedQuantity`, and whether the quantity was capped. No external Allegro publish call is made by prepare.

Validation evidence: Allegro `git diff --check` passed; focused `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/allegro-service/src/allegro/catalog-sell-action/catalog-sell-action.spec.ts` passed; `npm --prefix services/allegro-service run build` passed; `npm --prefix shared run build` passed. Deploy built/pushed and rolled out tag `10009cb` for `allegro-service`, `allegro-api-gateway`, `allegro-settings`, `allegro-imports`, and `allegro-frontend`. Live deployment image is `localhost:5000/allegro-service:10009cb`; public `https://allegro.alfares.cz/` returned HTTP `200`. Running-pod compiled artifact contains `capQuantityToWarehouse`, `getWarehouseAvailable`, `warehouse-microservice` stock evidence, and `Math.min` cap logic.

Boundary decision: no Allegro draft prepare/confirm, external publish, Warehouse import, reservation, order mutation, or stock mutation was run. This closes the local Allegro draft quantity path so it cannot prepare a quantity above Warehouse availability, but the complete physical stock source remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: obtain the owner-approved complete physical stock source, preview it through Allegro Imports, then run approved Warehouse import and final over-reservation/channel propagation validation.

## 2026-06-29 - TASK-STOCK-004 Heureka Readiness Stock Amount Validated

Result: fixed and deployed Heureka feed readiness so a missing local `heureka_settings` table no longer prevents read-only Catalog/Warehouse readiness checks. Heureka was deployed in two commits: `heureka-service@5afc3c1` keeps readiness available without the settings table, and `heureka-service@147da72` additively exposes `availableStock` and `settingsActive` on readiness items. Feed generation still requires active settings; only the read-only readiness endpoint tolerates the missing table and reports it as a blocker.

Validation evidence: `git diff --check` passed; `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts` passed; `LOGGING_SERVICE_URL=http://logging-microservice:3367 npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/feed/feed-readiness-settings.self-test.ts` passed; `npm --prefix services/heureka-service run build` passed; `npm --prefix shared run build` passed; `npm run verify:heureka-order-ingestion` passed. The `147da72` deploy script timed out during an intermediate ContainerCreating/runtime stall, but after deleting the stuck pending pod Kubernetes recreated it, and explicit `kubectl -n statex-apps rollout status deployment/heureka-service --timeout=30s` reported success. Live deployment image is `localhost:5000/heureka-service:147da72`; pod-local `/health` returned HTTP `200`.

Live target evidence: pod-local `GET /heureka/feed/readiness/products/884c1c5e-fe94-46c7-aab1-78bcc424e7ee` returned HTTP `200`, `success=true`, contract `catalog-feed-readiness.v1`, `feedType=heureka_cz`, `availableStock=60`, `settingsActive=false`, `readiness=blocked`, and blockers `MISSING_CATEGORY` plus `SETTINGS_INACTIVE`. This proves Heureka can read the Warehouse amount for the target product; it is not feed-eligible until category/settings are repaired.

Boundary decision: no Heureka order ingestion, reservation, feed publication, settings-table migration, Warehouse import, or stock mutation was run. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: repair Heureka feed metadata/settings only after owner approves the Heureka feed configuration path; continue physical-stock-source acquisition before final import.

## 2026-06-29 - TASK-STOCK-004 Hosted-Auth Channel Status Validation And Bazos Status Fix

Result: used the Auth-owned configured test credentials inside the Auth pod to obtain a hosted-Auth user token without printing token material, then ran a read-only Catalog channel-status smoke for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee`. The Auth token validated successfully with roles including Allegro admin/user, Bazos admin, Catalog internal admin, and global superadmin. Initial smoke proved Catalog accepted hosted-Auth and returned HTTP `200` for Warehouse, FlipFlop, Allegro, Aukro, Bazos account, and Aukro account status. Bazos product status returned a Bazos-owned dependency `500` because the no-draft read-only status path threw `NotFoundException`.

Fix: patched `bazos-service@804bf75` so `GET /api/bazos/catalog/products/:productId/sell-action/status` returns an empty read-only status envelope when no draft exists for the product, instead of surfacing an unhandled server error. Prepare/confirm mutation paths remain unchanged. Validation passed: `git diff --check`, focused Bazos catalog sell-action and publish-policy specs (`46` tests), and `npm --prefix shared run build`. Deploy built/pushed `localhost:5000/bazos-service:804bf75` with digest `sha256:c19fbf7df52fe3e348f24cd470ee4c6a9063c8dc45da6d9960678b9388cb62cb` and rolled out successfully.

Final hosted-Auth smoke evidence: Auth login returned a token and Auth validate returned `valid=true` without printing token material. Catalog channel status results for the target product all returned HTTP `200`: Warehouse `success=true`; FlipFlop `success=true`, `nextAction=view_flipflop_listing`, `stockQuantity=60`, `warehouseSource=warehouse-microservice`; Allegro `success=true`, `nextAction=prepare_draft`; Bazos `success=true`, `action=read_bazos_listing_status`, `nextAction=create_bazos_draft`; Aukro `success=true`, `action=read_aukro_draft_status`, `nextAction=create_aukro_draft`; Bazos account `connected=true`, `active=true`, `canSell=true`; Aukro account `connected=true`, `active=true`, `canSell=true`.

Boundary decision: the smoke was read-only. No Bazos draft, Aukro draft, Allegro draft, publish, queue, confirmation, reservation, Warehouse import, or stock mutation was run. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: obtain the owner-approved complete physical stock source, preview it through Allegro Imports, then run approved Warehouse import and final over-reservation/channel propagation validation.

## 2026-06-29 - TASK-STOCK-004 Catalog Channel Status Smoke Added

Result: added an opt-in read-only Catalog channel-status smoke mode at `npm run smoke:e2e:channel-status`. The smoke now records Warehouse availability, FlipFlop projection, FlipFlop status, Allegro status, Bazos status, Aukro status, and Bazos/Aukro account-status envelopes without requesting drafts, publishing, queuing, confirming, or mutating Warehouse stock. The smoke also prefers an explicitly supplied `CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN` over ambient pod `JWT_TOKEN`, so internal machine-auth checks are not accidentally shadowed by stale runtime JWT material.

Validation evidence: `node --check scripts/catalog-smoke.js` passed; `git diff --check` passed; default `npm run smoke:e2e` passed with `9` passed, `2` skipped, `0` failed; focused `npm test -- --runInBand src/products/products.service.spec.ts` passed (`16` tests); `npm run build` passed. A pre-deploy in-pod smoke copied the changed script to `/tmp` and ran against `http://127.0.0.1:3200` with `CATALOG_INTERNAL_SERVICE_TOKEN` only; it passed with `17` passed, `1` skipped, `0` failed. Target product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` returned authorized Warehouse availability item count `1`, authorized FlipFlop projection item count `1`, and authorized FlipFlop status `success=true`, `nextAction=view_flipflop_listing`, `stockQuantity=60`, `warehouseSource=warehouse-microservice`. Allegro, Bazos, and Aukro read-only status envelopes preserved channel authority and returned `auth_required`/`login_to_catalog` under machine-auth, proving the remaining positive-path validation still needs a real hosted-Auth user/operator token.

Boundary decision: this is a validation-harness change only. No channel draft, publish, queue, confirmation, reservation, Warehouse import, or stock mutation was run. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: continue with a real hosted-Auth operator token for Allegro/Bazos/Aukro positive status validation plus the owner-approved physical stock source.

Deploy follow-up: the first deploy built and pushed `localhost:5000/catalog-microservice:5d448f6` with digest `sha256:164e53cdc05493fe715bf8b8e28944570f34ee6d77f408f2c014545f6a599165`, but the existing deploy script set the workload back to `latest` and selected a completed monitor pod in its health phase. The deploy script was repaired at `catalog-microservice@822ddb4` to set the deployment to the immutable `$IMAGE` tag and select only running pods for health. The repaired deploy completed successfully, built/pushed `localhost:5000/catalog-microservice:822ddb4` with digest `sha256:64a5da4d189e13780a6f329f2b734279ab3195d3c003d5746df1a3442166907f`, rolled out, and returned health HTTP `200`. Final deployed image is `localhost:5000/catalog-microservice:822ddb4`. Final post-deploy channel-status smoke from the deployed image passed with `17` passed, `1` skipped, `0` failed.

## 2026-06-29 - TASK-STOCK-004 Heureka Warehouse Client Auth Fixed

Result: fixed and deployed authenticated Warehouse stock reads for Heureka feed/order gates. Heureka is committed and deployed at `heureka-service@7554c17` (`fix: authenticate warehouse stock client`). The shared Warehouse client now sends a bearer token from `WAREHOUSE_SERVICE_TOKEN`, falling back to `JWT_TOKEN` or `SERVICE_TOKEN`, and the deployment exposes a dedicated `WAREHOUSE_SERVICE_TOKEN` sourced from Vault via ExternalSecret.

Validation evidence: `git diff --check` passed; `npm --prefix shared run build` passed; `npm --prefix services/heureka-service run build` passed; `npm run verify:heureka-order-ingestion` passed; direct `LOGGING_SERVICE_URL=http://logging-microservice:3367 npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/orders/orders.service.spec.ts` passed; `bash -n scripts/deploy.sh` passed. Deploy built and pushed `localhost:5000/heureka-service:7554c17` with digest `sha256:d29adb99fc4ed388212cc9b9256243fba9aa4cf4b30ea785ece845d99439ec47`, applied manifests, and rolled out successfully.

Live stock evidence: newest running Heureka pod `heureka-service-9fff88f7c-vj5k9` exposes `WAREHOUSE_SERVICE_TOKEN` without printing token material. Deployed client smoke proved `clientAddsAuthorization=true`. Direct pod-local Warehouse read for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` returned HTTP `200`, `success=true`, and `totalAvailable=60`.

Boundary decision: no Heureka order ingestion, reservation, stock mutation, or Warehouse stock import was run. This change makes the existing Heureka fail-closed warehouse route/order gate able to read Warehouse availability. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: continue authenticated user/operator channel-status validation and obtain the owner-approved complete physical stock source before any Warehouse import.

## 2026-06-29 - TASK-STOCK-004 Bazos And Aukro Warehouse Client Auth Fixed

Result: fixed and deployed authenticated Warehouse stock reads for Bazos and Aukro channel gates. Bazos is committed and deployed at `bazos-service@8d02855` (`fix: authenticate warehouse stock client`). Aukro is committed and deployed at `aukro-service@b2efe33` for the Warehouse client auth and `aukro-service@bd94bf8` for deploy-script/image rollout repair plus the `WAREHOUSE_SERVICE_TOKEN` pod env mapping. Both services now use `WAREHOUSE_SERVICE_TOKEN`, falling back to `JWT_TOKEN` or `SERVICE_TOKEN`, when calling Warehouse stock read/reservation endpoints.

Validation evidence: Bazos `git diff --check`, `npm --prefix shared run build`, and focused Bazos stock policy/publisher tests passed (`2` suites, `51` tests). Aukro `git diff --check`, `npm --prefix shared run build`, and Aukro service stock/offers test command passed. Bazos deploy built/pushed immutable image `localhost:5000/bazos-service:8d02855` with digest `sha256:f7d6c84642c17b792a70831d7113d8d81d26d666f3ef9f66ec5da6f101fbc2b9` and rolled out. Aukro deploy script was repaired to build/push/set immutable images, then built/pushed `localhost:5000/aukro-service:bd94bf8` with digest `sha256:1e39acee4ea91b681af485d0071244e7aed67b138113f2bb2acecb2ff3097b13` and rolled out.

Live stock evidence: running Bazos pod `bazos-service-7c79d6d5db-vp9wp` and running Aukro pod `aukro-service-668f77fd44-gt8fr` both expose `WAREHOUSE_SERVICE_TOKEN` without printing token material. Deployed client smoke proved `clientAddsAuthorization=true` in both pods. Direct pod-local Warehouse read for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` returned HTTP `200`, `success=true`, and `totalAvailable=60` from both services.

Boundary decision: no Bazos/Aukro draft, publish, queue, reservation, stock mutation, or Warehouse stock import was run. This change makes the existing fail-closed stock gates able to read Warehouse availability; it does not bypass user-owned channel authentication. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: continue authenticated user/operator channel-status validation and obtain the owner-approved complete physical stock source before any Warehouse import.

## 2026-06-29 - TASK-STOCK-004 Catalog Aukro Route Prefix Fix

Result: fixed and deployed Catalog's Aukro client route construction. The live Aukro service sets global prefix `/aukro`, so Catalog now calls `/aukro/accounts`, `/aukro/offers`, and `/aukro/offers/from-catalog` instead of unprefixed paths that returned false `404 Cannot GET ...` responses. Catalog is committed and pushed at `catalog-microservice@269e844` (`fix: use Aukro service route prefix`).

Validation evidence: focused `npm test -- --runInBand src/products/products.service.spec.ts` passed with `16` tests; `npm run build` passed; `git diff --check` passed. Deploy built and pushed `localhost:5000/catalog-microservice:269e844` with digest `sha256:5bafda521b9be658e086843e410e08d90265051a84bdf1e0c2c6d56acf1f69cd`, applied manifests, and Kubernetes rollout completed. The deploy script exited nonzero only in its final health phase because it selected a completed `catalog-contract-monitor` pod; direct running-pod health returned HTTP `200`. From the running Catalog pod, old Aukro paths `/accounts` and `/offers` returned `404`, while new paths `/aukro/accounts` and `/aukro/offers` reached real protected Aukro routes and returned `403` without a valid user token.

Live target status evidence: internal Catalog probe for product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` returned FlipFlop HTTP `200`, `success=true`, `nextAction=view_flipflop_listing`, and `projectionStockQuantity=60`. The same internal-service probe for Aukro, Bazos, and Allegro returned `auth_required`, which means those user-owned channel status paths still require a valid hosted-Auth user token or channel-specific valid service token before full status validation. Bazos runtime token checks remain invalid against Bazos/Auth (`401 Invalid token`) for both the Bazos pod `JWT_TOKEN` and Catalog `BAZOS_SERVICE_TOKEN`. Catalog has no `AUKRO_SERVICE_TOKEN` configured.

Boundary decision: no channel draft/publish mutation and no Warehouse stock mutation was run. Allegro service has a separate dirty order-line normalization patch from the data-structure lane; this orchestrator did not edit Allegro. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: provide or mint a valid hosted-Auth operator/user token for channel status validation, rotate stale Bazos/Catalog channel tokens if service validation is desired, and continue only with owner-approved current physical stock source for Warehouse import.

## 2026-06-29 - TASK-STOCK-004 FlipFlop Warehouse Stock Projection Fixed

Result: fixed and deployed the FlipFlop Warehouse client authentication path so product projections can read Warehouse availability instead of silently falling back to zero. FlipFlop is committed and pushed at `flipflop-service@94ecd7c` (`fix: authenticate warehouse stock client`). The deployed shared client now sends a bearer token from `WAREHOUSE_SERVICE_TOKEN`, `JWT_TOKEN`, or `SERVICE_TOKEN` for Warehouse stock reads, reservations, and stock writes. FlipFlop Vault/Kubernetes secret material was refreshed with a Warehouse-valid service token without printing token values.

Validation evidence: `npm --prefix shared run build` passed; `npm run verify:orders-hub-integration` passed; `git diff --check` passed before commit. `./scripts/deploy.sh` built and pushed all FlipFlop images and applied manifests, then exited nonzero only because its rollout wait timed out while an old API pod was terminating; direct `kubectl rollout status` immediately after reported successful rollout for `flipflop-service`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-frontend`. Pod-local FlipFlop product-service Warehouse probe returned HTTP `200` with target `totalAvailable=60`. Public `https://flipflop.alfares.cz/api/products/884c1c5e-fe94-46c7-aab1-78bcc424e7ee?includeWarehouse=true` returned `success=true`, product name `Nafukovací kluzák 83 cm Drive (model KOMFORT). Sáně a sáňky. Snowtubing.`, `stockQuantity=60`, and `warehouse={stockQuantity:60, trackInventory:true, availability:"in_stock", source:"warehouse-microservice"}`.

Channel validation status: FlipFlop projection is now Warehouse-backed for the target product. Catalog public channel status endpoints remain auth-protected; an in-pod Catalog `JWT_TOKEN` is not accepted by that controller, so Catalog-to-channel status validation still needs the correct authenticated operator/service credential. Aukro status remains blocked by its account endpoint returning `404 Cannot GET /accounts`; Bazos status remains blocked by `401 Invalid token`; Allegro status is reachable and returns draft preparation state.

Boundary decision: no stock quantity mutation was performed in FlipFlop. The token refresh changed only service authentication for Warehouse reads/reservations. Complete physical stock remains gated on `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or `[MISSING: correctly authorized additional seller account exposing current full offers]`.

Next action: run authenticated Catalog/channel validation with the correct Catalog operator/service credential, then continue only after the owner-approved full physical stock source is available.

## 2026-06-29 - TASK-STOCK-004 Warehouse Stock Propagation Runtime Update

Change: continued cross-repo Warehouse stock authority rollout after the audit thread handed coordination back to this orchestrator. Heureka's committed warehouse-route gate is now deployed from `heureka-service@056e975` after repairing its deploy script to build and push immutable images before rollout. Catalog product detail stock remains Warehouse-backed through `POST /api/products/availability/batch`; product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` resolves to Warehouse quantity `60`, reserved `0`, available `60` in warehouse `c0de0000-0000-4000-8000-000000000013`.

Validation evidence: Heureka build/test gates passed before deploy: `git diff --check`, `bash -n scripts/deploy.sh`, focused Heureka order ingestion spec, contract verifier, shared build, and Heureka service build. Deploy built and pushed `localhost:5000/heureka-service:056e975` with registry digest `sha256:99ccc3eaff0d16ef38a91f9552c4753a15d168b8575cb3e1cdc86c543a8c3331`, applied manifests, and Kubernetes rollout completed in `statex-apps`. Live deployment image is `localhost:5000/heureka-service:056e975`; in-pod health returned HTTP `200` with service `heureka-service`. Allegro imports service was initially verified at image `localhost:5000/allegro-imports:2db3841` with zero import jobs; Lane A later deployed the public upload path at image tag `4e9400c` for Allegro service, API gateway, frontend, settings, and imports.

Source-of-truth discovery: Allegro offer import/backfill is deployed and has already imported visible Allegro stock into Warehouse, but current visible Allegro stock totals only `496` units. Suppliers service was checked read-only and currently contains only synthetic/test suppliers with no real production supplier credentials; its `STATE.json` still gates real supplier onboarding on owner-supplied metadata, endpoint, auth refs, payload samples, mapping facts, and explicit Warehouse mutation approval. Allegro has a BizBox CSV parser/import path that calculates Warehouse stock from `stock:minimumRequiredLevel:*` fields and writes Warehouse movements with reason `BIZBOX_CSV_STOCK_IMPORT`, but no CSV/XLS source file was found in the remote Allegro repo and no import jobs have run.

Blockers and gaps: `[MISSING: BizBox/current physical stock export file or approved source path]`; `[MISSING: owner-confirmed mapping for whether BizBox stock fields are the authoritative physical stock source for the expected 1000+ units]`; `[RESOLVED: public operator upload and preview paths plus confirmation guard for BizBox CSV deployed at allegro-service@4d1cb99]`;  `[MISSING: real supplier production contract/credentials/payloads]` if physical stock must come from Suppliers instead of BizBox.

Parallel execution state: Orders reservation gate is deployed first and remains the contract base. Allegro, Aukro, Bazos, FlipFlop, and Heureka channel gates are deployed. Lane A Allegro Imports UX/API gateway multipart support for BizBox CSV upload, non-mutating preview, and confirmation-guarded mutation is deployed. Lane B read-only discovery found no current BizBox export in obvious remote locations. Dependency-gated lane C is executing an approved BizBox import into Warehouse after source file and mapping are confirmed. Dependency-gated lane D is Suppliers real-source onboarding only if BizBox is not authoritative. Final integration lane is Catalog product-detail and channel propagation validation after Warehouse has the complete physical stock rows.

Next action: obtain the owner-approved BizBox/current stock export file and authority confirmation, preview it, then run the import through Warehouse and revalidate Catalog plus all channel gates.







## 2026-06-29 - TASK-STOCK-004 Full Active Allegro Stock Backfill

Result: reran the deployed Allegro active-offer backfill through `allegro-service@d434150` for account `FlipFlop` / `8443b77b-59d3-4530-9c8e-3934e7d8f69d` after the Warehouse-auth token path was fixed. The deployed entrypoint `node dist/scripts/import-allegro-offers-to-catalog.js --account-id 8443b77b-59d3-4530-9c8e-3934e7d8f69d --all` completed with `totalImported=9`.

Validation evidence: live Allegro DB and Warehouse readback for the 9 active `ALLEGRO_API` offers returned `offerCount=9`, `productCount=9`, `warehouseStatus=201`, Allegro stock total `496`, Warehouse available total `496`, `missingCatalog=0`, and `mismatches=0`. Per-offer Warehouse quantities matched Allegro `stock.available`: `18106037370=124`, `18106190486=87`, `18106229125=50`, `18106300892=25`, `18106436117=110`, `18106496345=60`, `18106529080=10`, `18106938601=3`, `18231907833=27`. Catalog availability batch returned HTTP `200`, `success=true`, `returned=9`, total available `496`, and `mismatches=0`; target product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` returned `totalQuantity=60`, `totalReserved=0`, `totalAvailable=60`.

Boundary decision: the separate Allegro account/data-structure thread stayed read-only for stock mutations and reported that `statexcz` order history has `117` checkout forms, `125` line items, and `26` unique offer IDs, but only `3/26` still expose current `/sale/product-offers/{offerId}` stock payloads. The other `23/26` are order-history-only recoveries and are not stock-authoritative. Order-line quantities must not be imported as current physical Warehouse stock.

Remaining gap: the current saved OAuth accounts expose only 9 active stock-authoritative offers totaling `496`; the expected 1000+ physical stock still needs `[MISSING: owner-approved BizBox/current physical stock export]`, `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`, or a correctly authorized separate `flipflopcz`/other Allegro account that exposes additional current full offers.

Next action: obtain the owner-approved current physical stock source or correctly authorize the missing seller account, then preview/import only current stock-authoritative quantities.

## 2026-06-29 - TASK-STOCK-004 Allegro Preview Token Guard And Cleanup

Result: hardened the BizBox CSV mutation path again so the confirmation-gated upload must now be bound to the exact previewed file. Allegro is deployed at `allegro-service@d434150` (`Bind BizBox stock import to previewed file`). The imports preview response includes a server-computed `previewToken`; the mutating upload requires both `x-stock-import-confirmation: previewed-and-approved` and matching `x-stock-import-preview-token`.

Validation evidence: before deploy, `git diff --check`, `npm --prefix services/imports run build`, and `npm --prefix services/frontend run build` passed. Deploy completed successfully and live deployments are ready at image tag `d434150` for `allegro-service`, `allegro-api-gateway`, `allegro-frontend`, `allegro-settings`, and `allegro-imports`. A first smoke during rollout hit old behavior and created one synthetic import artifact; the current running imports pod was then rechecked and returned preview HTTP `201` with a `sha256:` preview token, bad-token mutating upload HTTP `428` with code `STOCK_IMPORT_PREVIEW_TOKEN_INVALID`, and import job count unchanged during that current-pod check.

Cleanup evidence: the rollout-window synthetic Catalog product `CODEX-PREVIEW-TOKEN` / `218d24c9-a0cb-4f9f-b71d-1087b4c277ba` was soft-deleted through Catalog's service API and now reads `isActive=false`, `lifecycle=archived`. Warehouse authenticated readback for the same synthetic product returned zero stock rows, so no Warehouse stock reset was needed. The historical synthetic Allegro import job remains as audit history; no real BizBox/current stock file was imported. The real target Warehouse row for `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` still reads quantity `60`, reserved `0`, available `60` in warehouse `c0de0000-0000-4000-8000-000000000013`.

Boundary decision: preview-token binding is still a safety guard, not stock-source approval. Complete physical stock import remains gated on `[MISSING: owner-approved BizBox/current physical stock export]` and `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`.

Next action: run preview on the owner-approved export, compare totals to expected physical stock, then run the confirmed mutating import only after explicit approval.

## 2026-06-29 - TASK-STOCK-004 Allegro Stock Import Confirmation Guard

Result: hardened the mutating BizBox stock import path so authenticated direct CSV upload now requires explicit confirmation header `x-stock-import-confirmation: previewed-and-approved`. The frontend sends this header only from the preview-gated upload flow. Allegro is deployed at `allegro-service@4d1cb99` (`Require confirmation for BizBox stock import`).

Validation evidence: `git diff --check` passed; `npm --prefix services/imports run build` passed; `npm --prefix services/frontend run build` passed with existing Vite/Browserslist freshness warnings only. Deploy completed successfully. Live deployments are ready at image tag `4d1cb99` for `allegro-service`, `allegro-api-gateway`, `allegro-frontend`, `allegro-settings`, and `allegro-imports`. Live pod smoke showed preview returned HTTP `201` with `mutatesWarehouse=false`, direct mutating upload without confirmation returned HTTP `428` with code `STOCK_IMPORT_CONFIRMATION_REQUIRED`, and import job count stayed `0` before and after.

Boundary decision: the confirmation header is a safety gate, not final stock-source approval. No real BizBox/current stock file was imported. Complete physical stock import remains gated on `[MISSING: owner-approved BizBox/current physical stock export]` and `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`.

Next action: run preview on the owner-approved export, compare totals to expected physical stock, then run the confirmed mutating import only after explicit approval.

## 2026-06-29 - TASK-STOCK-004 Allegro Preview And Current-Head Deploy

Result: added and deployed a non-mutating BizBox CSV preview path before any real Warehouse stock import. Allegro is now deployed from `allegro-service@0e753bf`, which includes `ccf16a1 Add BizBox stock CSV preview` plus `0e753bf Import Allegro offers across publication statuses`. The latter expands Allegro offer import across `ACTIVE`, `INACTIVE`, `ENDED`, and `ACTIVATING` statuses with duplicate suppression, which is relevant to using Allegro as the initial stock source.

Preview implementation: `POST /import/csv/preview` in the imports service parses the BizBox CSV, reports row count, missing-code count, total stock, primary warehouse, stock-field totals, and sample rows, and returns `mutatesWarehouse=false`. Gateway exposes authenticated `POST /api/import/csv/preview`; frontend Import page now has a `Preview CSV` action and disables mutating upload until a preview exists.

Validation evidence: `git diff --check` passed; `npm --prefix services/imports run build` passed; `npm --prefix services/api-gateway run build` passed; `npm --prefix services/frontend run build` passed with existing Vite/Browserslist freshness warnings only; `npm --prefix services/allegro-service run build` passed for the publication-status import change. Deploy from current head completed successfully. Live deployments are ready at image tag `0e753bf` for `allegro-service`, `allegro-api-gateway`, `allegro-frontend`, `allegro-settings`, and `allegro-imports`. Live preview-only smoke against the imports pod returned HTTP `201`, `mutatesWarehouse=false`, `totalRows=1`, `totalStock=7`, and import job count stayed `0` before and after. Public `https://allegro.alfares.cz/` returned HTTP `200`; unauthenticated public `POST /api/import/csv/preview` returned HTTP `401 No token provided`.

Boundary decision: no real or authenticated mutating CSV upload was run. The deployed cross-status Allegro offer import was also not executed in this turn because it mutates Catalog/Warehouse stock and requires an OAuth-backed account context. Complete physical stock import remains gated on `[MISSING: owner-approved BizBox/current physical stock export]` and `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`; cross-status Allegro re-import remains available as an operator-approved mutation path.

Next action: use the deployed preview endpoint on the owner-approved stock export first, review totals/field mapping, then run the mutating import only after approval and revalidate Warehouse, Catalog, Orders, and channel gates.

## 2026-06-29 - TASK-STOCK-004 Lane A Allegro BizBox Upload Deployed

Result: Allegro Lane A is implemented, pushed, and deployed as `allegro-service@4e9400c` (`Enable BizBox stock CSV upload`). The change adds authenticated `POST /api/import/csv` multipart forwarding in the API gateway, frontend FormData handling, and a BizBox Stock CSV Import control on the Allegro import page.

Changed files: `services/api-gateway/package.json`, `services/api-gateway/package-lock.json`, `services/api-gateway/src/gateway/gateway.controller.ts`, `services/api-gateway/src/gateway/gateway.service.ts`, `services/frontend/src/pages/ImportJobsPage.tsx`, and `services/frontend/src/services/api.ts`.

Validation evidence: remote worktree clean at `main...origin/main`; `git diff --check` passed; `npm --prefix services/api-gateway run build` passed; `npm --prefix services/frontend run build` passed with existing Vite/Browserslist freshness warnings only. Worker-reported `./scripts/deploy.sh` succeeded. Live Kubernetes deployments are ready with image tag `4e9400c` for `allegro-api-gateway`, `allegro-frontend`, and `allegro-imports`; rollout status completed for all three. Worker-reported non-mutating live checks: `https://allegro.alfares.cz/` returned HTTP `200`; unauthenticated `POST /api/import/csv` returned `401 No token provided`.

Boundary decision: no authenticated CSV upload was run because the import endpoint mutates Warehouse stock. A controlled upload requires an owner-approved real BizBox/current stock export or an explicitly approved isolated synthetic Warehouse mutation test.

Remaining blocker: `[MISSING: owner-approved BizBox/current physical stock export]` and `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are authoritative physical stock for Warehouse]`.

Next action: obtain the approved stock export/path and authority confirmation, then run the import through the deployed Allegro upload path and revalidate Warehouse, Catalog product detail, and channel gates.

## 2026-06-29 - TASK-STOCK-004 Lane B BizBox Source Discovery Result

Result: read-only discovery found no current BizBox/current physical stock export in the allowed obvious locations. Searches under `/home/ssf/Documents/Github` found docs/code references only; bounded data-file search for CSV/TSV/XLS/XLSX/ZIP/7Z/RAR found only unrelated SpeakASAP lesson/dictionary CSVs; shallow `/home/ssf` metadata scan for BizBox/stock/sklad/warehouse/import/export filenames found no candidates; Kubernetes object-name scan found Warehouse/Allegro/Suppliers config and job names but no BizBox export/import job/config object.

Code evidence: Allegro Imports supports BizBox stock fields in code: `services/imports/src/import/import.service.ts` calculates stock from `stock:minimumRequiredLevel:${STOCK_PRIMARY_WAREHOUSE}` or sums all `stock:minimumRequiredLevel:*` fields; `field-mapper.service.ts` maps `stock:minimumRequiredLevel:sklad-internet`, `Obchod-Ledec`, `Sklad-Vilemovice`, `pocenice`, and `vlci-doly` to `stockQuantity`. This proves import support, not source authority.

Blocker: `[MISSING: owner must provide BizBox/current physical stock export]` and `[MISSING: owner confirmation that stock:minimumRequiredLevel:* fields are the authoritative Warehouse physical stock source for this import]`.

Next action: wait for owner-provided source file or path, then run through the deployed Allegro upload path after approval.

## 2026-06-29 - TASK-STOCK-002 Catalog Warehouse Stock Visibility

Change: added a Catalog frontend Warehouse stock section to `/dashboard/products/:id` using the existing `POST /api/products/availability/batch` contract. The section keeps Warehouse as stock authority, shows total/reserved/available amounts, per-warehouse rows, and route/sellability status without adding Catalog stock persistence or schema changes.

Intent Preservation chain: Vision: Alfares channels must not oversell fulfillable stock. Goal Impact: operators can see Warehouse-backed stock on Catalog product details. System: Warehouse remains stock authority; Catalog displays Warehouse availability. Feature: Warehouse-backed inventory propagation. Task: TASK-STOCK-002. Execution Plan: reuse Catalog availability batch endpoint in frontend only. Coding Prompt: add typed API client and product detail card. Code: `services/frontend/lib/api/products.ts`, `services/frontend/app/dashboard/products/[id]/page.tsx`. Validation: `git diff --check` passed; root `npm run build` passed; focused frontend `cd services/frontend && npm run build` passed with the existing Next.js multiple-lockfile workspace-root warning only. Focused frontend tests are [MISSING: no existing frontend test pattern found under services/frontend].

Next action: deploy decision is ready if the integration owner accepts the intended dirty files and runtime token availability for the protected availability endpoint is confirmed.

## 2026-06-27 - Auth-Owned Catalog Service Token Source Applied

Change: switched Catalog `CATALOG_INTERNAL_SERVICE_TOKEN` ExternalSecret source to Auth-owned Vault property `secret/prod/auth-microservice#CATALOG_INTERNAL_SERVICE_TOKEN`. Bazos-owned `BAZOS_SERVICE_TOKEN` remains only for Bazos integration and is distinct from the Catalog-to-Orders credential.

Validation evidence: Kubernetes server dry-run passed for `k8s/external-secret.yaml`; Catalog and Orders ExternalSecrets were applied and force-reconciled with `SecretSynced=True`; live Kubernetes Secrets expose matching `CATALOG_INTERNAL_SERVICE_TOKEN` material for Catalog and Orders without printing values; Catalog's token is distinct from `BAZOS_SERVICE_TOKEN`. Rollout restart completed for Catalog pod `catalog-microservice-77b79bd855-5xj9t` and Orders pod `orders-microservice-757696f875-8gprf`. Sanitized in-pod Catalog bridge smoke returned health HTTP 200, products HTTP 200, sales statistics HTTP 200, `success=true`, `sourceStatus=available`, five channel rows, zero recent-history rows, and no customer/payment/address/provider markers.

Next action: monitor scheduled Catalog contract checks with the Auth-owned service credential.

## 2026-06-26 - Goal 17 Sub-Agents Driven Development Launch

Change: launched Goal 17 as Sub-Agents Driven Development. Original Catalog thread remains integration owner. Orders read-model implementation is active in thread `019f05b7-b84d-7351-b1dc-9c51cd4ad2ef`. Channel fidelity implementation is active in FlipFlop thread `019f05d9-5ea9-7fe2-8bc7-be7fb2c57396`, Allegro thread `019f05d9-8836-7e22-b4ae-5e8a7fea49c9`, Bazos thread `019f05d9-b313-79c1-8214-6e8eaca05317`, and Aukro thread `019f05d9-df9b-74f0-9715-72e7652824ae`. Heureka remains blocked because audit found no runtime order service path.

Parallel execution state: Workstream A Orders statistics endpoint is `active`; Workstream B channel adapter fixes are `active` for FlipFlop/Allegro/Bazos/Aukro and `blocked` for Heureka; Workstream C Catalog Orders bridge is `dependency-gated`; Workstream D Catalog UI live-data replacement is `dependency-gated`; Workstream E final integration and runtime smoke is `final integration`.

Validation expectation: each sub-agent must run repo-local `git diff --check` plus the narrowest build/test/verifier, commit only passing bounded changes, and avoid deploy. Integration owner will merge evidence, implement Catalog bridge after Orders contract exists, then run final Catalog validation/deploy.

Next action: poll sub-agent outputs, integrate the Orders stats contract first, then wire Catalog bridge and frontend live statistics.


## 2026-06-26 - Goal 17 Product Marketplace Sales Statistics Planning

Change: owner requested product-level sales statistics on the Catalog admin product page for connected marketplaces. Added Goal 17 and an execution plan that keeps Orders as the sales/order source of truth, Catalog as product truth, and marketplace services as channel ingestion owners. Added a zero-value frontend placeholder block to the product edit page so the requested statistics area is visible while the Orders-backed contract is implemented.

Validation evidence: `git diff --check` passed, root `npm run build` passed, root `npm test -- --runInBand` passed (7 suites/49 tests), and frontend `./node_modules/.bin/tsc --noEmit` passed. `cd services/frontend && npm run build` was blocked by an existing `.next/lock`; no live Next process was found, but the lock was not removed in this session. `npm run lint` is blocked by missing ESLint 9 flat config.

Deployment evidence: `./scripts/deploy.sh` built and pushed `localhost:5000/catalog-microservice:d3021d8` / `latest` with digest `sha256:57374bb613c7506a2856395801bc6ac6807a46326112db54437bf6cc5f0bc2a5`, applied manifests, restarted deployment, and Kubernetes reported rollout success. The script exited during its final health phase because it selected a completed `catalog-contract-monitor` pod for `kubectl exec`; direct checks then confirmed `https://catalog.alfares.cz/health` HTTP 200 with uptime from the new rollout, deployment readiness 1/1, and the live Next chunk contains `Marketplace sales`.

Next action: implement the Orders product sales statistics read model, then bridge it into Catalog and replace the placeholder with live data.

# Catalog Orchestrator Status

## 2026-06-27 - Dedicated Catalog Internal Service Token

Change: created an Auth-owned Vault property `CATALOG_INTERNAL_SERVICE_TOKEN` under `secret/prod/auth-microservice` without printing the value. Switched Catalog and Orders ExternalSecret mappings for `CATALOG_INTERNAL_SERVICE_TOKEN` away from Bazos-owned credentials and onto the Auth-owned property. Existing `BAZOS_SERVICE_TOKEN` remains present for Bazos-owned integration only.

Boundary decision: no token values, decoded JWTs, passwords, or raw secret material were printed, committed, or copied into docs. Auth `/auth/validate` currently requires an active user `sub`, so an arbitrary Auth-signed service JWT is not a valid replacement without a separate Auth service-identity model; the dedicated credential follows the active service-identity standard of `x-internal-service-token` plus `x-service-name`.

Validation evidence: Kubernetes server dry-run passed for Catalog and Orders ExternalSecret manifests. Both ExternalSecrets were applied and force-reconciled; live Kubernetes Secrets now expose `CATALOG_INTERNAL_SERVICE_TOKEN` from Auth-owned `secret/prod/auth-microservice#CATALOG_INTERNAL_SERVICE_TOKEN`, Catalog and Orders token material matches, and Catalog's `CATALOG_INTERNAL_SERVICE_TOKEN` is distinct from `BAZOS_SERVICE_TOKEN` without printing either value. Catalog and Orders deployments were restarted successfully. New Catalog pod `catalog-microservice-55475f5f58-b5485` and Orders pod `orders-microservice-5d9fb5958b-t57bl` expose `CATALOG_INTERNAL_SERVICE_TOKEN` in env. Sanitized Catalog-to-Orders smoke returned HTTP 200, `success=true`, `sourceStatus=available`, five channel rows, zero recent-history rows, and no customer/payment/address/provider markers.

Next action: no immediate action needed; monitor scheduled contract checks and keep Bazos and Catalog service credentials separate during future rotations.

## 2026-06-27 - Goal 17 Runtime Token And Orders Bridge Wiring

Change: verified Vault and Kubernetes runtime key wiring without printing secret values. Vault `secret/prod/catalog-microservice` contains `BAZOS_SERVICE_TOKEN` for Bazos-owned integration only; Catalog and Orders ExternalSecrets map `CATALOG_INTERNAL_SERVICE_TOKEN` from Auth-owned Vault path `secret/prod/auth-microservice#CATALOG_INTERNAL_SERVICE_TOKEN`. Both live ExternalSecrets report `SecretSynced=True`, and both live Kubernetes Secrets expose `CATALOG_INTERNAL_SERVICE_TOKEN`. Orders is deployed from `62e1e2d`, which accepts `x-internal-service-token` plus `x-service-name: catalog-microservice` and maps it to `internal:catalog-microservice:service`. Corrected Catalog `ORDERS_SERVICE_URL` to `http://orders-microservice.statex-apps.svc.cluster.local:3203`, matching the live Orders Kubernetes Service.

Boundary decision: no secret values were printed or committed. Runtime uses the Auth-owned Catalog internal service token from `secret/prod/auth-microservice#CATALOG_INTERNAL_SERVICE_TOKEN`; no Bazos-owned token is used for Catalog-to-Orders authentication.

Validation evidence before deploy: `git diff --check` passed; `npm test -- --runInBand src/products/products.service.spec.ts` passed (14 tests); `npm run build` passed; `npm test -- --runInBand` passed (7 suites/56 tests).

Deployment evidence: Catalog deploy from `7abf6c9` built and pushed `localhost:5000/catalog-microservice:7abf6c9` / `latest` with digest `sha256:8501cc3d55b681f7c3ac78c5aeb7ba4033b53794152a3dd6beb5896dbc64485e`, applied manifests, and Kubernetes reported rollout success. The deploy script exited nonzero during its final health phase because it selected a completed `catalog-contract-monitor` pod; direct health against the new running Catalog pod returned HTTP 200.

Runtime smoke evidence: the new Catalog pod has `CATALOG_INTERNAL_SERVICE_TOKEN`, `ORDERS_SERVICE_URL`, and `ORDERS_STATISTICS_TIMEOUT_MS` present without printing values. A sanitized in-pod smoke selected one existing product through public Catalog read, called `GET /api/products/:id/sales-statistics` with `x-internal-service-token` and `x-service-name: catalog-microservice`, and received HTTP 200, `success=true`, `sourceStatus=available`, five channel rows, zero recent-history rows, and no customer/payment/address/provider markers.

Next action: monitor scheduled contract checks with the Auth-owned Catalog service credential now sourced from `secret/prod/auth-microservice#CATALOG_INTERNAL_SERVICE_TOKEN`.

## 2026-06-26 - Goal 17 Catalog Orders Bridge And Product UI

Change: added protected Catalog bridge endpoint `GET /api/products/:id/sales-statistics` for product marketplace sales statistics. The endpoint validates Catalog product existence, calls Orders `GET /api/orders/statistics/products/:productId` with service credentials when configured, normalizes allowed channels to available/zero states, and returns an explicit unavailable zero aggregate when the Orders token/env contract is missing or Orders is unreachable. Replaced the product admin static `PRODUCT_MARKETPLACE_SALES_STATS` placeholder with typed API-backed loading, zero, unavailable, per-channel, and sanitized bounded recent-history display states.

Boundary decision: Catalog still stores no order/order-item/payment/customer/provider data and does not poll marketplaces. No deployment was run. Runtime wiring uses the existing `CATALOG_INTERNAL_SERVICE_TOKEN` service credential through `x-internal-service-token` / `x-service-name: catalog-microservice`; Auth-owned Catalog service identity is confirmed by Vault source `secret/prod/auth-microservice#CATALOG_INTERNAL_SERVICE_TOKEN` and the canonical machine-auth header contract.

Validation evidence: `git diff --check` passed; focused `npm test -- --runInBand src/products/products.service.spec.ts` passed (13 tests); root `npm run build` passed; root `npm test -- --runInBand` passed (7 suites/55 tests); frontend `./node_modules/.bin/tsc --noEmit` passed; frontend `npm run build` passed with a Next.js multiple-lockfile workspace-root warning only.

Next action: hand off runtime env/deploy readiness to final integration after owner wires the Catalog-to-Orders service token/env contract.


## 2026-06-13 - FlipFlop Sellable Quantity From Reservable Routes

Change: tightened FlipFlop projection stock quantity so channel-facing stockQuantity is calculated from traceable reservable Warehouse logistics routes instead of raw Warehouse totalAvailable. Raw Warehouse totals and rows still remain forwarded under availability for diagnostics, but non-reservable supplier/dropship diagnostics no longer inflate the sellable channel quantity.

Validation evidence: npm test -- --runInBand src/flipflop-projection/flipflop-projection.service.spec.ts src/warehouse-availability/warehouse-availability.service.spec.ts passed, npm run build passed, and git diff --check passed. Added focused coverage for mixed local plus unlinked supplier stock where stockQuantity exposes only the local reservable amount.

Boundary decision: no deployment, runtime token inspection, live fixture creation, production supplier import, Warehouse stock mutation, or cleanup mutation was performed. Current-head runtime completion remains unproven until owner-approved guarded runtime evidence regeneration.

## 2026-06-13 - FlipFlop Supplier Route Ownership Gate

Change: tightened FlipFlop projection sellability so positive supplier replenishment or dropship availability is not included by default unless the Warehouse logistics option also carries a non-empty supplierId. This aligns the channel projection path with Catalog Warehouse coverage, which already blocks supplier-managed routes without Warehouse-owned supplier linkage.

Validation evidence: npm test -- --runInBand src/flipflop-projection/flipflop-projection.service.spec.ts passed, npm run build passed, and git diff --check passed. Added focused coverage proving supplier stock with a reservable-looking route but missing supplier linkage is hidden by default and only visible with includeUnavailable=true.

Boundary decision: no deployment, runtime token inspection, live fixture creation, production supplier import, Warehouse stock mutation, or cleanup mutation was performed. Current-head runtime completion remains unproven until owner-approved guarded runtime evidence regeneration.


## 2026-06-13 - Goal 16 Production Contract Monitoring And Drift Audit

Current focus: Goal 16 merged, deployed, and live CronJob verified from `main`.

Implementation evidence:

- Added `scripts/catalog-contract-monitor.js` to run existing smoke contracts by profile and emit sanitized monitor JSON.
- Added `npm run monitor:contracts`.
- Added `JWT_TOKEN` fallback for smoke auth so Kubernetes envFrom secrets can support authorized monitoring without duplicating token values.
- Added `k8s/contract-monitor-cronjob.yaml` for recurring contract drift checks every 30 minutes.
- Updated `scripts/deploy.sh` to apply the CronJob manifest.
- CronJob enables anonymous plus authorized Warehouse/FlipFlop monitoring and keeps Bazos authorized draft monitoring disabled by default.
- Source merged to `main` with merge commit `baad7fb`.
- Runtime image packaging fix committed as `afb7cef`.
- CronJob in-cluster URL fix committed as `9575158`.
- Smoke retry hardening committed and deployed as `f6abce4`.

Validation evidence:

- `npm run monitor:contracts` passed: anonymous profile 9 passed, 2 skipped, 0 failed.
- Runtime-token monitor passed: anonymous profile 9/2/0 and authorized profile 11/1/0.
- `npm run smoke:e2e` passed: 9 passed, 2 skipped, 0 failed.
- `npm test -- --runInBand` passed: 6 suites / 34 tests.
- `npm run build` passed.
- Kubernetes server dry-run accepted the CronJob manifest.
- `git diff --check` passed.
- Final deployment from `f6abce4` passed: rollout completed and health returned `healthy`.
- Live manual Job created from `cronjob/catalog-contract-monitor` passed: anonymous profile 9/2/0 and authorized profile 11/1/0.
- CronJob schedule verified as `*/30 * * * *` and not suspended.

Boundary decisions:

- Monitor output is sanitized and does not print token values or raw response bodies.
- Bazos authorized draft monitoring remains opt-in and disabled in the scheduled manifest.
- Catalog observes Warehouse, FlipFlop, Auth, and Bazos contracts without taking over their ownership.

Next unfinished step:

- Goal 16 is complete. Select the next owner-approved goal or monitor scheduled CronJob history.

## 2026-06-13 - Goal 15 Bazos Authorized Draft Runtime Smoke

Current focus: Goal 15 merged, deployed, and runtime-smoked from `main`.

Implementation evidence:

- Added `npm run smoke:e2e:bazos-authorized`.
- Bazos authorized smoke now requires explicit `CATALOG_SMOKE_BAZOS_PRODUCT_ID`.
- Bazos smoke validates Bazos authority, draft identity, confirmation flags, policy status, human-action state, and next action without printing raw payloads.
- Added Vault/Kubernetes ExternalSecret mappings for Bazos smoke inputs and `BAZOS_SERVICE_TOKEN`.
- Catalog now uses `BAZOS_SERVICE_TOKEN` for service-to-service Bazos calls when present, while still requiring Catalog auth at the Catalog endpoint.
- Bazos-service commit `c58d8b7` was deployed to expose the existing shared catalog sell-action controller in the deployed app.
- Catalog source was merged to `main` with merge commit `555652c`.
- Catalog deployment from `555652c` completed successfully with healthy rollout.
- Dedicated runtime Bazos smoke account linkage was created outside the codebase; no token, account, identity, or contact values were committed.

Validation evidence:

- `npm run smoke:e2e` passed: 9 passed, 2 skipped, 0 failed.
- `npm run smoke:e2e:authorized` passed: 11 passed, 1 skipped, 0 failed.
- `npm run smoke:e2e:bazos-authorized` without Bazos inputs passed safe skip behavior: 11 passed, 1 skipped, 0 failed.
- Bazos `npm --prefix shared test` passed: 5 suites / 79 tests.
- Bazos `npm --prefix shared run build` passed.
- Bazos `npm --prefix services/aukro-service run build` passed.
- Catalog `npm test -- --runInBand` passed: 6 suites / 34 tests.
- Catalog `npm run build` passed.
- `git diff --check` passed.
- Runtime `npm run smoke:e2e:bazos-authorized` passed against `https://catalog.alfares.cz`: 12 passed, 0 skipped, 0 failed. The Bazos draft remained `draft`, required confirmation, did not queue after confirmation because policy was not allowed, and returned next action `resolve_policy_failures`.

Boundary decisions:

- No Bazos publish confirmation, queue, browser submit, renewal, delete, CAPTCHA, SMS, bank, cookie, or session path was invoked.
- Runtime token and Bazos identity inputs are stored in Vault/Kubernetes only.
- Bazos policy remained authoritative; the smoke validated draft preparation and status surfacing only.

Next unfinished step:

- Goal 15 is complete. Select the next implementation goal.

## 2026-06-13 - Goal 14 Authorized Runtime Contract Smoke

Current focus: Goal 14 merged, deployed, and runtime-smoked from `main`.

Planning evidence:

- Created `implementation-goals/GOAL-14-authorized-runtime-contract-smoke.md`.
- Created `implementation-goals/GOAL-14-execution-plan.md`.
- Created `reports/validation/GOAL-14-pre-coding-gate.md`.
- Inspected Catalog auth guard, Warehouse availability, FlipFlop projection, Bazos draft action path, and existing smoke script.

Implementation evidence:

- Added npm alias `smoke:e2e:authorized`.
- Extended `scripts/catalog-smoke.js` with `CATALOG_SMOKE_AUTHORIZED=true` opt-in.
- Supports approved `CATALOG_SMOKE_AUTH_TOKEN` or `CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN` without printing token values.
- Added authorized Warehouse availability envelope check.
- Added authorized FlipFlop projection envelope check.
- Added separately gated Bazos authorized draft smoke requiring `CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED=true`, Bazos identity, and category inputs because that path can request Bazos-owned draft work.
- Merged source with merge commit `8b85197`.
- Added Vault-backed runtime wiring for `WAREHOUSE_SERVICE_TOKEN`, in-cluster `WAREHOUSE_SERVICE_URL`, and smoke env placeholders with commit `3abbe1f`.
- Added stock-only fallback for optional Warehouse logistics enrichment with commit `1747c87` so live Warehouse logistics `404` does not convert valid stock availability into `503`.

Validation evidence:

- `npm run smoke:e2e` passed: 9 passed, 2 skipped, 0 failed.
- `npm run smoke:e2e:authorized` without token passed safely: 9 passed, 2 skipped, 0 failed.
- `npm test -- --runInBand` passed: 6 suites / 33 tests.
- `npm run build` passed.
- `git diff --check` passed.
- Runtime credentials were created/stored in Vault and synced via ExternalSecret without printing token values.
- Deployment from `3abbe1f` completed successfully with healthy rollout.
- Focused Warehouse availability spec passed after fallback update: 11 tests.
- Full Jest suite passed after fallback update: 6 suites / 34 tests.
- Deployment from `1747c87` completed successfully with healthy rollout.
- Runtime `npm run smoke:e2e:authorized` passed against `https://catalog.alfares.cz`: 11 passed, 1 skipped, 0 failed.

Boundary decisions:

- Default smoke remains anonymous and non-destructive.
- Token-backed Warehouse/FlipFlop checks were run with Vault/Kubernetes runtime credentials and passed.
- Authorized Bazos draft smoke remains separately disabled by default.
- No secrets, tokens, Bazos identities, supplier payloads, raw response bodies, authorized mutations, media uploads, pricing writes, or delete actions were used.

Next unfinished step:

- Decide whether to run separately gated Bazos authorized draft smoke only after approved Bazos identity/category inputs are available.

## 2026-06-13 - Goal 9 Merge And Deployment

Current focus: Goal 9 merge, push, deployment, and post-deploy smoke.

Merge evidence:

- Merged `feature/catalog-goal-09-end-to-end-smoke-tests` into `main` with merge commit `89e9f24`.
- Pushed `main` to `origin/main`.

Deployment evidence:

- Ran `./scripts/deploy.sh` from `main` at `89e9f24`.
- Built image `localhost:5000/catalog-microservice:89e9f24` and tagged `latest`.
- Pushed both image tags to the local registry.
- Applied Kubernetes manifests.
- Restarted `deployment/catalog-microservice` in namespace `statex-apps`.
- Rollout completed successfully.
- In-pod health returned `{"status":"healthy","service":"catalog-microservice","version":"1.0.0","environment":"production"}`.

Post-deploy smoke evidence:

- `npm run smoke:e2e` passed against `https://catalog.alfares.cz`: 9 passed, 0 skipped, 0 failed.
- Smoke selected product `a2e15cc0-1a94-4faf-a82f-64afea9e9817`.
- Protected anonymous checks returned `401` for category mutation, Warehouse availability, FlipFlop projection, and Bazos draft.

Boundary decisions:

- No JWTs, service tokens, secrets, authorized mutations, media uploads, pricing writes, product writes, or delete actions were used during post-deploy smoke.
- Deployment includes the accumulated validated goal line through Goal 9.

Next unfinished step:

- Owner review or production monitoring.

## 2026-06-13 - Goal 9 End-To-End Catalog Smoke Tests

Current focus: Goal 9 source implementation on `feature/catalog-goal-09-end-to-end-smoke-tests`.

Planning evidence:

- Created `implementation-goals/GOAL-09-execution-plan.md`.
- Created `reports/validation/GOAL-09-pre-coding-gate.md`.
- Inspected package scripts and Catalog endpoint surfaces for health, products, pricing, media, Warehouse availability, FlipFlop projection, and Bazos draft.

Implementation evidence:

- Added `scripts/catalog-smoke.js`.
- Added `npm run smoke:e2e`.
- Smoke output names each contract and returns structured JSON with pass/fail/skip counts.
- Default smoke uses `https://catalog.alfares.cz`; override is available through `CATALOG_SMOKE_BASE_URL`.
- Optional product selection is available through `CATALOG_SMOKE_PRODUCT_ID`.

Validation evidence:

- `npm run smoke:e2e` passed against `https://catalog.alfares.cz`: 9 passed, 0 skipped, 0 failed.
- Smoke selected product `a2e15cc0-1a94-4faf-a82f-64afea9e9817`.
- `npm test -- --runInBand` passed: 6 suites / 33 tests.
- `npm run build` passed.
- `git diff --check` passed.

Boundary decisions:

- Smoke performed no authorized production mutations.
- Protected mutation/projection checks used anonymous requests and expected `401`.
- No JWTs, service tokens, secrets, raw response bodies, customer data, or supplier payloads were printed or stored.
- Production deployment was later completed from merge commit `89e9f24`; see Goal 9 merge and deployment entry above.

Next unfinished step:

- Goal 9 source/docs were committed, merged, pushed, deployed, and post-deploy smoke verified.

## 2026-06-13 - Goal 8 Data Import And Reconciliation

Current focus: Goal 8 source implementation on `feature/catalog-goal-08-data-import-reconciliation`.

Planning evidence:

- Created `implementation-goals/GOAL-08-execution-plan.md`.
- Created `reports/validation/GOAL-08-pre-coding-gate.md`.
- Inspected product, category, media, pricing, auth, logger, and app module contracts.

Implementation evidence:

- Added protected `POST /api/imports/reconciliation/dry-run`.
- Added read-only reconciliation for product import rows with SKU, title, EAN, category refs, media URL refs, and pricing rows.
- Report output includes per-row `create`, `update`, or `skip` action, matched product ID, exact missing/invalid fields, duplicate payload identities, existing SKU/EAN conflicts, matched/missing categories, media URL counts, pricing row counts, and totals.
- No product, pricing, media, or category write path is called by the dry-run service.

Validation evidence:

- `npm test -- --runInBand src/import-reconciliation/import-reconciliation.service.spec.ts` passed.
- `npm test -- --runInBand` passed: 6 suites / 33 tests.
- `npm run build` passed.
- `git diff --check` passed.

Boundary decisions:

- Import execution remains dry-run only.
- No destructive action, product delete/archive, media upload, or pricing upsert is exposed.
- Inline media references are blocked; media remains external URLs/object references.
- Pricing batches over 10 rows are reported as requiring human review.
- Production deployment was not run.

Next unfinished step:

- Commit Goal 8 source/docs, then start Goal 9 end-to-end smoke tests or deploy only after explicit owner approval.

## 2026-06-13 - Goal 10/11 Stock And Logistics Projection Isolation

Current focus: isolate pre-existing Goal 10/11 worktree changes after Goal 7 deployment.

Implementation evidence:

- Extended Catalog Warehouse availability rows with Warehouse-owned stock-origin metadata: `warehouseCode`, `warehouseName`, `warehouseType`, and `supplierId`.
- Added Warehouse logistics batch call to attach Warehouse-owned logistics plans under Catalog availability items.
- Added `availability.warehouses[]` and `availability.logistics` to the FlipFlop projection while preserving `stockQuantity` as Warehouse `totalAvailable`.
- Added Goal 10 and Goal 11 goal/validation artifacts.

Validation evidence:

- `npm test -- --runInBand` passed: 5 suites / 23 tests.
- `npm run build` passed.
- `git diff --check` passed.

Boundary decisions:

- Warehouse remains stock-origin and logistics authority.
- Catalog forwards Warehouse-owned metadata only; no Catalog stock persistence, logistics derivation, warehouse mutation, supplier credentials, or deployment was added.
- Goal 7 deployment evidence from commit `a80b18e` remains preserved.

Next unfinished step:

- Review/deploy Goal 10/11 only after explicit owner approval.

## 2026-06-13 - Goal 7 Bazos Draft Integration Contract Deployment

Current focus: Goal 7 deployment and bounded production smoke.

Deployment evidence:

- Commit `3503372` deployed from clean detached worktree `/tmp/catalog-goal7-deploy`.
- Image `localhost:5000/catalog-microservice:3503372` and `latest` were built and pushed.
- Kubernetes manifests applied, deployment restarted, rollout completed, and deployment health check returned `healthy`.
- Production `GET /health` returned `200` with status `healthy`.
- Anonymous `POST /api/products/:id/bazos-draft` returned `401` with `Missing or invalid Authorization header`, confirming the new action endpoint is deployed and protected.

Boundary evidence:

- Deployment used clean commit `3503372`, excluding unrelated dirty Goal 10 worktree changes.
- Smoke did not use service tokens, runtime secrets, Bazos identity data, cookies, verification codes, production product data, or session material.
- Authorized Bazos draft runtime smoke was not run because it would require approved runtime credentials and Bazos identity context.

Next unfinished step:

- Continue to the next ready goal only after resolving or isolating the existing unrelated Goal 10 worktree changes.

## 2026-06-13 - Goal 7 Bazos Draft Integration Contract Source Implementation

Current focus: Goal 7 - Bazos Draft Integration Contract source implementation.

Implementation evidence:

- Added protected `POST /api/products/:id/bazos-draft`.
- Kept `POST /api/products/:id/sell-on-bazos` as a compatibility alias that delegates to draft request behavior.
- Removed Catalog direct Bazos account, identity, offer, and enqueue-publish orchestration from the product action path.
- Catalog now calls Bazos `POST /api/bazos/catalog/products/:productId/sell-action` to request draft preparation.
- Catalog response surfaces Bazos `policyStatus`, `requiresConfirmation`, `canQueueAfterConfirmation`, `requiresHumanAction`, and `nextAction`.
- Added `docs/contracts/bazos-draft-integration.md`.

Validation evidence:

- `npm test -- --runInBand` passed: 5 suites / 23 tests.
- `npm run build` passed.
- `git diff --check` passed.
- Created `reports/validation/VAL-GOAL-07-bazos-draft-integration-contract.md`.

Boundary decisions:

- Catalog does not publish directly to Bazos.
- Catalog does not create Bazos identities/accounts or enqueue publish jobs.
- Bazos remains final policy and publishing authority.
- Runtime deployment was not run for Goal 7.

Next unfinished step:

- Commit Goal 7 source/docs when ready, then deploy only with owner approval.

## 2026-06-13 - Goal 6 FlipFlop Catalog Projection Deployment

Current focus: Goal 6 deployment and bounded production smoke.

Deployment evidence:

- Commit `c989883` deployed with `./scripts/deploy.sh`.
- Image `localhost:5000/catalog-microservice:c989883` and `latest` were built and pushed.
- Kubernetes manifests applied, deployment restarted, rollout completed, and deployment health check returned `healthy`.
- Production `GET /health` returned `200` with status `healthy`.
- Anonymous `POST /api/products/projections/flipflop/batch` returned `401` with `Missing or invalid Authorization header`, confirming the new projection endpoint is deployed and protected.

Boundary evidence:

- Smoke did not use service tokens, runtime secrets, production product lists, or Warehouse-sensitive data.
- Authorized projection smoke with real availability was not run because it would require approved runtime credentials and product IDs.
- Existing product read envelopes were not changed by the deployment.

Next unfinished step:

- Start Goal 7 - Bazos Draft Integration Contract.

## 2026-06-13 - Goal 6 FlipFlop Catalog Projection Source Implementation

Current focus: Goal 6 - FlipFlop Catalog Projection source implementation.

Implementation evidence:

- Added protected `POST /api/products/projections/flipflop/batch` as an additive Catalog contract.
- Added typed FlipFlop projection request and response models.
- Added product batch lookup with categories, media, and pricing relations without changing existing product read envelopes.
- Composed Catalog product truth, deterministic current pricing, FlipFlop readiness, and Warehouse-sourced availability.
- Mapped `name`, `price`, and `stockQuantity` compatibility fields only inside the FlipFlop projection contract.
- Documented the contract in `docs/contracts/flipflop-catalog-projection.md`.
- Added focused Jest coverage for mapping, invalid IDs, unavailable filtering, and batched Warehouse availability use.

Validation evidence:

- Commit SHA: 028a404.
- `npm test -- --runInBand` passed: 5 suites / 21 tests.
- `npm run build` passed.
- `git diff --check` passed.
- Created `reports/validation/VAL-GOAL-06-flipflop-catalog-projection.md`.

Boundary decisions:

- Existing product read envelopes remain unchanged.
- Warehouse remains stock authority through explicit `source: "warehouse"` availability fields.
- FlipFlop remains storefront, cart, checkout, order, payment, and UX owner.
- Production deployment and authorized runtime smoke require explicit owner approval.

Next unfinished step:

- Source commit 028a404 is recorded. Deploy only with owner approval.

## 2026-06-13 - Goal 6 FlipFlop Catalog Projection Planning

Current focus: Goal 6 - FlipFlop Catalog Projection planning and pre-coding gate.

Planning evidence:

- Created branch `feature/catalog-goal-06-flipflop-catalog-projection` from the Goal 5 closure head.
- Created `implementation-goals/GOAL-06-execution-plan.md`.
- Created `reports/validation/GOAL-06-pre-coding-gate.md`.
- Inspected Catalog product reads, pricing current-price endpoint, channel readiness, and Warehouse availability contract.
- Inspected FlipFlop Catalog and Warehouse clients plus frontend product type expectations.
- Confirmed FlipFlop currently expects projection fields such as `name`, `price`, `stockQuantity`, image URLs, categories, SEO/tags, and timestamps.
- Confirmed current FlipFlop server code performs separate Catalog pricing and Warehouse stock calls; Goal 6 should provide a Catalog projection contract but not change FlipFlop source.

Pre-coding gate evidence:

- `git status --short --branch` confirmed the Goal 6 branch.
- Missing marker scan found no unresolved IPS missing or unknown markers in the Goal 6 gate target set.
- `git diff --check` passed.

Boundary decisions:

- Goal 6 source work should be additive and preserve existing product read envelopes.
- Catalog may expose projection aliases (`name`, `price`, `stockQuantity`) only inside a documented FlipFlop projection contract.
- Price must come from Catalog deterministic current pricing.
- Availability must remain Warehouse-sourced through the Goal 5 contract and marked as such.
- FlipFlop retains storefront, cart, checkout, and UX ownership; no FlipFlop repository source changes are part of this Catalog goal.

Next unfinished step:

- Implement Goal 6 source changes from `implementation-goals/GOAL-06-execution-plan.md`, then run `npm test -- --runInBand`, `npm run build`, and `git diff --check`.

## 2026-06-13 - Goal 5 Catalog/Warehouse Contract Deployment

Current focus: Goal 5 deployment and bounded production smoke.

Closure evidence:

- Commit `874e080` contains Goal 5 source/docs for the Catalog/Warehouse availability contract.
- `./scripts/deploy.sh` deployed image `localhost:5000/catalog-microservice:874e080` and `latest`.
- Deployment phases completed successfully: preflight, image build, push, manifest apply, deployment restart, rollout, and health check.
- Production health returned `healthy` for `catalog-microservice` version `1.0.0`.
- Safe production smoke verified `GET /health` returned `200` and anonymous `POST /api/products/availability/batch` returned `401` with `Missing or invalid Authorization header`.
- Full in-pod contract smoke with synthetic product create/delete and service-token Warehouse call was not run because it requires explicit approval for production mutations and runtime secret use.

Boundary evidence:

- The deployed endpoint is protected by `CatalogAuthGuard`.
- Goal 5 source tests prove unknown product IDs are rejected before Warehouse calls, valid product batches use one Warehouse request, zero-row Warehouse semantics are preserved, and dependency failures do not fabricate stock.
- Warehouse remains the stock authority; Catalog schema has no stock persistence.

Next unfinished step:

- If required, run the full authorized runtime contract smoke only after explicit approval for production synthetic product mutations and in-pod runtime credential use.

## 2026-06-13 - Goal 5 Catalog/Warehouse Contract Source Implementation

Current focus: Goal 5 - Catalog/Warehouse Contract source implementation.

Implementation evidence:

- Added protected `POST /api/products/availability/batch` through a new `warehouse-availability` module.
- Added Catalog product identity lookup before Warehouse use through `ProductsService.findIdentitiesByIds`.
- Unknown Catalog product IDs return `400 Bad Request` before any Warehouse request is made.
- Valid product IDs are sent to Warehouse `POST /api/stock/availability/batch` in one batch request with optional `warehouseIds`.
- Availability response items include Catalog `sku`, `source: "warehouse"`, Warehouse totals, and Warehouse per-location rows.
- Valid products missing Warehouse rows map to zero totals and empty `warehouses`, preserving Warehouse zero-row semantics without Catalog stock ownership.
- Warehouse service URL/token are read from runtime env only; no credentials are hardcoded, printed, or stored in validation evidence.
- No Catalog product schema stock fields were added.

Validation evidence:

- `npm test -- --runInBand` passed: 4 suites / 15 tests.
- `npm run build` passed.
- `git diff --check` passed.
- Created `reports/validation/VAL-GOAL-05-catalog-warehouse-contract.md`.

Boundary decisions:

- Catalog proves product identity and enriches SKU metadata only.
- Warehouse remains the stock authority for total quantity, reserved, available, warehouses, reservations, movements, and locations.
- Existing product and channel-readiness read envelopes remain unchanged.
- Runtime Warehouse verification is deferred until deployment and approved service-token handling are available.

Next unfinished step:

- Commit Goal 5 source/docs when ready, then deploy only with owner approval and run a runtime contract smoke without printing token values.

## 2026-06-13 - Goal 5 Catalog/Warehouse Contract Planning

Current focus: Goal 5 - Catalog/Warehouse Contract planning and pre-coding gate.

Planning evidence:

- Created branch `feature/catalog-goal-05-catalog-warehouse-contract` from the clean Goal 4 head.
- Created `implementation-goals/GOAL-05-execution-plan.md`.
- Inspected Catalog product, readiness, app module, and existing stock-related code.
- Inspected Warehouse `POST /api/stock/availability/batch`, availability contract docs, and global JWT roles guard.
- Confirmed Catalog currently has no warehouse availability integration under `src/`.
- Confirmed Warehouse batch availability already returns zero totals for known product IDs with no stock rows and remains the stock authority.

Pre-coding gate evidence:

- `git status --short --branch` confirmed the Goal 5 branch and a documented planning-only diff.
- Missing marker scan found no unresolved IPS missing or unknown markers in the Goal 5 gate target set.
- `git diff --check` passed.

Boundary decisions:

- Goal 5 source work should be additive and schema-neutral.
- Catalog may validate requested product IDs and call Warehouse batch availability once.
- Catalog must not persist stock quantities, reservations, movements, or warehouse locations.
- Warehouse auth must be preserved through approved service-token configuration; no token values may be printed or committed.
- FlipFlop consumption remains Goal 6 unless the owner expands scope.

Next unfinished step:

- Implement Goal 5 source changes from `implementation-goals/GOAL-05-execution-plan.md`, then run `npm test`, `npm run build`, and `git diff --check`.

## 2026-06-13 - RBAC-REM-03 Catalog Frontend Admin Guard

Current focus: Auth remediation RBAC-REM-03 for Catalog frontend role-aware admin guard and stale comment cleanup.

Implementation evidence:

- Updated services/frontend/components/AdminGuard.tsx to use Auth user roles before rendering admin pages.
- Removed stale text that said Auth does not support roles/admin flags.
- Accepted roles now mirror Catalog backend admin/write roles: global:superadmin, app:catalog-microservice:admin, internal:catalog-microservice:admin, and catalog:write.
- Non-authorized authenticated users see an access-required state instead of admin content.

Validation evidence:

- services/frontend npm run build passed.
- git diff --check -- services/frontend/components/AdminGuard.tsx passed.
- No secrets, JWTs, service tokens, production user data, backend authorization, deployment, or database changes.

Next action: Return to Auth RBAC remediation state; recommended next chunk is RBAC-REM-04 SpeakASAP scoped-role normalization review.

## 2026-06-12

Current focus: Goal 4 - Channel Readiness Model planning.

Evidence gathered:

- Catalog production health endpoint returns healthy.
- Catalog production returns six seeded products with categories, placeholder media, and pricing rows.
- Catalog source builds with `npm run build`.
- Warehouse source builds with `npm run build`.
- FlipFlop production reads catalog products but currently shows price and stock as `0`.
- Warehouse stock endpoint requires auth.

Work started:

- Added catalog intent preservation/orchestrator pack.
- Started runtime auth boundary for catalog mutations.

Implementation evidence:

- Added `CatalogAuthGuard` and `RequireCatalogRoles`.
- Protected product, category, attribute, media, and pricing mutation endpoints with `CatalogAuthGuard`.
- Gated product hard delete to `global:superadmin` plus `x-owner-approval: explicit`.
- Fixed product route ordering so `GET /api/products/sku/:sku` is declared before `GET /api/products/:id`.
- Remote `npm run build` passed after these changes.

Completed next chunk:

- Goal 1.4: added audit-grade actor/source logging for writes.

Goal 1.4 implementation evidence:

- Exported catalog actor/request types from `CatalogAuthGuard` for consistent request audit context.
- Added structured `catalog.write` audit logging through `LoggerService.auditCatalogWrite`.
- Product, category, attribute, media, and pricing mutation endpoints now log actor/source, roles, method, route, request/correlation id, source IP, user agent, action, resource type/id, and non-sensitive resource metadata after successful writes.
- Audit logging avoids request bodies and uploaded file content.
- Remote `npm run build` passed.
- Remote `git diff --check` passed.
- Remote `npm test` did not pass because the repo currently has no tests and Jest reports a `catalog-frontend` haste module naming collision between `services/frontend/package.json` and `services/frontend/.next/standalone/services/frontend/package.json`.

Completed final chunk:

- Goal 1.5: direct API verification for unauthorized and authorized writes passed.

Goal 1.5 validation evidence:

- Remote `npm run build` passed.
- Direct app boot outside Kubernetes was blocked by cluster-only database DNS for `db-server-postgres`.
- In-pod direct API smoke ran through `kubectl -n statex-apps exec deployment/catalog-microservice -- node -e <direct API smoke>`.
- Health check returned OK.
- Anonymous `POST /api/categories` returned `401` with `Missing or invalid Authorization header`.
- Synthetic JWT-authorized `POST /api/categories` returned `201`.
- Authorized cleanup `DELETE /api/categories/:id` returned `200`.
- The synthetic JWT was generated inside the pod from `JWT_SECRET`; no token or secret was printed.
- The deployed pod logged category create/delete controller activity but did not show structured `catalog.write` entries, so audit-log runtime proof should be rerun after deploying the Goal 1.4 source changes.

Next unfinished step:

- Commit the Goal 1 source/docs changes in the remote repository, then deploy only with owner approval and rerun runtime audit-log verification.

Additional owner-selected work:

- Added authenticated product media upload support for the admin product detail page.
- Deployed catalog API and frontend after `npm run build` passed in both root and `services/frontend`.
- Runtime smoke: `POST /api/media/upload` returned `201` for product `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3`; cleanup `DELETE /api/media/:id` returned `200`.
- Verified uploaded MinIO object URL returned `HTTP 200` with `content-type: image/png`.
- Removed the smoke-test MinIO object after verification; object delete returned `204`.
- Verified deployed frontend bundle contains the media drop zone, folder picker, and `/media/upload` client call.
- Fixed admin product counts to read the deployed `/api/products` envelope where `data` contains the product array and `pagination` is a sibling field.
- Deployed frontend after `services/frontend npm run build` passed.
- Browser verification: `/admin/products` shows `Manage products (6 total)` and `/admin` shows the Products dashboard card as `6`; no browser console warnings/errors were reported.

Goal 1 closure evidence:

- Commit `2611124` is deployed to production through `./scripts/deploy.sh`.
- Deployment phases completed successfully: preflight, image build, push, manifest apply, rollout, and health check.
- Production health returned `healthy` for `catalog-microservice` version `1.0.0`.
- Runtime smoke in `deployment/catalog-microservice` returned health `200`, anonymous `POST /api/categories` `401`, authorized synthetic JWT `POST /api/categories` `201`, and authorized cleanup `DELETE /api/categories/:id` `200`.
- Active pod `catalog-microservice-649d9b9f89-x9t4z` emitted structured `catalog.write` logs for category create and delete with synthetic actor `codex-goal1-runtime-smoke`, role `catalog:write`, request id `codex-goal1-audit-smoke`, route, method, source IP, user agent, resource type/id, and non-sensitive metadata.
- Synthetic JWT was generated inside the pod from runtime secret and was not printed.

Current focus:

- Goal 2 - Catalog Product Model Completeness.

Next unfinished step:

- Create Goal 2 execution plan and run pre-coding gate before product model changes.

Goal 2 source implementation evidence:

- Added additive product lifecycle model for draft, active, archived, and needs_review while preserving isActive compatibility.
- Added product readiness diagnostics through GET /api/products/:id/readiness.
- Added quality audit endpoint GET /api/products/audits/quality for missing EAN and duplicate SKU/EAN summaries.
- Added diagnostics for missing EAN, duplicate identifiers, missing description/category/media/current price, placeholder media, inactive state, and lifecycle blockers.
- Added additive migration script scripts/migrations/20260612_goal02_product_lifecycle.sql; production runtime validation is pending until this migration is approved and applied before deployment.
- Added focused Jest coverage for lifecycle defaults and incomplete-product readiness diagnostics.
- npm test passed: 1 suite, 2 tests.
- npm run build passed.
- git diff --check passed.

Next unfinished step:

- Goal 2 complete. Create Goal 3 execution plan and run the pre-coding gate before pricing integrity source changes.

Goal 2 closure evidence:

- Production schema check used `psql` from the Kubernetes Postgres environment before migration and confirmed `products."isActive"` exists.
- Applied `scripts/migrations/20260612_goal02_product_lifecycle.sql` with `ON_ERROR_STOP=1`; verified `products.lifecycle`, `products_lifecycle_check`, and `idx_products_lifecycle`.
- Commit `fcb1919` deployed with `./scripts/deploy.sh`; preflight, image build, push, manifest apply, rollout, and health check passed.
- Runtime in-pod smoke returned health `200` and confirmed the existing `GET /api/products` envelope remains `success` plus `data` array plus `pagination`.
- Runtime smoke created and updated synthetic lifecycle products, verified readiness lifecycle/checks/issues, missing EAN/current price diagnostics, placeholder media diagnostics, and duplicate EAN diagnostics.
- Runtime smoke verified `GET /api/products/audits/quality` returns `missingEan`, `duplicateSkus`, and `duplicateEans` summaries.
- Cleanup proved hard delete is blocked without explicit owner approval, then deleted only the synthetic products with `x-owner-approval: explicit`; post-cleanup database check found zero `CODEX-GOAL2-%` products.
- Synthetic JWT was generated inside the deployed pod from runtime secret and was not printed.

Current focus:

- Goal 3 - Pricing Integrity planning.

Next unfinished step:

- Implement Goal 3 pricing integrity source changes according to `implementation-goals/GOAL-03-execution-plan.md`.

Goal 3 planning evidence:

- Created `implementation-goals/GOAL-03-execution-plan.md`.
- Created `reports/validation/GOAL-03-pre-coding-gate.md`.
- Pre-coding scope covers deterministic current-price selection, pricing validation, mass-change human-review guard, and non-sensitive audit metadata.
- Source implementation has not started.

Next unfinished step:

- Implement Goal 3 pricing integrity source changes, then run `npm test`, `npm run build`, and `git diff --check`.

Goal 3 source implementation evidence:

- Updated current-price selection to evaluate active rows whose validity window contains the request time and choose deterministically by sale priority, newest valid start date, newest update timestamp, then newest creation timestamp.
- Added service-level pricing write validation for required product ID, three-letter uppercase currency, positive base/cost/sale amounts, sale price not exceeding base price, lowercase price type tokens, finite margin values, and valid date windows.
- Added `POST /api/pricing/bulk` behind `CatalogAuthGuard`; more than 10 pricing rows require `x-human-review: explicit`.
- Preserved existing pricing read envelopes as `{ success: true, data: ... }`.
- Kept pricing mutations protected by `CatalogAuthGuard` and expanded non-sensitive audit metadata with price type, currency, row count, product count, and human-review marker status.
- Added focused Jest coverage in `src/pricing/pricing.service.spec.ts` for deterministic current price priority, invalid pricing rejection, validity window rejection, and mass-change human-review guard.
- Validation passed: `npm test` returned 2 suites/6 tests passed; `npm run build` passed; `git diff --check` passed.
- Production deployment was not requested and was not run.

Next unfinished step:

- Goal 3 deployment approved, completed, and runtime-smoked. Start Goal 4 planning/pre-coding gate.


Goal 3 closure evidence:

- Branch `feature/catalog-goal-03-pricing-integrity` was pushed to `origin` at commit `d222e11`.
- Validation before deployment passed: `npm test` 2 suites/6 tests, `npm run build`, and `git diff --check`.
- `./scripts/deploy.sh` completed successfully after owner approval; image `localhost:5000/catalog-microservice:d222e11` and `latest` were pushed.
- Kubernetes rollout for `deployment/catalog-microservice` in namespace `statex-apps` completed and deploy health check returned healthy.
- Runtime in-pod smoke returned health `200`, synthetic product create `201`, invalid pricing rejection `400`, regular pricing create `201`, sale pricing create `201`, current-price selection `sale`, bulk without human review `400`, bulk with `x-human-review: explicit` `201`, and synthetic cleanup hard delete `204`.
- Active pod logs emitted structured `catalog.write` events for pricing upsert and bulk upsert with synthetic actor `codex-goal3-runtime-smoke`, route/method/source metadata, price metadata, `rowCount: 11`, and `humanReviewExplicit: true`.
- Synthetic JWT was generated inside the pod from runtime secret and was not printed.

Current focus:

- Goal 4 - Channel Readiness Model planning.

Next unfinished step:

- Create Goal 4 execution plan and run the pre-coding gate before channel readiness source changes.

Goal 4 source implementation evidence:

- Created `implementation-goals/GOAL-04-execution-plan.md` and reran the Goal 4 pre-coding gate after Goal 3 closure was documented remotely.
- Added a read-only channel readiness module and endpoint at `GET /api/products/:id/channel-readiness`.
- Added typed readiness response entries with channel, status, missing fields, issues, next action, and authority.
- Added FlipFlop readiness rules for active lifecycle, active product state, title, description, category, media, and deterministic current price while preserving FlipFlop storefront/checkout authority.
- Added Bazos draft-readiness rules that require catalog fields but defer compliance, identity, queueing, and publish decisions to Bazos.
- Did not call Bazos, enqueue publishing, implement FlipFlop checkout, move stock ownership, or add mutations.
- Existing `sellOnBazos` remains a documented boundary risk for separate Goal 7 or owner-approved follow-up; Goal 4 did not expand it.
- Validation passed: `npm test` 3 suites/10 tests, `npm run build`, and `git diff --check`.
- Production deployment was not requested and was not run.

Next unfinished step:

- Commit and push Goal 4 source/docs changes, then request explicit owner approval before any production deployment or runtime smoke.

Goal 4 closure evidence:

- Owner approved Goal 4 production deployment on 2026-06-13.
- Branch `feature/catalog-goal-04-channel-readiness-model` was pushed to `origin` at `5f0e087`; Goal 4 source commit is `75d0700`.
- `./scripts/deploy.sh` completed successfully; image `localhost:5000/catalog-microservice:5f0e087` and `latest` were pushed.
- Kubernetes rollout for `deployment/catalog-microservice` in namespace `statex-apps` completed and deploy health check returned healthy.
- Runtime in-pod smoke returned synthetic product create `201`, channel readiness `200`, `channelCount: 2`, FlipFlop `ready: false`, missing fields `description`, `categories`, `media`, and `pricing`, Bazos `authority: "bazos"`, and Bazos policy-deferred issue present.
- Runtime smoke verified no Bazos publish-permission fields and deleted the synthetic product through hard delete with explicit owner approval.
- Post-cleanup public read check for `CODEX-GOAL4` returned total `0`.
- Synthetic JWT was generated inside the deployed pod from runtime secret and was not printed.

Current focus:

- Goal 5 - Catalog/Warehouse Contract planning.

Next unfinished step:

- Create Goal 5 execution plan and run the pre-coding gate before catalog/warehouse contract source changes.

## 2026-06-13 - FlipFlop Projection Warehouse Route Gate

Change: tightened `FlipFlopProjectionService` so default FlipFlop projection now requires positive Warehouse availability and at least one reservable Warehouse logistics route. Products with stock but no reservable Warehouse route are excluded by default and remain inspectable with `includeUnavailable=true`, preserving diagnostics without treating them as sellable downstream goods.

Validation evidence: focused `src/flipflop-projection/flipflop-projection.service.spec.ts` passed, `npm run build` passed, and `git diff --check` passed. Added focused coverage for stock with no reservable Warehouse route.

Boundary decision: no deployment, runtime token inspection, production product mutation, Warehouse stock mutation, or supplier import was performed. Runtime completion remains pending cross-service approved evidence regeneration.

## 2026-06-13 - Channel Readiness Warehouse Coverage Gate

Change: tightened Catalog channel readiness so FlipFlop readiness now requires sellable Warehouse coverage, including positive stock and a reservable Warehouse logistics route. The readiness response exposes Warehouse coverage facts for FlipFlop, and FlipFlop projection passes its already-fetched Warehouse availability snapshot into readiness to avoid an extra Warehouse coverage call per projected product.

Validation evidence: focused src/channel-readiness/channel-readiness.service.spec.ts and src/flipflop-projection/flipflop-projection.service.spec.ts passed, npm run build passed, and git diff --check passed. Added focused coverage for Warehouse stock without a reservable route blocking FlipFlop readiness and for injected Warehouse coverage facts.

Boundary decision: no deployment, runtime token inspection, production product mutation, Warehouse stock mutation, or supplier import was performed. Runtime completion remains pending owner-approved cross-service evidence regeneration.

## 2026-06-29 - Warehouse Stock Propagation Cross-Repo Execution

Change: completed the first cross-repo implementation pass for Warehouse-backed stock amounts and sellability gates. Catalog product detail now displays Warehouse availability for `/dashboard/products/:id`; Allegro imports `stock.available` into Warehouse; Orders fails closed when sellable-channel orders lack a successful Warehouse reservation; Bazos, Aukro, and FlipFlop now gate sellable paths on Warehouse authority; Heureka order ingestion now derives or validates `warehouseId` before forwarding to Orders.

Runtime evidence:
- Target product `884c1c5e-fe94-46c7-aab1-78bcc424e7ee` has Warehouse row `quantity=60`, `reserved=0`, `available=60` in warehouse `c0de0000-0000-4000-8000-000000000013`.
- Warehouse movement evidence: `reason=ALLEGRO_OFFER_STOCK_IMPORT`, `reference=18106496345`, `createdBy=service:allegro-service`; outbox `stock.updated` was published.
- Allegro account `FlipFlop` backfill imported 9 visible offers: Allegro total `stock.available=496`; Warehouse readback `totalAvailable=496`; mismatches `0`; target product remained `60`.
- Catalog frontend was deployed from `8acf820 feat: show warehouse stock on product detail`; public product route returned HTTP 200.
- Orders reservation gate was deployed from `dba03dc fix: fail closed on missing warehouse reservation`.
- Allegro import/backfill was deployed from `2db3841 Import Allegro offer stock into Warehouse`.
- Aukro publish stock gate was deployed from `e466338 fix: gate Aukro publish on warehouse stock`.
- Bazos publish stock gate was deployed from `555983e fix: gate Bazos publish on warehouse stock`; health returned `{"status":"ok","service":"bazos-service"}`.
- FlipFlop checkout/order authority fix was deployed, validated live with all six FlipFlop deployments `1/1`, homepage HTTP 200, product API GET HTTP 200, and then committed/pushed as `f85f64f fix: enforce warehouse authority in checkout orders`.
- Heureka order route derivation was validated, committed, and pushed as `31688fb fix: require warehouse route for Heureka orders`, but not deployed because `scripts/deploy.sh` only reapplies manifests/restarts Kubernetes and no image build/publish release path was identified in the handoff.

Validation evidence:
- Catalog: `git diff --check`, root `npm run build`, and `cd services/frontend && npm run build` passed; deploy rollout succeeded, with an existing deploy-script health-selector caveat for completed monitor pods.
- Orders: `git diff --check`, `npm run build`, `npm run verify:order-reservation-gate`, `npm run verify:warehouse-handoff`, and `npm test` passed before deploy.
- Bazos: focused policy spec, `git diff --check`, shared build/test, and root tests passed before deploy.
- Aukro: focused offer spec, `git diff --check`, `npm test`, and `npm run build` passed before deploy.
- Heureka: focused orders spec with `LOGGING_SERVICE_URL`, contract verifier, shared build, service build, and `git diff --check` passed.
- FlipFlop: pre-coding gate, strict doc audit, `git diff --check`, `npm run verify:orders-hub-integration`, shared build, order-service build, deployment readiness gate, deploy, and post-deploy HTTP GET checks passed.

Boundary decisions:
- Warehouse remains stock and reservation authority; Catalog displays availability and does not persist stock truth.
- Allegro is the initial import source only. The user clarified the expected 1000+ refers to pieces, not product records; current Allegro `FlipFlop` account evidence explains 496 pieces across 9 offers, so the remaining physical inventory source is `[UNKNOWN: manual warehouse system, Bizbox export, another Allegro account, CSV source, or other inventory feed]`.
- Heureka source is committed but not live until an image-building release path is identified and run.
- No raw secret values or direct DB stock edits were committed.

Next action: discover/import the remaining physical stock source beyond the 496 Allegro units, then release the committed Heureka image path once identified.

## 2026-06-29 - Central Stock Acceptance Gate Runner

Change: added a Catalog-owned read-only ops runner for final stock acceptance. The runner selects only running pods matching the current deployment image, runs the Warehouse stock authority verifier, runs the Allegro current-stock import script in dry-run Warehouse-verify mode, and runs the Catalog authorized smoke with stock, channel status, and Heureka readiness enabled.

Intent chain:
- Vision: prevent overselling by making Warehouse availability the checked authority before sales-channel propagation.
- Goal Impact: collapse the current multi-command manual acceptance process into one repeatable gate.
- System: Catalog orchestrates the gate; Warehouse, Allegro, Catalog, FlipFlop/Bazos/Aukro/Heureka projections provide evidence.
- Feature: `npm run verify:stock-acceptance:gates`.
- Task: verify the 9 current Allegro-authoritative product IDs against expected totals `124,87,50,25,110,60,10,3,27`.
- Execution Plan: execute live read-only verifiers, parse JSON evidence, fail closed on any Warehouse issue, Allegro mismatch, mutating Allegro mode, or Catalog/channel stock mismatch.
- Coding Prompt: add an ops script only; do not mutate Warehouse, apply Allegro imports, change schemas, or print secrets.
- Code: `scripts/run-stock-acceptance-gates.sh` and `package.json`.
- Validation: `bash -n scripts/run-stock-acceptance-gates.sh` passed; `git diff --check` passed; focused `src/warehouse-availability/warehouse-availability.service.spec.ts` passed 16 tests; `npm run build` passed; Catalog deployed successfully as image `localhost:5000/catalog-microservice:67c29f8` with healthy rollout. Live read-only acceptance gate still fails at the Catalog propagation leg: Warehouse authority verifier passes for 9 products with `totalAvailable=496`, Allegro dry-run verifies Warehouse with `warehouseMatches=9` and `warehouseMismatches=0`, but Catalog smoke returns `503` for authorized Warehouse availability because Warehouse rejects all configured Catalog Warehouse credentials.

Boundary decision: this does not solve the remaining physical stock source gap. The configured Allegro accounts still expose only the current 9 stock-authoritative offers totaling 496 pieces; the 1000+ expected physical stock source remains `[MISSING: owner-provided BizBox/current export, additional seller authorization, or explicit authority confirmation]`.

Current blocker: Catalog now tries `WAREHOUSE_SERVICE_TOKEN`, `WAREHOUSE_INTERNAL_SERVICE_TOKEN`, `JWT_TOKEN`, `CATALOG_INTERNAL_SERVICE_TOKEN`, and `INTERNAL_SERVICE_TOKEN` for Warehouse calls, but the live Catalog pod's configured candidates are rejected by Warehouse/Auth. Warehouse currently accepts Allegro `JWT_TOKEN` for verification but rejects Catalog `WAREHOUSE_SERVICE_TOKEN`, Catalog `JWT_TOKEN`, and `CATALOG_INTERNAL_SERVICE_TOKEN`. Passing final acceptance requires either a valid Auth-issued Warehouse-compatible Catalog token in runtime config or an owner-approved machine-identity receiver contract in Warehouse; no Warehouse auth bypass was added.

## 2026-06-29 - Stock Goal Continuation: Auth And Source Evidence

Change: continued the cross-repo stock goal from the acceptance-gate blocker without adding a Warehouse static-token bypass. The current deployed state remains:
- Catalog `localhost:5000/catalog-microservice:67c29f8`, ready `1/1`.
- Warehouse `localhost:5000/warehouse-microservice:8a66b27`, ready `1/1`.
- Allegro `localhost:5000/allegro-service:50b5858`, ready `1/1`.
- Auth `localhost:5000/auth-microservice:9a309b0-20260629000608`, ready `1/1`.

Auth/receiver evidence:
- Auth `/auth/validate` currently validates user JWTs by verifying the token and loading an active user by `payload.sub`; it does not validate static machine tokens as service actors.
- Warehouse uses Auth `/auth/validate` through `JwtRolesGuard` for protected routes.
- Catalog-to-Warehouse candidate credentials are rejected by Warehouse/Auth in runtime; Allegro `JWT_TOKEN` remains accepted for the Allegro Warehouse verifier.
- A broad Warehouse guard bypass and a route-scoped static-token read guard were not implemented because they change Warehouse's persistent machine-auth model and require explicit owner approval.

Remaining stock-source evidence:
- Repo search found `suppliers-microservice` has a generic REST/JSON stock candidate contract and validation-first Warehouse reconciliation path with `supplierSku`, `productId`, `warehouseId`, and `stockQuantity`.
- Suppliers docs still mark real supplier/BizBox payload facts as missing; the generic adapter does not identify a real physical stock source by itself.
- A read-only Suppliers API metadata probe was attempted through the live pod with its own `JWT_TOKEN`; the service returned `401 Invalid token`, so no supplier/import metadata was read through that route.
- No production supplier import, Warehouse mutation, stock reservation, DB query, or secret value print was performed.

Current blockers:
- `[MISSING: owner-approved machine-auth receiver contract or valid Auth-compatible Catalog Warehouse token]` for passing the Catalog propagation leg of the stock acceptance gate.
- `[MISSING: owner-provided BizBox/current export, real supplier API contract, additional seller authorization, or explicit authority confirmation]` for stock beyond the 9 current Allegro-authoritative offers totaling 496 pieces.
- `[MISSING: explicit approval for read-only Suppliers DB/API metadata inspection if service JWT remains invalid]`.


## 2026-07-01 - Heureka Catalog Publication Connector

Change: added Heureka to Catalog marketplace publication and content conversion. Catalog now exposes protected GET /api/products/:id/heureka-status, protected POST /api/products/:id/sell-on-heureka, public-safe GET /api/products/:id/heureka-feed-snapshot, and bulk POST /api/products/publications/bulk accepts marketplaces=[heureka]. Canonical product JSON stays in Catalog; Heureka-specific feed fields are rendered from the content connector and product_marketplace_profiles overrides: productName, categoryText, deliveryDate, deliveryPrice, feedType, feedProductId.

Runtime evidence: Catalog focused tests passed (src/content-connectors/content-renderer.service.spec.ts, src/products/products.service.spec.ts, 25 tests), Catalog build passed, Catalog deployed image digest sha256:0ce500d55881258f9fded223898fc222df9445c87c5e4bf6346afccdeec918ba. Live snapshot endpoint returned contractVersion=catalog-heureka-feed-snapshot.v1 with CATEGORYTEXT, PRICE_VAT, IMGURL, and canonical description for product aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3.

Heureka integration evidence: Heureka accepts HEUREKA_INTERNAL_SERVICE_TOKEN sourced from Catalog internal token, consumes Catalog Heureka feed snapshots, and filters public XML output to stock-positive products with required public feed fields. Bulk publish from Catalog to Heureka succeeded for six FlipFlop products: requested=6, succeeded=6, blocked=0. Heureka status for aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3 returned included=true, readiness=ready, availableStock=12. Public https://heureka.alfares.cz/heureka/feed?type=heureka_cz returned HTTP 200, x-heureka-feed-status=valid, SHOPITEM=6, CATEGORYTEXT=6, and excluded older blocked product 8bba517b-e5c6-41c4-9bb3-92108f4f84c3. Heureka deployed image digest sha256:c9c367d32c2709dc405aa0d35fbd5f3e652d1953163dd93131b2efbd965e01f8.

Boundary decision: no raw secret values were printed; token verification used length and hash prefixes only. No destructive DB/file operations were performed.

Next action: No action needed.


## 2026-07-02 - Goal 24 Internal Order Affinity Batch Upsert Contract

Intent chain:

- Vision: Catalog remains durable product relation owner while Marketing can later submit bounded order-affinity candidates through a Catalog-owned write surface.
- Goal Impact: cross-service order-affinity ingestion now has a source-validated Catalog endpoint contract without direct DB writes or bundle-selling side effects.
- System: Marketing computes candidates; Catalog validates products, relation constraints, and persistence; Orders/Warehouse/Payments/marketplaces remain unchanged.
- Feature: protected internal batch upsert for `marketing_order_affinity` order-affinity rows.
- Task: add `POST /api/internal/product-relations/order-affinity/batch`, service batch handling, DTOs, and focused tests.
- Execution Plan: Catalog product-relations module only; no migration, no live backfill, no pruning, no marketplace publication.
- Coding Prompt: force `relationType=order_affinity` and `source=marketing_order_affinity` server-side, return per-item statuses, keep evidence bounded.
- Code: `src/product-relations/product-relations.controller.ts`, `src/product-relations/product-relations.service.ts`, `src/product-relations/product-relations.dto.ts`, `src/product-relations/product-relations.module.ts`, `src/product-relations/product-relations.service.spec.ts`.
- Validation: focused product-relations Jest passed 5/5; `npm run build` passed; `git diff --check` passed.

Boundary decision:

- No relation rows were inserted during validation.
- Runtime deploy completed with image tag `related-products-batch-20260702-1801`; protected in-pod batch smoke returned HTTP 201 with `failed=1` for a self-relation validation case and inserted no valid relation row.
- No Orders, Marketing runtime caller, Warehouse, Payments, checkout, bundle, or marketplace code was changed from Catalog.


## 2026-07-02 - BPCP Holiday Discount Catalog Consumer

Intent chain:

- Vision: business-process publication can activate Catalog-owned product facts without changing Catalog pricing or product-truth ownership.
- Goal Impact: Holiday Discount pilot has the first downstream consumer lane from BPCP to Catalog.
- System: BPCP publishes signed process lifecycle events; Catalog owns its queue, projection, health, and product eligibility facts.
- Feature: BPCP process-event consumer and fail-closed discount eligibility facts endpoint.
- Task: bind `catalog.bpcp.process-lifecycle.v1` to `bpcp.events`, validate `bpcp.process-event.v1`, project supported active processes, and expose `catalog.discount-eligibility-facts.v1`.
- Execution Plan: additive `src/bpcp-events` module, health/readiness integration, k8s env/secret wiring, focused tests, and static verifier.
- Coding Prompt: do not move discount calculation, pricing, cart, order, or process registry ownership into Catalog; mark unresolved fact schema and category references as `[MISSING: ...]`.
- Code: `src/bpcp-events/*`, `src/health/*`, `src/app.module.ts`, `k8s/configmap.yaml`, `k8s/external-secret.yaml`, `scripts/verify-bpcp-consumer.js`, `docs/business-process-control-plane/HOLIDAY_DISCOUNT_ADOPTION.md`.
- Validation: npm run verify:bpcp-consumer passed; focused BPCP projection Jest passed 4/4; npm run build passed; full npm test -- --runInBand passed 13 suites / 117 tests; git diff --check passed. Refreshed read-only validation on 2026-07-02T23:07Z confirmed the same gates on remote main.

Boundary decision: Catalog consumes BPCP publication state and exposes eligibility facts only. It does not calculate the 10 percent discount, write product prices, call checkout, emit customer notifications, or become the BPCP process registry.

Runtime deployment evidence: current deployed image `localhost:5000/catalog-microservice:4b7cfa0` is rolled out with deployment ready/updated/available `1/1/1`. BPCP `holiday-discount-2026:1` was validated and published through the BPCP API, then `POST /api/events/outbox/dispatch?limit=10` dispatched 3/3 pending process events to RabbitMQ. Catalog `/health` and `/ready` report `bpcpProcessEvents.consumer.connection.status=up`, `missing=[]`, `received=1`, `applied=1`, `rejected=0`, `signatureFailures=0`, `lastAppliedEventId=holiday-discount-2026:1:process.published:3`, and `activeProjectionCount=1`. Remaining blockers are `[MISSING: final holiday eligibility fact schema or configured category/tag allow-list]` and `[MISSING: durable BPCP event dedupe/projection store]`.


## 2026-07-03 - Bundle Candidate Projection From Order Affinity

Current focus: Expose a read-only Catalog bundle-candidate projection over existing `order_affinity` relations.

Intent Preservation Chain:

- Vision: Real purchase-derived product relationships can power buy-together presentation and future sets without bypassing Catalog product truth or checkout authority.
- Goal Impact: Marketplaces can request candidate product pairs with deterministic current pricing and free-shipping top-up guidance while bundle SKU creation and checkout totals remain blocked until owner contracts exist.
- System: Marketing produces `order_affinity` relations from Orders events; Catalog owns relation and product/pricing truth; FlipFlop/Orders/Payments own cart, discounts, totals, stock, and payment authorization.
- Feature: Read-only bundle-candidate API.
- Task: Add `GET /api/products/:productId/bundle-candidates`, derive candidates from visible `order_affinity` rows, enrich with product identity/current pricing, and expose threshold/top-up blockers.
- Execution Plan: Catalog `product-relations` only; import `PricingModule`; no DB migration; no write endpoints; no checkout, warehouse, payment, marketplace publication, or bundle SKU mutation.
- Coding Prompt: Return bounded pair candidates ordered by relation score/confidence, include current price summaries, calculate suggested display price only when `freeShippingThreshold` is supplied, and surface `[MISSING: ...]` blockers instead of inventing shipping policy.
- Code: `src/product-relations/product-relations.controller.ts`, `src/product-relations/product-relations.service.ts`, `src/product-relations/product-relations.dto.ts`, `src/product-relations/product-relations.module.ts`, `src/product-relations/product-relations.service.spec.ts`, `docs/contracts/catalog-product-relations.md`, and this status entry.
- Validation: focused product-relations Jest passed 7/7; `npm run build` passed; `git diff --check` passed.

Parallel execution evidence:

- Marketplace/read-path subagent confirmed FlipFlop already has related product and buy-together UI/read paths and should consume Catalog as candidate source without Catalog owning checkout discounts.
- Catalog explorer subagent confirmed no migration is needed and identified `[MISSING: approved bundle checkout contract owned by FlipFlop/Orders/Payments]`, `[MISSING: explicit discount/price presentation policy for bundle candidates]`, and `[MISSING: sufficient order_affinity backfill volume]`.

Remaining blockers:

- `[MISSING: approved bundle checkout contract owned by FlipFlop/Orders/Payments]`.
- `[MISSING: explicit discount/price presentation policy for bundle candidates]`.
- `[MISSING: sufficient order_affinity backfill volume]`.
Runtime deployment evidence:

- Commit `3ad60c3` was pushed and deployed as `localhost:5000/catalog-microservice:3ad60c3`.
- Deploy script completed successfully; health returned `status=healthy`.
- Protected runtime smoke called `GET /api/products/ebbdd4fa-5c73-481a-9d07-dbab3d20a150/bundle-candidates?limit=3&freeShippingThreshold=1000&currency=CZK` with internal service auth.
- Smoke returned `200`, `success=true`, `count=1`, `relationType=order_affinity`, `source=marketing_order_affinity`.
- Candidate product IDs matched the controlled Marketing canary relation: `ebbdd4fa-5c73-481a-9d07-dbab3d20a150` and `2d6e4b4c-02a4-4b1c-98c8-afa4ad46a32e`.
- The canary products currently have no active current price rows, so candidate pricing returned blocker `[MISSING: current product price]`, `subtotal=null`, and no invented suggested bundle price.

Remaining blockers:

- `[MISSING: approved bundle checkout contract owned by FlipFlop/Orders/Payments]`.
- `[MISSING: explicit discount/price presentation policy for bundle candidates]`.
- `[MISSING: sufficient order_affinity backfill volume]`.
- `[MISSING: current product price rows for canary/order-affinity products before presenting sellable bundle prices]`.


## 2026-07-03 - Bundle Candidate Canary Pricing Evidence

Current focus: Make the controlled order-affinity canary price-complete for downstream buy-together smoke tests.

Intent Preservation Chain:

- Vision: Real purchase-derived product relationships can become sellable bundle candidates only when Catalog can expose product truth and current pricing without inventing checkout ownership.
- Goal Impact: The canary relation now demonstrates free-shipping top-up guidance with active Catalog price rows.
- System: Catalog owns relation and price facts; Marketing owns order-affinity production; FlipFlop/Orders/Payments/Warehouse remain owners of storefront presentation, order totals, payment authorization, and stock mutation.
- Feature: Price-complete bundle-candidate smoke for the existing `marketing_order_affinity` relation.
- Task: Add active regular price rows for the two controlled canary products and re-run the protected bundle-candidates read smoke.
- Execution Plan: Use the protected Catalog pricing API from inside the Catalog pod; do not print secrets; do not mutate checkout, warehouse, payments, marketplace listings, bundle SKUs, or order data.
- Coding Prompt: Correct the first future-dated price-row attempt by using a valid current `validFrom` and record exact runtime evidence.
- Code: runtime data only; documentation evidence in this status entry.
- Validation: Protected in-pod `GET /api/products/ebbdd4fa-5c73-481a-9d07-dbab3d20a150/bundle-candidates?limit=3&freeShippingThreshold=1000&currency=CZK` returned HTTP 200.

Runtime evidence:

- Added active regular price rows with `validFrom=2026-07-02T00:00:00.000Z` after an initial future-dated `2026-07-03T00:00:00Z` attempt was not current on the server clock.
- Product `ebbdd4fa-5c73-481a-9d07-dbab3d20a150` price: `600 CZK`.
- Product `2d6e4b4c-02a4-4b1c-98c8-afa4ad46a32e` price: `350 CZK`.
- Bundle candidate smoke returned `relationType=order_affinity`, `source=marketing_order_affinity`, `subtotal=950`, `freeShippingThreshold=1000`, `topUpAmount=50`, `suggestedBundlePrice=1000`, `freeShippingEligible=true`, and `blockers=[]`.

Remaining blockers:

- `[MISSING: approved bundle checkout contract owned by FlipFlop/Orders/Payments]`.
- `[MISSING: explicit discount/price presentation policy for bundle candidates]`.
- `[MISSING: sufficient order_affinity backfill volume]`.


## 2026-07-03 - Active FlipFlop Order-Affinity Backfill Evidence

Current focus: Prove the live FlipFlop product-detail recommendations can use Catalog-owned purchase-affinity relations for active mapped products.

Intent Preservation Chain:

- Vision: Real purchase-derived relationships should power buy-together presentation for live storefront products through Catalog relation truth.
- Goal Impact: The first active FlipFlop mapped product pair now has Catalog `order_affinity` rows and price-complete bundle candidates.
- System: Catalog owns product relation and pricing facts; FlipFlop owns local sellable product mapping and buy-together presentation; Orders/Payments/Warehouse remain unchanged.
- Feature: Controlled active-product order-affinity backfill.
- Task: Upsert two directed `marketing_order_affinity` rows for active FlipFlop Catalog product IDs and validate related-products plus bundle-candidates readback.
- Execution Plan: Use protected Catalog internal batch API from the Catalog pod; do not print secrets; do not mutate checkout, warehouse, payments, marketplace listings, bundle SKUs, or order data.
- Coding Prompt: Use bounded evidence with an idempotency key and record exact product IDs, relation source, pricing summary, and blockers.
- Code: runtime data only; documentation evidence in this status entry.
- Validation: protected Catalog readback returned HTTP 200 for related-products and bundle-candidates in both directions.

Runtime mutation evidence:

- Protected `POST /api/internal/product-relations/order-affinity/batch` used idempotency key `codex-active-flipflop-affinity-20260703-001`.
- Batch result: HTTP `201`, `success=true`, `total=2`, `upserted=2`, `updated=0`, `failed=0`.
- Relation `ce4a51aa-2d12-4ab7-a965-7a36609d01fc -> dbc51dde-fc66-4511-b178-f929183f4647`: `relationType=order_affinity`, `source=marketing_order_affinity`, `score=2`, `confidence=0.7`.
- Relation `dbc51dde-fc66-4511-b178-f929183f4647 -> ce4a51aa-2d12-4ab7-a965-7a36609d01fc`: `relationType=order_affinity`, `source=marketing_order_affinity`, `score=2`, `confidence=0.7`.

Readback evidence:

- `GET /api/products/ce4a51aa-2d12-4ab7-a965-7a36609d01fc/related?relationType=order_affinity` returned one relation to `dbc51dde-fc66-4511-b178-f929183f4647`.
- `GET /api/products/dbc51dde-fc66-4511-b178-f929183f4647/related?relationType=order_affinity` returned one relation to `ce4a51aa-2d12-4ab7-a965-7a36609d01fc`.
- Bundle-candidates for both directions returned one candidate containing both Catalog product IDs.
- Pricing summary for both directions: `currency=CZK`, `subtotal=1998`, `freeShippingThreshold=1000`, `suggestedBundlePrice=1998`, `topUpAmount=0`, `freeShippingEligible=true`, `blockers=[]`.

Remaining blockers:

- `[MISSING: automated order-affinity backfill/replay over historical Orders events]`.
- `[MISSING: approved bundle checkout contract owned by FlipFlop/Orders/Payments]` for future server-authoritative bundle pricing beyond current display/intent flow.


## 2026-07-03 - Goal 24 Bundle/Order-Affinity Contract Refresh

Current focus: classify the remaining Goal 24 order-affinity replay and bundle checkout gates from read-only cross-repo evidence.

Intent Preservation Chain:

- Vision: Purchase-derived relationships should power product recommendations and future bundle flows without moving checkout, stock, payment, or marketplace ownership into Catalog.
- Goal Impact: The remaining Goal 24 gates are now narrowed from broad missing infrastructure to explicit replay-data, publish-window, pruning, and bundle-selling contract decisions.
- System: Catalog owns relation rows and read-only bundle candidates; Orders owns order/replay facts; Marketing owns affinity scoring/backfill; FlipFlop owns storefront checkout intent; Warehouse owns stock/reservations; Payments owns payment authorization/status.
- Feature: Bundle/order-affinity contract refresh.
- Task: Use read-only subagent evidence to update Catalog contract docs and validation state without mutating runtime data or service code.
- Execution Plan: Inspect Catalog, Orders, Marketing, FlipFlop, and Payments source/docs; preserve `[MISSING: ...]`/`[UNKNOWN: ...]` blockers; do not run deploy, DB mutation, publish backfill, checkout smoke, or secret-printing commands.
- Coding Prompt: Do not invent backend fields or bundle ownership. Treat existing `bundle-candidates` as read-only display metadata and fail closed on unresolved bundle-selling semantics.
- Code: documentation only in `docs/contracts/catalog-product-relations.md`, `implementation-goals/GOAL-24-product-relations.md`, `docs/IMPLEMENTATION_STATE.md`, this status entry, and `reports/validation/VAL-GOAL-24-bundle-order-affinity-contract.md`.
- Validation: read-only subagent reports plus `git diff --check` for the docs-only patch.

Evidence:

- Catalog `main` was clean at `d5a8f1f` before the isolated worktree update.
- Catalog exposes protected `GET /api/products/:productId/related`, protected `GET /api/products/:productId/bundle-candidates`, and admin/internal `POST /api/internal/product-relations/order-affinity/batch`.
- Orders source/docs expose `orders.order.created.v1` product item snapshots and `GET /orders/internal/order-affinity/replay-candidates` for paid, non-cancelled replay candidates.
- Marketing source builds directed `order_affinity` candidates, aggregates historical replay records, and publishes to Catalog only when enabled/configured.
- Source checks reported by the read-only replay worker passed: Orders `npm run verify:order-affinity-replay`, Marketing focused `order-affinity-backfill` tests, and Catalog focused product-relations Jest.
- Live read-only Marketing dry-run returned `inputRecords=0`, `acceptedCreatedEvents=0`, `aggregatePairs=0`, and `candidates=[]`.
- FlipFlop has a local bundle-intent path that submits identifiers, recomputes eligibility/savings server-side, creates a central Orders UUID before payment, and sends Payments the final server total.
- Payments accepts final `orderId`, `amount`, and `currency`; it must not infer Catalog bundle pricing.

Boundary decision:

- No Catalog source code, migration, deployment, DB mutation, relation publish, checkout, payment, Warehouse, channel publication, or secret output was performed.
- The existing FlipFlop-local bundle intent path is not an ecosystem Catalog bundle aggregate, bundle SKU, Orders bundle identity, Warehouse reservation, or Payments pricing contract.

Parallel execution:

- `ready now`: Orders replay contract maintenance. Validation: `npm run verify:order-affinity-replay`.
- `ready now`: Marketing dry-run/export/backfill hardening. Validation: focused `order-affinity-backfill` tests plus dry-run.
- `ready now`: Catalog relation API maintenance. Validation: focused product-relations Jest plus `git diff --check`.
- `dependency-gated`: non-empty historical affinity publish. Blockers: qualifying rows, owner-reviewed mutation window, and pruning/replacement semantics.
- `dependency-gated`: Catalog durable bundle aggregate/API. Blocker: Catalog ownership decision for read-only candidate versus standalone aggregate versus product-like SKU.
- `blocked`: real ecosystem bundle selling. Blockers: Orders bundle create-order contract, Warehouse reservation contract, Payments metadata policy, explicit discount/price presentation policy, and approved real-checkout smoke scope.

Remaining blockers:

- `[MISSING: qualifying historical paid multi-product Orders rows for non-empty replay evidence]`.
- `[MISSING: owner-reviewed publish window before running a future non-empty --publish backfill]`.
- `[MISSING: pruning/replacement semantics for stale affinity rows]`.
- `[MISSING: Catalog bundle ownership decision: read-only candidate, standalone bundle aggregate, or product-like SKU]`.
- `[MISSING: Orders bundle create-order contract and bundle identity representation beyond normal line items]`.
- `[MISSING: Warehouse bundle reservation contract for stock and fulfillment effects]`.
- `[MISSING: Payments metadata policy for bundle/free-shipping evidence without making Payments pricing truth]`.
- `[MISSING: approved real checkout smoke scope]`.
- `[UNKNOWN: whether current live Orders history should contain paid multi-product rows or whether upstream order capture is still empty]`.


## 2026-07-03 - Goal 25 W5 Channel Runtime Deploy Smoke Closure

Current focus: close the owner-approved runtime deployment/read-smoke gate for the latest Goal 25 channel consumer commits.

Intent Preservation Chain:

- Vision: Catalog remains product truth for sellable content and readiness while channels fail closed on Catalog quality blockers.
- Goal Impact: Channel consumer implementations are now backed by runtime deploy/read evidence, not source validation only.
- System: Catalog owns product quality/readiness; Bazos, Aukro, Allegro, Heureka, and FlipFlop own channel identity, drafts, feed/queue/publication behavior, and marketplace policy.
- Feature: Product Quality Review blocker consumer runtime acceptance.
- Task: deploy/read-smoke Allegro, Heureka, and FlipFlop latest Goal 25 consumer commits after owner approval without publish/confirm/queue actions.
- Execution Plan: use remote-only Alfares repos, respect dirty worktrees, deploy existing channel scripts, run read-only public health/feed/product smokes, and record exact evidence.
- Coding Prompt: do not deploy Catalog, do not mutate Warehouse/product data, do not print secrets, and document any rollout timeout separately from final rollout state.
- Code: channel repos already contained source commits; this Catalog update records runtime evidence only.
- Validation: Allegro, Heureka, and FlipFlop runtime smokes returned HTTP 200 and final rollout checks passed.

Runtime evidence:

- Allegro: deployed `5d189ee`; service/api-gateway/settings/imports/frontend rollouts passed; `https://allegro.alfares.cz/health` HTTP 200 `status=ok`; `https://allegro.alfares.cz/api/health` HTTP 200 `service=api-gateway`.
- Heureka: deployed `7ea1f79`; service/api-gateway rollouts passed; `https://heureka.alfares.cz/health` HTTP 200 `status=ok`; `https://heureka.alfares.cz/heureka/feed?type=heureka_cz` HTTP 200 XML feed.
- FlipFlop: deployed current `main` at `7a092c2`, including Goal 25 consumer commit `3462917`; initial deploy command timed out while pods were pulling/starting, but follow-up confirmed all six deployments successfully rolled out with ready=1 updated=1 available=1; `https://flipflop.alfares.cz/` HTTP 200 and `https://flipflop.alfares.cz/api/products?limit=1` HTTP 200 `success=true`.

Boundary decision: no Catalog backend/frontend deployment, marketplace publish, draft confirm, queue action, Warehouse stock mutation, product data mutation, destructive command, or secret output was performed. Bazos and Aukro runtime evidence remains the prior accepted deployed evidence.

Remaining blockers: none for Goal 25 channel consumer runtime smoke closure. Protected authenticated draft/publish action smokes remain intentionally out of scope unless a side-effect-safe owner-approved scenario is created.


Final sweep addendum:

- Heureka was observed clean at `cf14a73 fix: recognize zero-stock feed exclusions` with live service/api-gateway deployments on tag `cf14a73`, superseding the earlier `7ea1f79` deploy evidence from this run.
- FlipFlop was observed at `c0d20d7 chore: update generatedAt timestamp in orders readiness smoke report`; live deployments remained ready=1 updated=1 available=1. Untracked `services/frontend/lib/hooks/useVisiblePolling.ts` was unrelated and left untouched.
- Aukro retained unrelated dirty `services/aukro-service/src/ui/ui.controller.ts` polling fields and was left untouched.

## 2026-07-03 - Holiday Discount Durable BPCP Projection Store

Current focus: close the Catalog runtime hardening gap for BPCP process lifecycle replay and local projection recovery.

Intent Preservation Chain:

- Vision: Catalog remains product fact owner while BPCP remains business process control-plane owner.
- Goal Impact: Holiday Discount process state now survives Catalog pod restarts through a durable local projection store.
- System: BPCP publishes signed lifecycle events over RabbitMQ; Catalog consumes lifecycle events, deduplicates event ids, stores active projections, and exposes fail-closed eligibility facts.
- Feature: Durable BPCP event dedupe/projection store and explicit Holiday eligibility allow-list contract.
- Task: add `catalog_bpcp_process_event_dedupe`, `catalog_bpcp_process_projection`, async durable apply path, runtime status, and `catalog.holiday-discount-eligibility-allow-list.v1`.
- Execution Plan: implement additive code and SQL migration, validate locally in repo, apply idempotent migration, deploy Catalog only, replay bounded BPCP published event, and verify duplicate replay is not re-applied.
- Coding Prompt: do not invent selected Holiday categories/tags; keep discount facts fail-closed until owner-approved allow-list values are configured.
- Code: `edcef42 feat: add durable BPCP catalog projection store`.
- Validation: `npm run verify:bpcp-consumer` passed; focused BPCP projection Jest passed 4/4; full `npm test -- --runInBand` passed 13 suites / 117 tests; `npm run build` passed; `git diff --check` passed.

Runtime evidence:

- Applied additive SQL migration `scripts/migrations/20260703_bpcp_process_projection_store.sql` to `catalog_db`; created `catalog_bpcp_process_event_dedupe` and `catalog_bpcp_process_projection`.
- Deployed image `localhost:5000/catalog-microservice:edcef42`; rollout succeeded and current pod `catalog-microservice-8576945df6-fdq22` is running.
- BPCP bounded replay dispatched `holiday-discount-2026:1:process.published:3` through `bpcp.events` / `bpcp.process.published.v1`.
- Catalog `/ready` reports consumer `status=up`, `received=2`, `applied=1`, `rejected=0`, `signatureFailures=0`, durable store `mode=durable`, `ready=true`, `activeProjectionCount=1`, and `duplicateEvents=1` after duplicate replay.
- DB readback: dedupe row count `1`; projection row `holiday-discount-2026:1:active:holiday-discount-2026:1:process.published:3`.

Remaining blocker:

- `[MISSING: approved Holiday Discount selected category/tag allow-list]` remains intentional. `CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS` and `CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS` are explicitly present but empty in the Catalog config map until business values are approved.

## 2026-07-03 - Holiday Discount Canary Allow-List Config

Current focus: narrow the Catalog Holiday Discount allow-list to a single live canary product tag and prove the remaining runtime gate is the BPCP active window, not missing Catalog configuration.

Intent Preservation Chain:

- Vision: Business process changes should flow through BPCP and service-local contracts without broad accidental discount exposure.
- Goal Impact: Catalog now has an explicit canary allow-list value for Holiday Discount validation.
- System: Catalog owns product facts and allow-list evaluation; BPCP owns process window; FlipFlop owns monetary quote and order totals.
- Feature: Holiday Discount selected product allow-list.
- Task: configure `CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS` to exact tag `allegro-offer:18106037370`, deploy Catalog, and verify canary/non-canary facts.
- Execution Plan: use one exact product tag rather than broad tags like `allegro` or `published`; do not create orders or payments for quote smoke.
- Coding Prompt: keep live discount fail-closed while BPCP process window remains future-dated.
- Code: `f88ae2a chore: configure holiday discount canary allow-list`.
- Validation: `npm run verify:bpcp-consumer` passed; `npm run build` passed; `git diff --check` passed; Catalog deploy succeeded.

Runtime evidence:

- Catalog image `localhost:5000/catalog-microservice:f88ae2a` rolled out successfully.
- `/health` reports allow-list `tags=[allegro-offer:18106037370]`, `configured=true`, `missing=[]`, durable store `mode=durable`, `activeProjectionCount=1`, and projection blockers `[]`.
- Canary Catalog product `ce4a51aa-2d12-4ab7-a965-7a36609d01fc` matches `matchedTags=[allegro-offer:18106037370]`, blockers `[]`, but `eligible=false` with `reasonCodes=[BPCP_PROCESS_WINDOW_INACTIVE]` because BPCP v1 is active only from `2026-12-01T00:00:00Z`.
- Non-canary Catalog product `dbc51dde-fc66-4511-b178-f929183f4647` has no matched tags and remains ineligible with `PRODUCT_NOT_IN_HOLIDAY_ELIGIBILITY_SET`.

Remaining blocker:

- `[MISSING: non-mutating FlipFlop quote endpoint]` Existing FlipFlop order-service computes Holiday Discount only inside order creation, which has order/payment/stock side effects. Do not use live order creation as a quote smoke.
- `[MISSING: BPCP active-window decision]` Applied Holiday Discount cannot be observed until BPCP v1 window opens or an approved canary-active process/version contract is implemented end to end.
