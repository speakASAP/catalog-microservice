# VAL-GOAL-25 Import Draft Gate And Channel Consumers

```yaml
id: VAL-GOAL-25-IMPORT-CHANNEL-CONSUMERS
status: source-validated-no-deploy
created: 2026-07-02
last_updated: 2026-07-02
repository: /home/ssf/Documents/Github/catalog-microservice
branch: main
base_commit_before_w4_patch: b4ae3bc docs: add goal 25 w4 consumer handoff
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
policy_contract: docs/contracts/catalog-product-quality-review.md
execution_plan: implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md
```

## Intent Preservation Chain

Vision: Catalog remains the Statex product truth service for product identity, sellable content, pricing, media, and publication readiness.

Goal Impact: imported or newly created incomplete products remain draft/non-publishable, missing source quantity resolves to Warehouse quantity zero without Catalog owning stock, and channel services fail closed while Catalog mandatory blockers remain.

System: Catalog owns product truth/readiness. Warehouse owns stock quantities. Allegro, Bazos, Aukro, FlipFlop, and Heureka consume Catalog readiness/blockers while retaining marketplace/feed/publication ownership.

Feature: Goal 25 W4 import draft gate and channel consumer validation.

Task: validate and implement bounded source changes for import/create/update gates and cross-service consumers.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`, W4.

Coding Prompt: delegated W4 worker prompt from source thread `019f2358-4782-7742-94dc-c6389462c56d`.

Code: Catalog source edits listed below; channel repos were inspected/validated but not edited by this worker.

Validation: exact commands and results below.

State Update: this report records W4 source validation; runtime deploy/smoke remains owner-gated.

## Phase 1 Read-Only Repo State

Initial read-only sweep started with Catalog and Warehouse clean; Allegro/Bazos/Aukro/Heureka had active dirty Goal 25 consumer work; FlipFlop was clean with a Goal 25 consumer commit. During this run, external workers committed most channel lanes. Final observed states before Catalog commit:

| Repo | Final observed state | Latest observed commit | W4 action |
|---|---|---|---|
| catalog-microservice | dirty only with this worker's bounded W4 patch/report | `b4ae3bc docs: add goal 25 w4 consumer handoff` before patch | edited and validated |
| warehouse-microservice | clean | `4d0fa85 chore: harden warehouse migration build output` | read-only validation only |
| allegro | clean | `2e365ac feat: consume catalog quality blockers` | read-only validation only |
| bazos | dirty after external changes to `.env.example`, `k8s/external-secret.yaml`, and Goal 25 execution plan | `bc1f7c6 feat: consume catalog quality blockers` | read-only validation only; no edits because dirty |
| aukro | clean | `b462ffd feat: consume catalog quality blockers` | read-only validation only |
| flipflop | clean | `b1817e7 feat: consume catalog quality blockers` | read-only validation only |
| heureka | clean | `761c9a3 feat: consume catalog quality blockers` | read-only validation only |

`[MISSING: docs-rag JWT_TOKEN]`; repository files were used directly.

## Implemented In Catalog

- New `ProductsService.create()` calls now force new products to `lifecycle=draft` and `isActive=false`, even if the incoming create/import payload requests `active` or `isActive=true`.
- Existing update/activation quality blocker guard remains in place; direct activation with mandatory blockers is still rejected by the Goal 25 policy path.
- Import reconciliation dry-run now returns additive W4 evidence per row:
  - `qualityBlockingIssues` for mandatory Catalog blockers such as `missing_description`, `missing_current_price`, and `missing_image`;
  - `targetLifecycle=draft`, `targetIsActive=false`, and `publishable=false` for create candidates;
  - `warehouseStock.source=warehouse`, `resolvedQuantity=0`, `defaulted=true`, and `ownsStockInCatalog=false` when source quantity is omitted.
- Missing pricing is no longer an import operational blocker by itself; it is a quality blocker that keeps the candidate draft/non-publishable.
- No Catalog product stock field, migration, deployment script, Kubernetes manifest, Auth/RBAC, Goal 24/product-relations, marketplace publish/confirm/queue side effect, or production data mutation was added.

## Warehouse Evidence

No Warehouse source change was made. Inspection confirmed the Warehouse mutation boundary stays Warehouse-owned:

- `SetStockDto.quantity` is a required integer with `@Min(0)`.
- `StockService.setStock(...)` accepts `0` as a valid non-negative quantity and initializes new stock rows with `quantity=0`, `reserved=0`, `available=0`.
- Supplier reconciliation still requires explicit `quantity`; no Warehouse endpoint default was broadened in this worker.
- Missing-source quantity defaulting is now represented in Catalog import dry-run evidence as a Warehouse preview (`resolvedQuantity=0`, `ownsStockInCatalog=false`) and remains importer-side, not Catalog stock truth.

## Channel Consumer Evidence

Allegro, Bazos, Aukro, FlipFlop, and Heureka currently contain source-level consumer implementations that read Catalog quality/readiness evidence and fail closed on mandatory blockers or unavailable quality evidence. This worker did not edit those repos.

- Allegro consumes `catalog.product_quality.v1` through shared Catalog client helpers, blocks draft preparation/edit/confirmation/queued execution, and surfaces blockers in Products UI.
- Bazos consumes Catalog readiness before catalog sell-action draft preparation and before queue confirmation; Bazos remains queue/compliance owner.
- Aukro consumes Catalog readiness for product selection, draft creation, and publish-adjacent policy evidence; EAN remains optional.
- FlipFlop consumes Catalog blocker state in seller/admin selection and product-service readiness without moving storefront/checkout ownership.
- Heureka consumes Catalog quality review/readiness in feed readiness, feed generation, dashboard, and public blocked-lane reporting.

## Validation Commands

Catalog:

```bash
npm test -- --runInBand src/products/products.service.spec.ts src/import-reconciliation/import-reconciliation.service.spec.ts
# PASS: 2 suites, 48 tests

