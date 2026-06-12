# VAL-GOAL-02: Product Model Completeness

Status: passed-runtime-validated
Validated artifact: implementation-goals/GOAL-02-product-model-completeness.md
Branch: feature/catalog-goal-02-product-model-completeness
Date: 2026-06-12

## Validation Scope

Validated source-level lifecycle/readiness implementation, focused Jest coverage, build output, whitespace, migration application, production deployment, and runtime API behavior with synthetic data.

## Evidence

- Added product lifecycle field and DTO/query support for draft, active, archived, and needs_review.
- Added read-only endpoints: GET /api/products/audits/quality and GET /api/products/:id/readiness.
- Added diagnostics for missing EAN, duplicate SKU/EAN, missing description/category/media/current price, placeholder media, inactive/draft/archived/review lifecycle.
- Added additive migration script scripts/migrations/20260612_goal02_product_lifecycle.sql.
- Added src/products/products.service.spec.ts and minimal jest.config.js scoped to backend TypeScript specs.

## Gate Evidence

- npm test: passed, 1 suite, 2 tests.
- npm run build: passed.
- git diff --check: passed.

## Invariant Evidence

- CAT-INV-001: product truth now includes lifecycle and readiness diagnostics.
- CAT-INV-002: no stock quantity, reservation, movement, or warehouse-location ownership was added.
- CAT-INV-005: Bazos publishing remains outside Catalog; readiness is diagnostic only.
- CAT-INV-008: media diagnostics inspect external references and do not store blobs.
- CAT-INV-009: existing GET /api/products and GET /api/products/:id envelopes remain additive/backward compatible; new diagnostics use dedicated read endpoints.

## Sensitive-Data Evidence

Passed. Tests use synthetic IDs and SKUs only. No auth tokens, runtime secrets, raw production records, or customer data were added to tests or reports.

## Passed Criteria

- Source implementation compiles.
- Focused lifecycle/readiness tests pass.
- Existing public read envelope code path remains structurally unchanged.
- Migration script is additive.

## Failed Criteria

None. Runtime API verification passed after migration and deployment.

## Deviations

A minimal Jest config was added because the repository previously had no backend test configuration and no discoverable tests.

## Recommendation

Goal 2 is complete. Proceed to Goal 3 pricing integrity planning and pre-coding gate.


## Runtime Evidence

- Production schema inspection used `psql` from the Kubernetes Postgres environment and confirmed `products."isActive"` exists before applying the migration.
- Applied `scripts/migrations/20260612_goal02_product_lifecycle.sql` with `ON_ERROR_STOP=1`.
- Verified `products.lifecycle`, `products_lifecycle_check`, and `idx_products_lifecycle` after migration.
- Deployed commit `fcb1919` with `./scripts/deploy.sh`; rollout and in-pod health check passed.
- In-pod runtime smoke returned health `200` and confirmed existing `GET /api/products` envelope still has `success`, `data` array, and `pagination`.
- Runtime smoke created three synthetic products, updated lifecycle to `needs_review`, verified `GET /api/products/:id/readiness` contains lifecycle/checks/issues, missing EAN/current price diagnostics, placeholder media diagnostics, and duplicate EAN diagnostics.
- Runtime smoke verified `GET /api/products/audits/quality` returns `missingEan`, `duplicateSkus`, and `duplicateEans` summary arrays and found the synthetic missing-EAN and duplicate-EAN cases.
- Cleanup proved hard delete is blocked without `x-owner-approval: explicit`, then deleted only the three synthetic products with the explicit approval header. A post-cleanup database check found zero `CODEX-GOAL2-%` products.
- Synthetic JWT was generated inside the deployed pod from runtime secret and was not printed.
