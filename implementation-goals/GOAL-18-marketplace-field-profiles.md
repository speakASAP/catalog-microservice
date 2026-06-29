# GOAL 18 - Marketplace Field Profiles

## Vision

Catalog remains the Statex product truth service while marketplace-specific systems can store platform-only field projections without redefining product truth.

## Goal Impact

Operators can edit Allegro/Bazos/Aukro/FlipFlop-specific product fields from the Catalog product page. Canonical aliases such as name, product name, nazev, and title resolve to one Catalog value instead of duplicated channel values.

## System

- Catalog owns canonical product identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness.
- Marketplace services own platform accounts, compliance, draft publication, queues, and external listing mutation.
- Warehouse remains the stock authority.

## Feature

Add a product-scoped `product_marketplace_profiles` read/write model and UI panel:

- canonical fields update `products`;
- marketplace-only fields update `product_marketplace_profiles.overrides`;
- external listing/account references update `product_marketplace_profiles.external_refs`;
- imported platform payloads can be stored in `source_data`;
- aliases are metadata for field resolution, not duplicate source-of-truth values.

## Task

Implement additive backend API and frontend panel:

- `GET /api/products/:id/marketplace-fields/:marketplace`
- `PUT /api/products/:id/marketplace-fields/:marketplace`
- `services/frontend/components/MarketplaceFieldsPanel.tsx`

## Execution Plan

1. Add `ProductMarketplaceProfile` TypeORM entity and SQL migration.
2. Add `MarketplaceFieldsModule`, controller, service, and focused tests.
3. Add frontend API types and product detail marketplace-fields panel.
4. Validate backend, frontend, and schema diff.

## Parallel Execution

- Catalog backend owner: `src/marketplace-fields/*`, `src/app.module.ts`, `scripts/migrations/20260629_marketplace_profiles.sql`.
- Catalog frontend owner: `services/frontend/components/MarketplaceFieldsPanel.tsx`, `services/frontend/lib/api/products.ts`, `services/frontend/app/dashboard/products/[id]/page.tsx`.
- Marketplace explorer owner: read-only Bazos/Aukro/FlipFlop contract scan.
- Allegro explorer owner: read-only Allegro catalog-sell mapping scan.
- Integration owner: main thread.
- Validation owner: main thread.
- Merge order: backend contract, frontend API/panel, docs/status, migration/deploy.

## Coding Prompt

Create a Catalog-owned marketplace profile envelope that preserves Catalog as the single product truth and allows channel-specific fields to be edited without duplicating canonical product values.

## Code

- `src/marketplace-fields/marketplace-profile.entity.ts`
- `src/marketplace-fields/marketplace-fields.service.ts`
- `src/marketplace-fields/marketplace-fields.controller.ts`
- `src/marketplace-fields/marketplace-fields.module.ts`
- `src/marketplace-fields/marketplace-fields.service.spec.ts`
- `scripts/migrations/20260629_marketplace_profiles.sql`
- `services/frontend/components/MarketplaceFieldsPanel.tsx`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/dashboard/products/[id]/page.tsx`
- `src/app.module.ts`

## Validation

- `git diff --check`: passed.
- `npm test -- --runInBand src/marketplace-fields/marketplace-fields.service.spec.ts`: passed, 2 tests.
- `npm run build`: passed.
- `npm test -- --runInBand`: passed, 8 suites, 60 tests.
- `services/frontend ./node_modules/.bin/tsc --noEmit`: passed.
- `services/frontend npm run build`: passed with existing multiple-lockfile Next.js warning only.

## Intent Compliance Report

- CAT-INV-001 preserved: Product remains canonical; marketplace profiles store only overrides/source/external refs.
- CAT-INV-002 preserved: no stock ownership added to Catalog.
- CAT-INV-004 preserved: FlipFlop storefront/checkout ownership unchanged.
- CAT-INV-005 preserved: Catalog still delegates Bazos publishing/compliance to Bazos.
- CAT-INV-009 preserved: existing product read/update routes remain backward compatible.
- CAT-INV-010 preserved: new marketplace profile write endpoint is protected by `CatalogAuthGuard` and emits catalog write audit.
