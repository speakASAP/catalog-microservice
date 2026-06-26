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
