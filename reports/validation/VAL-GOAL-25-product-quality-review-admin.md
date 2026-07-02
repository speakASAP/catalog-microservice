# VAL-GOAL-25: Product Quality Review Admin Backend Policy/API

```yaml
id: VAL-GOAL-25-PRODUCT-QUALITY-REVIEW-ADMIN
status: passed-source-slice
created: 2026-07-02
repository: /home/ssf/Documents/Github/catalog-microservice
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
execution_plan: implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md
policy_contract: docs/contracts/catalog-product-quality-review.md
```

## Intent Preservation Chain

Vision: Catalog remains the Statex product truth service for identity, sellable content, media, pricing, and publication readiness.

Goal Impact: Incomplete products now have a stable backend blocker contract and cannot be activated through the review endpoint until mandatory sellable data passes.

System: Catalog owns quality/readiness. Warehouse remains stock owner. Auth remains identity/RBAC owner. Channel services remain publication/compliance owners.

Feature: Product Quality Review backend policy/API.

Task: Implement W1 backend evaluator/API first so channel consumer workers can later consume `catalog.product_quality.v1`.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`.

Coding Prompt: Delegated Goal 25 backend worker prompt from orchestrator thread `019f2354-8881-7533-87e6-77347d42eb2e`.

Code: `src/products/products.service.ts`, `src/products/products.controller.ts`, `src/products/dto/index.ts`, `src/products/products.service.spec.ts`.

Validation: this report.

State Update: `[MISSING: orchestrator-owned docs/IMPLEMENTATION_STATE.md and docs/orchestrator/STATUS.md update after concurrent dirty state is integrated]`.

## Implemented Contract

Policy id: `catalog.product_quality.v1`.

Authenticated endpoints:

- `GET /api/products/review/quality`
- `GET /api/products/review/quality/export`
- `POST /api/products/review/activate`

Stable review item fields:

- `productId`, `sku`, `title`
- `ownerScope` masked by default
- `sourceScope`: `own`, `alfares`, or `community`
- `lifecycle`, `isActive`, `publishable`, `canActivate`
- `completionScore`
- `blockingIssues[]`
- `blockingMissingFields[]`
- `optionalOpportunities[]`
- `nextAction`
- `readiness`

Mandatory blocker codes implemented:

- `missing_sku`
- `duplicate_sku`
- `missing_title`
- `missing_description`
- `missing_current_price`
- `missing_image`
- `placeholder_image_only`
- `archived_product`

SKU uniqueness scope: `sku + ownerUserId`, with `ownerUserId IS NULL` as the Alfares shared source scope.

Generated-description state: `[MISSING: generated-description state contract]`; backend fails closed on missing descriptions.

Activation behavior:

- Promotes products to `lifecycle=active` and `isActive=true` only when mandatory blockers pass.
- Allows `draft`/inactive products to be activation candidates when mandatory data passes.
- Blocks archived products.
- Requires `humanReview: explicit` for activation requests over 10 product IDs.
- Does not publish to channels or call marketplace actions.

## Boundary Evidence

- `CAT-INV-001`: Catalog now owns the global product-quality blocker contract.
- `CAT-INV-002`: no stock or quantity fields were added to Catalog products.
- `CAT-INV-003`: new endpoints use existing `CatalogAuthGuard` and `RequireCatalogRoles('catalog:authenticated')`.
- `CAT-INV-005`: activation is Catalog lifecycle only; no Bazos/Allegro/Aukro/FlipFlop/Heureka publish action is called.
- `CAT-INV-006`: no hard delete path changed.
- `CAT-INV-007`: pricing mutations were not added; existing pricing guard remains untouched.
- `CAT-INV-008`: image checks use media URL/reference rows only.
- `CAT-INV-009`: existing product reads remain additive/backward compatible.
- `CAT-INV-010`: activation endpoint records existing audit metadata for product group activation.

## Validation Commands

```bash
npm test -- --runInBand src/products/products.service.spec.ts
# result: passed
# suites: 1 passed, 1 total
# tests: 37 passed, 37 total

npm run build
# result: passed

git diff --check
# result: passed
```

## Deferred Scope

- `[MISSING: bulk update endpoint implementation]`
- `[MISSING: validate:product-quality script/reporting implementation]`
- `[MISSING: admin frontend product review page]`
- `[MISSING: importer draft gate and channel consumer implementation]`
- `[MISSING: generated-description state contract]`
- `[MISSING: owner approval to deploy Catalog]`
- `[MISSING: approved Auth token for protected runtime smoke]`

## Dirty Worktree Caveat

Concurrent unrelated dirty files were present during this worker's final validation and were not touched by the Goal 25 source patch:

- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `reports/validation/VAL-GOAL-24-product-relations.md`
- `docs/orchestrator/2026-07-02-local-resale-toggle-and-flipflop-seller-plan.md`
- `reports/validation/VAL-2026-07-02-local-resale-toggle-catalog-contract.md`

Earlier in the session, `k8s/configmap.yaml` was dirty with event-publisher config changes; by final validation that file was no longer dirty in `git status`. This worker did not edit deployment or Kubernetes files.

## Deployment

Not deployed. No migration, runtime smoke, Kubernetes change, channel repo change, Warehouse mutation, product delete, or marketplace publication was run.

## Orchestrator Handoff

Catalog blocker contract is stable enough for channel consumer planning against `catalog.product_quality.v1`.

Recommended merge/next order:

1. Integrate this backend policy/API source slice with the current concurrent docs/status changes.
2. Dispatch channel consumer workers to read `GET /api/products/review/quality` or product-level readiness as appropriate.
3. Implement W2 validation script/reporting and W3 admin UI in separate workers.
4. Keep W4 importer/channel runtime changes dependency-gated until the backend source slice is accepted.
