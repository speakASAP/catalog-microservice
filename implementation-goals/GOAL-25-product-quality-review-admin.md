# Goal 25 - Product Quality Review Admin

Status: planned

## Intent

Catalog operators and product owners need a dedicated review workflow that keeps imported and existing products in `draft` or `needs_review` until the minimum sellable catalog data is present, while making missing mandatory data visible and fast to fix in bulk.

## Goal Impact

- Products without mandatory public catalog data must not become active/publishable by accident.
- Imported products are preserved as draft records instead of being rejected or deleted.
- Owners receive an actionable report listing exactly which blocking mandatory fields are missing per product.
- Operators can select many products with the same gap and update shared fields in one reviewed bulk action.

## System Boundaries

- Catalog remains product identity, content, category, media reference, price, lifecycle, and readiness authority.
- Warehouse remains stock quantity authority. Quantity is optional for Catalog; when source imports omit quantity, the importer/stock integration must treat quantity as `0` without moving stock truth into Catalog.
- Auth remains login, JWT, and RBAC authority.
- Channel services consume Catalog readiness and must not redefine product truth.
- Generated descriptions are content-generation output. Products waiting for generated descriptions should not fail the owner missing-data report for `description` when a generation request/state exists.

## Mandatory Catalog Fields

Blocking fields for activation/publishability:

- `sku`: present and unique within the owner/source scope.
- `title`: present and non-empty.
- `description` or `descriptionRich`: present, or explicitly covered by an in-progress/generated description state.
- current positive selling price: active `product_pricing` row with positive `salePrice` or `basePrice`.
- at least one non-placeholder product image in `media` with `type=image`.
- lifecycle: `active` only after blocking fields pass; otherwise `draft` for imports/new incomplete records or `needs_review` for existing records flagged by audit.

Non-blocking completeness fields:

- `brand`, `manufacturer`, `ean`, `weightKg`, `dimensionsCm`, categories, tags, SEO, material/color and other attributes are recommended but not activation blockers unless later required by a channel-specific policy.
- Non-blocking fields should be available in the admin review filters and bulk editor, but the owner mandatory-gap report must not treat them as required defects.

## Scope

- Add a versioned product quality policy contract and shared evaluator.
- Extend existing readiness diagnostics from Goal 02 instead of creating a parallel readiness model.
- Add a validation script that audits all products and writes an owner-facing report.
- Add backend endpoints for paged review results, report export, and guarded bulk product updates.
- Add a separate admin menu item and page for product review.
- Add bulk update controls for common fields and attributes, with a human-review marker for large updates and existing pricing guard reuse.
- Add import/create/update lifecycle gates so incomplete imported products remain `draft`.
- Add tests and validation evidence.

## Non-Goals

- Do not delete products.
- Do not store inline media blobs in Catalog.
- Do not move Warehouse stock ownership into Catalog.
- Do not publish to marketplaces directly from the review workflow.
- Do not mass-change more than 10 prices without the existing explicit human-review marker.
- Do not require optional fields in the owner mandatory-gap report.

## Acceptance Criteria

- `npm run validate:product-quality` or equivalent audits all products and emits a machine-readable JSON report plus owner-readable Markdown/CSV summary.
- Report rows include product id, SKU, title, owner/source scope, lifecycle, blocking missing fields, and recommended next action.
- Products missing any blocking field are not `publishable` and cannot be promoted to `active` without passing the policy.
- Imported incomplete products are stored as `draft`; missing quantity defaults to `0` through Warehouse/import integration, not Catalog stock ownership.
- Admin users can open a dedicated product review menu, filter by missing field/lifecycle/owner/source, select products, and apply safe bulk updates.
- Bulk editor supports at least manufacturer, brand, category assignment, attributes such as color/material, lifecycle promotion when valid, tags/SEO, and pricing through the guarded pricing path.
- Existing product reads remain backward compatible.
- Validation distinguishes mandatory blockers from optional completeness opportunities.

## Validation

Minimum source validation:

```bash
git diff --check
npm test -- --runInBand src/products/products.service.spec.ts
npm run build
cd services/frontend && npm run build
npm run validate:product-quality -- --format json --out reports/validation/product-quality-audit.json
```

Runtime validation after owner-approved deploy:

```bash
curl -sk https://catalog.alfares.cz/health
CATALOG_SMOKE_AUTHORIZED=true npm run smoke:e2e:authorized
```

Add focused tests for:

- mandatory policy classification;
- generated-description exemption;
- draft-on-incomplete import/create/update behavior;
- bulk update authorization and field allowlist;
- report output shape;
- frontend review page API mapping where existing test infrastructure allows it.

## Boundary Checks

- Preserve `CAT-INV-001`: Catalog owns product truth and readiness.
- Preserve `CAT-INV-002`: Warehouse owns stock quantities.
- Preserve `CAT-INV-005`: marketplace services own publication/compliance.
- Preserve `CAT-INV-008`: media remains external URL/object reference.
- Preserve `CAT-INV-009`: existing response envelopes remain additive/backward compatible.

## Parallel Execution Summary

This goal is safe to split only after the quality policy contract is written. Backend policy and frontend review UI must not edit the same generated API types at the same time without the integration owner.

Integration owner: Catalog orchestrator in the original thread.
Validation owner: Product quality validation worker.
Merge order: W0 policy contract -> W1 backend evaluator/API -> W2 validation script/report -> W3 frontend admin review -> W4 import/channel consumers -> W5 final integration/deploy readiness.
