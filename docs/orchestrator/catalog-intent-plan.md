# Catalog Microservice Intent Plan

Created: 2026-06-12

## Intent

Catalog must be the single source of truth for goods offered through the Statex commerce ecosystem. It must serve FlipFlop e-commerce now, Bazos.cz classifieds now/next, and additional channels later without each channel inventing its own product truth.

The preserved intent is:

- Catalog owns product identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness.
- Warehouse owns stock quantities, reservations, movements, and warehouse locations, but every stock row must reference a valid catalog product.
- FlipFlop reads sellable online products from catalog, enriches them with warehouse stock, and uses auth/login for customer and admin flows.
- Bazos reads catalog products only as inputs to compliant local drafts and publishing workflows. Bazos guardrails remain owned by bazos-service.
- Auth remains the login, JWT, RBAC, and service-identity boundary. Catalog must not expose product mutation, pricing mutation, or destructive operations without auth/RBAC.

## Current Findings

Catalog is deployed and healthy at `https://catalog.alfares.cz/health`.

Catalog currently returns six seeded products from `GET /api/products`. These records include categories, placeholder media, and pricing rows.

Catalog source contains basic NestJS CRUD modules for products, categories, attributes, media, pricing, health, logging, and auth proxy.

Catalog build succeeds with `npm run build`.

Warehouse build succeeds with `npm run build`.

FlipFlop production `GET /api/products` returns catalog products, but all product prices and stock values are `0`.

Warehouse external `/api/stock/:productId` returns `401 Missing or invalid Authorization header`. FlipFlop's warehouse client does not forward a user JWT or service JWT, so stock enrichment cannot work reliably.

FlipFlop source currently has a TypeScript syntax error in `shared/clients/warehouse-client.service.ts` around the direct database fallback. Production is therefore not aligned with the dirty working tree.

Bazos service has a catalog client and `syncFromCatalog`, but the public route tested as `/api/ads` is wrong for the current gateway. Bazos routes live under `/api/bazos/*` and require JWT.

Bazos already has a compliance spec and plan requiring identity/session guardrails, policy gates, publisher queue, and a later catalog sell action.

## Missing Implementation

1. Auth boundary in catalog
   - Product, category, attribute, media, and pricing mutation endpoints are public.
   - Hard delete exists even though catalog business constraints say AI must not delete products without explicit owner approval.
   - There is no catalog JWT guard, role guard, service token guard, or audit trail for changes.

2. Catalog/warehouse contract
   - Warehouse stores `productId` as a string but does not validate catalog existence.
   - Catalog does not expose a stock-aware product projection.
   - Consumers perform N+1 stock calls instead of a batch availability contract.
   - Authenticated service-to-service calls are missing between FlipFlop, catalog, and warehouse.

3. Product model for real channels
   - No channel eligibility model for FlipFlop, Bazos, Aukro, Allegro, Heureka, or future channels.
   - No publication status per channel: draft, ready, published, paused, rejected, needs_review.
   - No channel-specific title/description/category/image requirements.
   - No compliance/readiness diagnostics that explain why a product cannot be listed.

4. Pricing and stock correctness
   - FlipFlop live API shows price `0` despite catalog pricing rows.
   - Warehouse stock cannot be read by FlipFlop because warehouse requires JWT.
   - There is no acceptance smoke test proving catalog price plus warehouse availability reaches FlipFlop.

5. Data quality
   - Seeded catalog records use placeholder images and mostly missing EAN codes.
   - Catalog has no import/reconciliation workflow from supplier, FlipFlop legacy data, or Bazos local drafts.
   - There is no duplicate SKU/EAN audit beyond SKU uniqueness.

6. Bazos integration boundary
   - Catalog has no "create Bazos draft" action or API contract.
   - Bazos `syncFromCatalog` creates/updates local ads directly from catalog data, but publishing guardrails are still planned, not implemented.
   - Catalog must not bypass Bazos policy. It should only request draft creation and display Bazos policy/readiness state returned by bazos-service.

7. Operations and intent preservation
   - Catalog `TASKS.md` is too small for the real commerce goal.
   - No catalog-owned goal sequence existed for future implementation sessions.
   - No smoke tests cover catalog -> warehouse -> FlipFlop -> Bazos readiness.

## Goal Sequence For Future Sessions

