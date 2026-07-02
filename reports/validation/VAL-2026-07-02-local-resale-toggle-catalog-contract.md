# VAL 2026-07-02 Local Resale Toggle Catalog Contract

## Vision
Authenticated ecosystem sellers can source products from own, Alfares/company, and community catalogs while owner-only product mutation remains governed by Catalog.

## Goal Impact
Allegro, Heureka, Aukro, and FlipFlop can expose local seller controls without weakening Catalog ownership or forcing users only into central Catalog settings.

## System
catalog-microservice.

## Feature
- Central dashboard and settings expose includeAlfaresCatalog and includeCommunityCatalog source options.
- Product create/edit surfaces expose resaleEnabled for owner publication.
- Product reads support catalogScope and catalogSources.
- Product update path is PUT /api/products/:id and uses authenticated Catalog actor.

## Task
Verify company/community source options and owner-only resale mutation contract for local marketplace integrations.

## Execution Plan
Inspect source, run targeted Catalog access/product service tests, then build the service.

## Coding Prompt
No Catalog code change was required; existing contract is sufficient for local marketplace toggle implementation.

## Validation
- rg source inspection confirmed includeAlfaresCatalog, includeCommunityCatalog, catalogSources, catalogScope, resaleEnabled, and updateCatalogSettings in dashboard/settings/API files.
- PUT /api/products/:id calls ProductsService.update with CatalogAuthGuard and catalog:authenticated role.
- ProductsService.assertCanMutateProduct permits admin/service actors or jwt owner only, otherwise ForbiddenException.
- Command: npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts
- Result: PASS, 2 test suites, 38 tests.
- Command: npm run build
- Result: PASS, nest build completed.
