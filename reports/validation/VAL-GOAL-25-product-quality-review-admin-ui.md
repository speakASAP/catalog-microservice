# VAL-GOAL-25 Product Quality Review Admin UI

```yaml
id: VAL-GOAL-25-PRODUCT-QUALITY-REVIEW-ADMIN-UI
status: source-validated-w3
created: 2026-07-02
last_updated: 2026-07-02
repository: /home/ssf/Documents/Github/catalog-microservice
branch: main
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
policy_contract: docs/contracts/catalog-product-quality-review.md
execution_plan: implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md
policy_id: catalog.product_quality.v1
```

## Intent Compliance Report

Vision: Catalog remains the Statex product truth service for product identity, sellable content, media references, pricing records, and publication readiness.

Goal Impact: Catalog admins now have a dense dashboard queue for finding mandatory activation blockers, separating optional opportunities, exporting reports, applying guarded bulk updates, and running the existing activation gate.

System: Catalog owns quality/readiness policy and product truth. Warehouse stock ownership remains external. Auth/admin access remains under the existing dashboard shell and `AdminGuard`. Channel services keep publication and compliance ownership.

Feature: Product Quality Review Admin frontend W3.

Task: implement the protected Catalog admin Product Quality Review UI against the stable Goal 25 backend API without changing backend contracts.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`.

Coding Prompt: W3 frontend-only worker for `services/frontend/app/dashboard/**`, `services/frontend/components/**`, `services/frontend/lib/api/products.ts`, and Goal 25 validation reporting.

Code: `services/frontend/lib/api/products.ts`, `services/frontend/components/AdminLayout.tsx`, `services/frontend/app/dashboard/admin/page.tsx`, `services/frontend/app/dashboard/admin/product-review/page.tsx`.

Validation: `git diff --check` and `cd services/frontend && npm run build` passed.

State Update: W5/orchestrator still owns final implementation state and deploy readiness.

## Implemented

- Added typed frontend API helpers for:
  - `GET /api/products/review/quality`
  - `GET /api/products/review/quality/export`
  - `POST /api/products/review/bulk-update`
  - `POST /api/products/review/activate`
- Added `/dashboard/admin/product-review` behind the existing `AdminGuard` and dashboard shell.
- Added sidebar filters for search, lifecycle, source, severity, missing field, and page size.
- Added report exports for JSON, CSV, and Markdown using the backend export endpoint.
- Added guarded bulk controls for product fields, pricing patch, category patch, expected missing field guard, and human review marker.
- Added activation gate action that calls the backend Goal 25 activation endpoint only.
- Kept mandatory blockers separate from optional opportunities in table columns and counters.
- Kept optional brand/manufacturer/EAN/tags/category gaps out of the global mandatory blocker column.
- Did not add Catalog stock fields or Warehouse-owned quantity mutation.
- Added dashboard navigation and admin-page entry point for the review queue.

## Validation Evidence

```bash
git diff --check
# PASS, no output

cd services/frontend && npm run build
# PASS
# Route list included /dashboard/admin/product-review
# Warning only: Next.js inferred workspace root because repository and frontend package lockfiles both exist.
```

## Boundary Check

- `CAT-INV-001`: preserved; UI consumes `catalog.product_quality.v1` and does not introduce a new policy.
- `CAT-INV-002`: preserved; no Warehouse stock ownership or stock fields were added.
- `CAT-INV-003`: preserved; route uses existing dashboard shell/Auth/AdminGuard patterns.
- `CAT-INV-005`: preserved; activation does not publish to marketplaces or call channel publish actions.
- `CAT-INV-006`: preserved; no delete path or product hard delete action was added.
- `CAT-INV-007`: preserved; pricing changes go through the existing Goal 25 bulk-update API payload.
- `CAT-INV-008`: preserved; media remains URL/object reference evidence only.
- `CAT-INV-009`: preserved; frontend API additions are additive and do not change existing product reads.
- `CAT-INV-010`: preserved; mutations use the protected backend review endpoints with human review markers.

## Remaining Blockers

- `[MISSING: generated description state contract]`
- `[MISSING: production-safe unmasked owner-report approval process]`
- `[MISSING: live Catalog API base/token for all-product production audit]`
- `[MISSING: W4 import/channel consumer validation]`
- `[MISSING: W5 final integration/deploy decision]`

## Deploy Status

Not deployed. Deployment was not approved in this worker thread.

## Handoff

W3 is source-validated on the remote `catalog-microservice` main worktree. UI source is present in commit `009969c feat: add product quality review admin UI`; this report records the validation evidence for orchestrator/W5 final integration and deploy readiness.
