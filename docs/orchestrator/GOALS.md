# Catalog Goal Backlog

Status values: `pending`, `active`, `done`, `blocked`.

## Goal 1 - Catalog Contract And Auth Boundary

Status: done

Intent: Catalog must be safe as the central product truth service.

Chunks:

- [x] 1.1 Add catalog-local intent preservation docs and master prompt.
- [x] 1.2 Protect mutation endpoints with JWT/RBAC or internal service identity.
- [x] 1.3 Gate hard delete behind explicit owner approval and superadmin role.
- [x] 1.4 Add audit-grade actor/source logging for writes.
- [x] 1.5 Add tests or direct API verification for unauthorized and authorized writes.

Acceptance criteria:

- Public reads remain available where intended.
- Product, category, attribute, media, and pricing mutations require authorization.
- Hard delete is disabled or gated behind explicit owner approval.
- Write logs include actor/source enough for audit follow-up.
- `npm run build` passes.

## Goal 2 - Catalog Product Model Completeness

Status: done

Intent: Catalog records must describe goods well enough for online sale and future channels.

Chunks:

- Add explicit product lifecycle fields: draft, active, archived, needs_review.
- Add product quality/readiness diagnostics.
- Add placeholder media marker and missing-media detection.
- Add missing EAN and duplicate SKU/EAN audits.

Acceptance criteria:

- Existing product reads remain backward compatible.
- A product can report why it is not sellable/publishable.
- Placeholder media and missing EAN are visible as quality issues.

## Goal 3 - Pricing Integrity

Status: done

Intent: Catalog pricing must be reliable and safe to consume.

Chunks:

- Normalize current price selection.
- Add pricing validation: currency, positive amount, sale price rules, validity windows.
- Add mass price change guard.
- Add price audit trail fields or events.

Acceptance criteria:

- Current price endpoint returns deterministic regular/sale priority.
- Invalid pricing is rejected.
- Mass updates over 10 products require explicit human-review marker.

## Goal 4 - Channel Readiness Model

Status: done

Intent: Catalog should say whether a product is ready for FlipFlop, Bazos drafts, and future channels without taking over those services.

Chunks:

- Add channel eligibility/readiness entity or JSON model.
- Add readiness endpoint per product.
- Add FlipFlop readiness rules.
- Add Bazos draft-readiness rules that defer publishing policy to Bazos.

Acceptance criteria:

- Readiness response includes missing fields and next action.
- Bazos readiness never claims publish permission.
- Model is extensible to more channels.

## Goal 5 - Catalog/Warehouse Contract

Status: pending

Intent: Catalog product identity and warehouse stock must align without moving stock ownership into catalog.

Chunks:

- Document productId contract with warehouse.
- Add catalog-side stock projection client or endpoint if needed.
- Add batch availability contract to avoid N+1 consumer calls.
- Add smoke check for seeded products.

Acceptance criteria:

- Catalog can prove a product ID is valid before stock writes use it.
- Consumers have a batch path for availability.
- Stock remains owned by warehouse.

## Goal 6 - FlipFlop Catalog Projection

Status: pending

Intent: FlipFlop should consume catalog product truth and show real sellable products.

Chunks:

- Define the catalog response fields FlipFlop requires.
- Verify price mapping from catalog.
- Verify availability mapping through warehouse contract.
- Add production smoke check expectation.

Acceptance criteria:

- Catalog provides the required product data.
- Projection contract is documented in catalog.
- FlipFlop-specific work remains in FlipFlop.

## Goal 7 - Bazos Draft Integration Contract

Status: pending

Intent: Catalog may initiate Bazos draft creation but must not bypass Bazos compliance.

Chunks:

- Define catalog -> Bazos draft request contract.
- Add product action/readiness status for "create Bazos draft".
- Require Bazos to return policy status and human action reasons.

Acceptance criteria:

- Catalog cannot publish directly.
- Bazos remains policy and publishing authority.
- Failure reasons are visible in catalog readiness/action responses.

## Goal 8 - Data Import And Reconciliation

Status: pending

Intent: Catalog must move beyond seeded demo records and stay reconciled.

Chunks:

- Add idempotent import plan for SKU/EAN/category/pricing/media.
- Add duplicate and missing-data reports.
- Add reconciliation status output.

Acceptance criteria:

- Imports can be dry-run.
- Reports name SKU/product IDs and exact missing fields.
- No destructive import action runs without explicit owner approval.

## Goal 9 - End-To-End Catalog Smoke Tests

Status: pending

Intent: Catalog must prove it serves its function.

Chunks:

- Add smoke script for health, product search, product detail, pricing, media, and auth-protected mutation rejection.
- Add optional integration checks for warehouse/FlipFlop/Bazos contract endpoints.

Acceptance criteria:

- Smoke output names the broken contract when failing.
- Protected write check proves unauthorized mutation is rejected.
- `npm run build` and smoke checks are documented in status.
