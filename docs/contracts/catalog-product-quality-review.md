# Catalog Product Quality Review Contract

```yaml
id: CONTRACT-CATALOG-PRODUCT-QUALITY-REVIEW-v1
status: draft
owner: catalog contract owner
created: 2026-07-02
last_updated: 2026-07-02
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
execution_plan: implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md
completeness_level: pre-coding
```

## Intent Preservation Chain

Vision: Catalog is the Statex product truth service for product identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness.

Goal Impact: Operators can keep incomplete imported or existing products non-publishable, see mandatory blockers clearly, and repair shared gaps in bulk without deleting products or moving ownership from other services.

System: Catalog owns product truth and readiness. Warehouse owns stock quantities. Auth owns login, JWT, RBAC, and service identity. Marketplace/channel services consume Catalog readiness and keep their own publication/compliance rules.

Feature: Product Quality Review Admin exposes a mandatory product-quality policy, review queue, owner report, guarded bulk updates, and activation gate.

Task: Implement Goal 25 only after this policy contract and execution plan are accepted by the pre-coding gate.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`.

Coding Prompt: Worker prompts are defined in `docs/orchestrator/2026-07-02-product-quality-review-admin-cross-repo-plan.md` and refined by the execution plan.

Code: `[MISSING: implementation not started]`.

Validation: `[MISSING: source validation not run because W0 is planning only]`.

State Update: `[MISSING: implementation state update after W1-W5 evidence]`.

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
| SKU | non-empty SKU unique within owner/source scope | `missing_sku`, `duplicate_sku` | Scope source is `[UNKNOWN: final owner/source uniqueness expression]`; implementation must inspect existing owner/source fields before coding. |
| Title | non-empty title after trimming | `missing_title` | Does not require marketplace-specific title optimization. |
| Description | `description` or `descriptionRich` present, or generated-description workflow state proves pending/generated coverage | `missing_description` | Generated-description state source is `[MISSING: generated description state source]`; until proven, implementation must fail closed or add an explicit state under the execution plan. |
| Price | active current pricing row with positive `salePrice` or `basePrice` | `missing_price`, `invalid_price` | Must reuse Goal 03 deterministic current-price and mass-pricing guard behavior. |
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

Goal 25 may add authenticated routes under the existing Catalog API surface. Exact controller paths must follow existing route conventions after W1 inspection.

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

## Validation Script Contract

Package alias: `validate:product-quality`.

Expected implementation artifact: `[UNKNOWN: final script language/path; proposed scripts/validate-product-quality.js]`.

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
- `[MISSING: generated description state source]`
- `[UNKNOWN: final owner/source uniqueness expression for SKU]`
- `[UNKNOWN: final admin route path, /dashboard/admin/product-review or /dashboard/product-review]`
- `[UNKNOWN: production-safe unmasked owner report approval process]`
