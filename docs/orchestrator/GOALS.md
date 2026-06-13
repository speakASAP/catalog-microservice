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

Status: done

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

Status: done

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

Status: done

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

Status: done

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

Status: done

Intent: Catalog must prove it serves its function.

Chunks:

- Add smoke script for health, product search, product detail, pricing, media, and auth-protected mutation rejection.
- Add optional integration checks for warehouse/FlipFlop/Bazos contract endpoints.

Acceptance criteria:

- Smoke output names the broken contract when failing.
- Protected write check proves unauthorized mutation is rejected.
- `npm run build` and smoke checks are documented in status.

## Goal 10 - Stock Origin Visibility

Status: done

Intent: Catalog and FlipFlop projections should expose Warehouse-owned stock origin metadata without Catalog becoming stock owner.

Acceptance criteria:

- Warehouse remains stock authority.
- Catalog forwards origin metadata only.
- Existing stock totals remain Warehouse-sourced.

## Goal 11 - Logistics Route Projection

Status: done

Intent: Catalog should forward Warehouse-owned logistics route information without owning fulfillment logic.

Acceptance criteria:

- Warehouse remains logistics authority.
- Catalog exposes route projection only.
- No Catalog shipment or reservation mutation is added.

## Goal 12 - Warehouse Stock Coverage Read Model

Status: done

Intent: Catalog should report whether products have mandatory Warehouse-backed stock coverage and reservable routes.

Acceptance criteria:

- Coverage is derived from Warehouse availability/logistics.
- Catalog does not persist stock truth.
- Missing coverage is visible to operators.

## Goal 13 - Warehouse Stock Coverage Audit

Status: done

Intent: Operators can page active Catalog goods and identify missing Warehouse-backed coverage.

Acceptance criteria:

- Audit defaults to active products.
- Empty pages avoid Warehouse calls.

## Goal 14 - Authorized Runtime Contract Smoke

Status: done

Intent: Catalog should prove protected Warehouse and FlipFlop runtime contracts with approved runtime credentials while keeping Bazos draft smoke separately gated.

## Goal 15 - Bazos Authorized Draft Runtime Smoke

Status: done

Intent: Catalog should prove the protected Bazos draft-preparation contract with approved runtime credentials and explicit Bazos smoke inputs, without queueing or publishing.

## Goal 16 - Production Contract Monitoring And Drift Audit

Status: done

Intent: Catalog should continuously prove production cross-service contracts and surface drift without moving ownership from Warehouse, FlipFlop, Auth, or Bazos into Catalog.

Acceptance criteria:

- Scheduled monitor runs anonymous plus authorized Warehouse/FlipFlop checks from runtime secrets.
- Monitor output is sanitized and names failed contract profiles.
- Bazos authorized draft monitoring remains opt-in and disabled by default.
- CronJob manifest is deployed and a live run is verified.
- Coverage diagnostics remain Warehouse-backed.

## Goal 14 - Authorized Runtime Contract Smoke

Status: source complete; token-backed runtime checks deferred pending approved credentials

Intent: Catalog should prove protected integration contracts work with approved runtime credentials while default smoke remains anonymous and non-destructive.

Acceptance criteria:

- Default smoke remains safe without credentials.
- Authorized Warehouse and FlipFlop checks run only when explicitly enabled with an approved token.
- Bazos authorized draft smoke requires separate explicit opt-in and Bazos-owned inputs.
- No secrets or raw production payloads are printed.
