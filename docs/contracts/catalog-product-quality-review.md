# Catalog Product Quality Review Contract

```yaml
id: CONTRACT-CATALOG-PRODUCT-QUALITY-REVIEW-v1
status: source-slice-implemented
owner: catalog contract owner
created: 2026-07-02
last_updated: 2026-07-03
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
execution_plan: implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md
completeness_level: backend-validation-frontend-source-validation
```

## Intent Preservation Chain

Vision: Catalog is the Statex product truth service for product identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness.

Goal Impact: Operators can keep incomplete imported or existing products non-publishable, see mandatory blockers clearly, and repair shared gaps in bulk without deleting products or moving ownership from other services.

System: Catalog owns product truth and readiness. Warehouse owns stock quantities. Auth owns login, JWT, RBAC, and service identity. Marketplace/channel services consume Catalog readiness and keep their own publication/compliance rules.

Feature: Product Quality Review Admin exposes a mandatory product-quality policy, review queue, owner report, guarded bulk updates, and activation gate.

Task: Implement the backend Product Quality Review policy/API first so channel consumers can later rely on a stable Catalog blocker contract.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`.

Coding Prompt: Worker prompts are defined in `docs/orchestrator/2026-07-02-product-quality-review-admin-cross-repo-plan.md` and refined by the execution plan.

Code: `src/products/products.service.ts`, `src/products/products.controller.ts`, `src/products/dto/index.ts`, `src/products/products.service.spec.ts`.

Validation: `reports/validation/VAL-GOAL-25-product-quality-review-admin.md`.

State Update: W1-W3 source validation is recorded in Goal 25 validation reports, `docs/IMPLEMENTATION_STATE.md`, and `docs/orchestrator/STATUS.md`; W4/W5 remain open.

## Policy Version

Policy id: `catalog.product_quality.v1`.

Policy scope: global Catalog activation and publishability precondition. Channel-specific extra requirements must remain channel readiness rules and must not be promoted into global mandatory blockers without a new owner-approved policy version.

Evaluation result names:

- `blockingIssues`: fields that prevent `active` lifecycle and global publishability.
- `optionalOpportunities`: completeness gaps that help operators improve products but do not block activation.
- `canActivate`: true only when all blocking checks pass.
- `nextAction`: operator-facing remediation summary.

## Blocking Mandatory Fields

A product cannot be globally active or publishable while any of these checks fail:

| Field | Pass condition | Failure code | Notes |
|---|---|---|---|
| SKU | non-empty SKU unique within owner/source scope | `missing_sku`, `duplicate_sku` | Current backend expression is `sku + ownerUserId`, with `ownerUserId IS NULL` as the Alfares shared source scope. |
| Title | non-empty title after trimming | `missing_title` | Does not require marketplace-specific title optimization. |
| Description | `description` present, or `descriptionRich` contains normalized canonical content under `catalog.generated_description_state.v1` | `missing_description` | `descriptionRich` is the generated/reviewed canonical description state source. Pending generation without stored canonical content is not enough to satisfy the blocker until a separate pending-state source is added. |
| Price | active current pricing row with positive `salePrice` or `basePrice` | `missing_current_price` | Backend evaluator reuses the existing current-price resolver path. |
| Image | at least one media image with non-placeholder URL/object reference | `missing_image`, `placeholder_image_only` | Media must remain URL/object reference, never inline blob. |
| Lifecycle | `active` only after all blocking checks pass; otherwise `draft` for incomplete imports/new records or `needs_review` for reviewed existing records | `invalid_lifecycle_for_quality` | Existing products should not be silently archived or deleted. |

## Non-Blocking Completeness Fields

These fields may appear in filters, completion score, recommendations, and bulk editor controls but must not be listed as mandatory owner defects in the global report:

- `brand`
- `manufacturer`
- `ean`
- dimensions and weight
- category assignment
- tags and SEO fields
- material, color, and other attributes

If a channel requires one of these fields, implement that as channel-specific readiness or a channel consumer contract, not as a global Catalog blocker.

## Lifecycle And Import Defaults

- New imported products with missing blocking fields must be persisted as `lifecycle=draft` and non-publishable.
- Existing records that newly fail the policy are report blockers and may move to `needs_review` only through an explicit reviewed script or migration plan.
- Quantity is not a Catalog product field. Missing source quantity must default to zero through importer/Warehouse integration evidence, without moving stock truth into Catalog.
- No Goal 25 path may hard-delete products.

## Additive API Contract

Goal 25 adds authenticated routes under the existing Catalog API surface. These are additive and do not change existing product read envelopes.

### Review Queue

`GET /api/products/review/quality`

Query filters:

- pagination: `page`, `limit`
- lifecycle: `draft`, `needs_review`, `active`, `archived`
- owner/source scope: `[UNKNOWN: final query names]`
- missing field: one blocking field or `any`
- severity: `blocking`, `optional`
- search: SKU/title text
- catalog scope: existing Catalog access scope if applicable

Response item minimum shape:

```json
{
  "productId": "uuid",
  "sku": "SKU",
  "title": "Product title",
  "ownerScope": "masked-or-null",
  "sourceScope": "masked-or-null",
  "lifecycle": "draft",
  "blockingIssues": ["missing_description"],
  "optionalOpportunities": ["manufacturer"],
  "completionScore": 72,
  "canActivate": false,
  "nextAction": "Add description before activation"
}
```

### Owner Report Export

`GET /api/products/review/quality/export`

Supported formats: `json`, `csv`, `markdown`.

Rules:

- Export uses the same filters as the review queue.
- Shared validation artifacts must mask owner identifiers unless an explicit owner-facing run approves unmasked values.
- Reports must separate `blockingIssues` from `optionalOpportunities`.
- Reports must not include secrets, raw customer data, private logs, or production screenshots.

### Guarded Bulk Update

`POST /api/products/review/bulk-update`

Body minimum shape:

```json
{
  "productIds": ["uuid"],
  "patch": {},
  "attributePatch": {},
  "categoryPatch": {},
  "pricingPatch": null,
  "expectedMissingField": "missing_description",
  "humanReview": "explicit-or-null"
}
```

Guardrails:

- Require authenticated admin/owner role through existing Catalog/Auth guard conventions.
- Apply only allowlisted product fields.
- Re-evaluate the policy after update and return per-product blockers.
- Delegate pricing changes to the existing guarded pricing path.
- Preserve mass price human review for more than 10 products.
- Record actor/source traceability for mutations.

### Activation Gate

`POST /api/products/review/activate`

Behavior:

- Promotes only products that pass `catalog.product_quality.v1`.
- Returns per-product blockers for failures.
- Requires human review marker when the execution plan or existing safety policy requires it.
- Must not publish to marketplaces or call channel publish actions.
- Bulk activation of more than 10 product IDs requires `humanReview: "explicit"`.

Implemented response fields:

- `policyId`: `catalog.product_quality.v1`
- `requestedProductIds`
- `blockers`: empty when the deployed policy dependencies are available; missing dependency markers are reserved for runtime contract gaps
- `totals`: requested, activated, blocked, unchanged
- `results[]`: product id, sku, title, success/activated/blocked, lifecycle before/after, blockingIssues, nextAction, quality item

## Product Quality Source Status

Implemented in W1-W3:

- `GET /api/products/review/quality`
- `GET /api/products/review/quality/export`
- `POST /api/products/review/bulk-update`
- `POST /api/products/review/activate`
- shared `catalog.product_quality.v1` blocker evaluation extending the existing Goal 02 readiness diagnostics
- generated-description state contract `catalog.generated_description_state.v1`, using `descriptionRich` canonical content as the generated/reviewed description state source
- activation gate that ignores draft/inactive status as promotion candidates but blocks archived products and mandatory data failures
- guarded category, attribute, and pricing bulk delegation through existing Catalog services
- `npm run validate:product-quality` JSON/Markdown/CSV reporting
- `/dashboard/admin/product-review` frontend admin queue, filters, report export, selection model, guarded bulk editor, and activation action

Deferred:

- `[MISSING: importer draft gate and channel consumer implementation/validation]`
- `[MISSING: runtime deploy/smoke approval]`

## Validation Script Contract

Package alias: `validate:product-quality`.

Implementation artifact: `scripts/validate-product-quality.js`.

Expected outputs:

- `reports/validation/product-quality-audit.json`
- `reports/validation/product-quality-owner-report.md`
- optional CSV for spreadsheet review

Machine row minimum shape:

```json
{
  "productId": "uuid",
  "sku": "SKU",
  "title": "Product title",
  "ownerScope": "masked-or-null",
  "sourceScope": "masked-or-null",
  "lifecycle": "draft",
  "blockingMissingFields": ["description", "price", "image"],
  "optionalOpportunities": ["manufacturer", "color"],
  "nextAction": "Fill mandatory fields before activation"
}
```

## Boundary And Invariant Mapping

- `CAT-INV-001`: strengthens Catalog product truth and readiness through a global policy evaluator.
- `CAT-INV-002`: quantity remains Warehouse-owned and is not persisted as Catalog stock truth.
- `CAT-INV-003`: all admin mutations use existing Auth/RBAC boundaries; no local login/register flow.
- `CAT-INV-005`: Catalog exposes blockers/readiness only; channel services keep publication/compliance ownership.
- `CAT-INV-006`: no hard delete is in scope.
- `CAT-INV-007`: bulk pricing delegates to existing guarded pricing behavior.
- `CAT-INV-008`: media evidence uses external URL/object references only.
- `CAT-INV-009`: existing public reads remain additive/backward compatible.
- `CAT-INV-010`: mutation endpoints require authenticated actor/source traceability.

## Open Unknowns

- `[MISSING: docs-rag JWT_TOKEN]`
- `[RESOLVED: generated-description state contract uses Product.descriptionRich under catalog.generated_description_state.v1]`
- Admin route path: `/dashboard/admin/product-review`
- `[UNKNOWN: production-safe unmasked owner report approval process]`
