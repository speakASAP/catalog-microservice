# Catalog Orchestrator Status

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