### Goal 1 - Catalog contract and auth boundary

Objective: Make catalog safe as the central product system.

Acceptance criteria:

- Public reads remain available where intended, but all mutations require JWT/RBAC or approved internal service identity.
- Hard delete is disabled or gated behind explicit owner-approved role and audit reason.
- Catalog writes record actor, source service, and change summary.
- Tests cover unauthorized mutation rejection and authorized admin/service mutation success.

### Goal 2 - Catalog and warehouse alignment

Objective: Make product identity and stock availability consistent across catalog and warehouse.

Acceptance criteria:

- Warehouse stock writes validate catalog product IDs or use a documented trusted service path.
- Add batch availability endpoint or adapter so consumers do not call warehouse once per product.
- FlipFlop can retrieve nonzero stock for seeded products through the authenticated service path.
- Smoke test proves catalog product IDs match warehouse stock rows.

### Goal 3 - FlipFlop product projection

Objective: Make FlipFlop storefront show real sellable catalog goods.

Acceptance criteria:

- FlipFlop product API maps catalog pricing correctly, including sale price priority.
- FlipFlop product API maps warehouse availability correctly.
- Source tree builds cleanly with no TypeScript syntax errors.
- Production smoke test proves `/api/products` returns at least one active product with price greater than 0 and expected stock availability.

### Goal 4 - Channel readiness model

Objective: Add a future-proof channel model to catalog.

Acceptance criteria:

- Catalog can store channel eligibility and channel-specific readiness per product.
- Readiness result includes missing fields, blocked compliance conditions, and next action.
- FlipFlop and Bazos channel states are represented first without coupling catalog to one channel's internals.
- Existing product CRUD remains backward compatible.

### Goal 5 - Bazos draft integration

Objective: Connect catalog to Bazos without bypassing Bazos compliance.

Acceptance criteria:

- Catalog can request Bazos draft creation for a product and selected identity/account.
- Bazos remains the authority for identity status, caps, duplicate checks, pacing, and publish queue.
- Catalog UI/API shows Bazos policy status and failure reasons from bazos-service.
- No catalog endpoint can publish directly to Bazos.

### Goal 6 - Catalog data quality and import/reconciliation

Objective: Make catalog useful beyond seeded demo records.

Acceptance criteria:

- Import/reconcile script handles SKUs, EANs, categories, pricing, media URLs, and stock seed mapping idempotently.
- Duplicate and missing-data audits report missing EAN, missing image, missing price, missing stock, duplicate SKU/EAN, and inactive channel state.
- Placeholder media is clearly flagged as placeholder and excluded from publish-ready status.

### Goal 7 - End-to-end commerce smoke tests

Objective: Prove the catalog serves its purpose across services.

Acceptance criteria:

- Smoke test covers catalog health, product search, product detail, pricing, media, warehouse availability, FlipFlop product projection, and Bazos draft-readiness endpoint.
- Smoke test uses auth/login microservice for protected paths.
- Failure output names the broken service contract and product ID/SKU.
- The catalog-owned plan shows the goal sequence and current blocked/next action state.

## First Next Step

Implement Goal 1 first. Do not start with UI or channel publishing. The central risk is that catalog is currently a public mutation surface for the product truth. After the auth boundary is fixed, align warehouse and FlipFlop so live products have correct price and stock.

## Future Session Protocol

Each future session should:

1. Re-read this file plus `BUSINESS.md`, `SYSTEM.md`, and `TASKS.md`.
2. Re-run the current-state checks before editing:
   - `npm run build` in `catalog-microservice`
   - `npm run build` in `warehouse-microservice`
   - `curl -sk https://catalog.alfares.cz/health`
   - `curl -sk https://catalog.alfares.cz/api/products`
   - `curl -sk https://flipflop.alfares.cz/api/products`
3. Work on the earliest unfinished goal unless the owner explicitly chooses another goal.
4. Preserve the ownership boundaries:
   - Catalog owns product truth and channel readiness.
   - Warehouse owns stock and reservations.
   - Auth owns login, JWT, RBAC, and service identity.
   - FlipFlop owns storefront projection and checkout UX.
   - Bazos owns Bazos compliance, identities, drafts, and publishing.
5. Update this file only by appending evidence/status notes or tightening acceptance criteria; do not silently change the preserved intent.