npm run build
# PASS: nest build

git diff --check
# PASS: no output

npm run validate:product-quality -- --format json
# PASS: synthetic read-only mode; products=3, blocked=2, readyForActivation=1; mutatesCatalog=false, mutatesWarehouse=false, mutatesMarketplace=false
```

Channel-focused validation run by this worker:

```bash
cd /home/ssf/Documents/Github/allegro && LOGGING_SERVICE_URL=http://logging-microservice:3367 npx ts-node services/allegro-service/src/allegro/catalog-sell-action/catalog-sell-action.spec.ts
# PASS: catalog-sell-action.spec: PASS

cd /home/ssf/Documents/Github/bazos && npm --prefix shared test -- bazos-catalog-sell-action.service.spec.ts
# PASS: 1 suite, 13 tests

cd /home/ssf/Documents/Github/aukro/services/aukro-service && npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' src/aukro/offers/offers.service.spec.ts
# PASS: exit 0, no stdout

cd /home/ssf/Documents/Github/heureka && services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts
# PASS: feed-readiness self-test

cd /home/ssf/Documents/Github/flipflop && node scripts/verify-catalog-product-quality-blockers.js
# PASS: Catalog product quality blocker policy verification
```

## Boundary Check

- `CAT-INV-001`: preserved; Catalog remains product truth and readiness authority.
- `CAT-INV-002`: preserved; Warehouse owns quantities and Catalog only reports importer-side Warehouse preview evidence.
- `CAT-INV-003`: preserved; Auth/RBAC code was not changed.
- `CAT-INV-005`: preserved; Catalog exposes blockers/readiness only; channel repos own marketplace publishing/compliance/feed behavior.
- `CAT-INV-006`: preserved; no delete path changed.
- `CAT-INV-007`: preserved; pricing mutation guard was not changed.
- `CAT-INV-008`: preserved; media remains external URL/object reference evidence.
- `CAT-INV-009`: preserved; import dry-run response is additive.
- `CAT-INV-010`: preserved; no new unauthenticated mutation route was added.

## Blockers And Unknowns

- `[MISSING: runtime deploy approval]`; no deploy was run.
- `[MISSING: live Catalog API base/token for production all-product quality audit]`; `validate:product-quality` used synthetic read-only mode.
- `[MISSING: generated-description state contract]`; existing W1-W3 blocker remains.
- `[MISSING: docs-rag JWT_TOKEN]`; repository files were used directly.
- `[UNKNOWN: live deployed Catalog product-quality route status]`; no runtime authenticated smoke was run.
- `[UNKNOWN: Bazos external dirty changes]`; final Bazos worktree had external modifications to `.env.example`, `k8s/external-secret.yaml`, and its Goal 25 execution plan. This worker did not edit or revert them.

## Files Changed By This Worker

- `src/products/products.service.ts`
- `src/products/products.service.spec.ts`
- `src/import-reconciliation/import-reconciliation.service.ts`
- `src/import-reconciliation/import-reconciliation.service.spec.ts`
- `src/import-reconciliation/import-reconciliation.types.ts`
- `reports/validation/VAL-GOAL-25-import-channel-consumers.md`

## Deployment Status

Not deployed. No production data, Kubernetes object, migration, marketplace publish/confirm/queue action, Warehouse stock mutation, Auth change, or hard delete was performed.

## Next Action

Commit/push the bounded Catalog W4 source/report changes, then W5 can run final integration/deploy-readiness after owner approval and after the Bazos dirty-worktree caveat is resolved.
