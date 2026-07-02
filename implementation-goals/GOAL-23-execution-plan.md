# EP-CATALOG-23: Reseller Community Catalog

```yaml
id: EP-CATALOG-23-RESELLER-COMMUNITY-CATALOG
status: source-implementation
source_goal: implementation-goals/GOAL-23-reseller-community-catalog.md
owner: Catalog integration owner
created: 2026-07-02
branch: main
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

## Scope

Implement the central Catalog contract and the Catalog dashboard source/resale controls. Prepare channel repositories for follow-up parallel work after the Catalog API contract is validated.

## Current State

- `products.owner_user_id` exists and user-created products already store the Auth subject.
- Ordinary product reads currently use owner-only scoping.
- There is no `resale_enabled` flag.
- There is no `catalog_user_settings` table or source settings API.
- Catalog frontend has product list/create/edit/publish pages but no source/resale controls.
- Allegro, Aukro, Bazos, and FlipFlop have independent dashboard/product-picker surfaces.
- Several channel repos contain unrelated dirty event/RabbitMQ work and must not be overwritten.

## Files Created

- `src/catalog-access/catalog-user-settings.entity.ts`
- `src/catalog-access/catalog-access.service.ts`
- `src/catalog-access/catalog-access.controller.ts`
- `src/catalog-access/catalog-access.module.ts`
- `src/catalog-access/catalog-access.service.spec.ts`
- `scripts/migrations/20260702_catalog_resale_access.sql`
- `services/frontend/app/dashboard/settings/page.tsx`
- `docs/contracts/catalog-reseller-community-products.md`
- `implementation-goals/GOAL-23-reseller-community-catalog.md`
- `implementation-goals/GOAL-23-execution-plan.md`
- `docs/orchestrator/2026-07-02-reseller-community-catalog-cross-repo-plan.md`
- `reports/validation/VAL-GOAL-23-reseller-community-catalog.md`

## Files Modified

- `src/app.module.ts`
- `src/products/product.entity.ts`
- `src/products/products.module.ts`
- `src/products/products.controller.ts`
- `src/products/products.service.ts`
- `src/products/dto/index.ts`
- `src/products/products.service.spec.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/components/AdminLayout.tsx`
- `services/frontend/app/dashboard/products/page.tsx`
- `services/frontend/app/dashboard/products/new/page.tsx`
- `services/frontend/app/dashboard/products/[id]/page.tsx`

## Implementation Tasks

1. Add additive migration for `products.resale_enabled` and `catalog_user_settings`.
2. Add `CatalogAccessModule` and protected settings endpoints.
3. Update product DTO/query types.
4. Apply effective read scoping:
   - own products always;
   - Alfares products when `includeAlfaresCatalog=true`;
   - other sellers' `resaleEnabled=true` products when `includeCommunityCatalog=true`.
5. Keep mutation scoping owner-only for ordinary users.
6. Preserve admin/service operational scope.
7. Add frontend source checkboxes in product list and settings page.
8. Add product resale checkbox in create/edit forms.
9. Add source labels and read-only save behavior for visible non-owned products.
10. Add focused tests for settings, private default, resale opt-in, and shared mutation rejection.

## Parallel Execution

| Workstream | Status | Owner Role | Scope | Dependencies | Validation | Handoff |
|---|---|---|---|---|---|---|
| W0 Contract and orchestration | active | integration owner | Goal 23 docs, contract, plan, validation report | user prompt | doc review, diff check | own merge order |
| W1 Catalog backend | active | main thread | schema/API/product scope/tests | W0 | backend focused tests, build | contract ready for service consumers |
| W2 Catalog frontend | active | main thread | product list/settings/create/edit | W1 API shape | frontend build | visible checkboxes in Catalog cabinet |
| W3 Allegro dashboard | ready after W1 | channel worker | `services/frontend/src/pages/ProductsPage.tsx`, API helper | W1 validated | Allegro frontend/service build | pass `catalogScope=effective`, source controls |
| W4 Aukro dashboard | ready after W1 | channel worker | UI controller/assets product picker | W1 validated | Aukro test/build | consume effective Catalog scope |
| W5 Bazos dashboard | ready after W1 | channel worker | Bazos UI controller/assets product picker | W1 validated, package JSON blocker fixed | Bazos focused tests/build | consume effective Catalog scope |
| W6 FlipFlop seller/admin | ready after W1 | channel worker | seller/admin product surfaces only | W1 validated | product-service/frontend build | no public storefront regression |
| W7 Heureka product picker | dependency-gated | channel worker | product/feed inclusion picker if present | W1 validated, route ownership confirmed | Heureka build/tests | source controls where picker exists |
| W8 Auth provisioning | decision-gated | auth worker | no-code decision unless lazy provisioning gap proven | W1 runtime smoke | Auth tests/build if changed | keep JWT/login unchanged |
| W9 Runtime deploy | blocked | deploy operator | apply migration, deploy Catalog and consumers | owner deploy approval | health + authorized smoke | no secret printing |

## Shared Contracts

- `docs/contracts/catalog-reseller-community-products.md`
- `GET /api/catalog/settings`
- `PUT/PATCH /api/catalog/settings`
- `POST /api/catalog/access/provision`
- `GET /api/products?catalogScope=effective`
- `products.resale_enabled`

## Dirty Worktree Boundaries

Do not overwrite unrelated dirty files in channel repos:

- Allegro event/RabbitMQ files and `.env.example`.
- Aukro validation JSON and RabbitMQ/event files.
- Bazos RabbitMQ/event files and known gateway package JSON blocker.
- FlipFlop proactive consumer/RabbitMQ files.
- Catalog product-event/health dirty files unless specifically assigned.

## Validation Plan

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice/services/frontend && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && git diff --check'
```

## Rollback

Before migration: revert source/docs files. After migration: roll back code first; keep additive table/column unless owner approves destructive DB cleanup after verifying no settings are needed.
