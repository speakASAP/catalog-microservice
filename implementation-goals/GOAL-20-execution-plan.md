# EP-CATALOG-20: Bulk Marketplace Publication Dispatch

```yaml
id: EP-CATALOG-20-BULK-MARKETPLACE-PUBLICATION
status: active
source_goal: implementation-goals/GOAL-20-bulk-marketplace-publication.md
owner: catalog orchestrator
created: 2026-06-30
last_updated: 2026-06-30
branch: feature/catalog-goal-19-canonical-content-connectors
```

## Traceability

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

## Task

Implement a bulk marketplace publication dispatch flow for selected Catalog products.

## Scope

Allowed files:
- `src/products/products.service.ts`
- `src/products/products.controller.ts`
- `src/products/products.service.spec.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/dashboard/products/page.tsx`
- `services/frontend/app/dashboard/products/publish/page.tsx`
- Goal 20 docs and validation reports.

Forbidden files:
- Protected baseline intent files.
- Kubernetes, deployment, secret, Vault, migration, and pricing files.
- Marketplace service source unless integration evidence proves Catalog-side dispatch cannot work.

## Invariants

- CAT-INV-001 preserved: Catalog coordinates product selection and product truth only.
- CAT-INV-002 preserved: no stock ownership change.
- CAT-INV-003 preserved: endpoint uses existing Catalog auth guard.
- CAT-INV-004 preserved: FlipFlop storefront remains FlipFlop-owned.
- CAT-INV-005 preserved: Bazos compliance and publishing remain Bazos-owned.
- CAT-INV-009 preserved: additive endpoint/UI only.
- CAT-INV-010 preserved: protected mutation endpoint emits audit context.

## Parallel Execution

| Workstream | Status | Owner | Scope | Dependencies | Validation | Handoff |
|---|---|---|---|---|---|---|
| Catalog bulk API/UI | ready now | main thread | Catalog files listed above | Existing single-product channel methods | Jest, build, frontend tsc/build | Integration owner here |
| Bazos contract discovery | ready now | subengine | read-only `bazos-service` | none | command evidence | Report endpoint/body/auth |
| FlipFlop contract discovery | ready now | subengine | read-only `flipflop-service` | none | command evidence | Report whether service endpoint exists |
| Final integration | final integration | main thread | Catalog endpoint/page validation | contract findings | build/test/smoke | Decide if other services need changes |

Shared contracts: Catalog product IDs, marketplace keys `flipflop`, `bazos`, `allegro`, `aukro`, existing single-product methods.
Integration owner: main thread. Validation owner: main thread. Merge order: contract discovery -> Catalog implementation -> validation -> deploy decision.

## Validation Plan

- `git diff --check`
- `npm test -- --runInBand src/products/products.service.spec.ts`
- `npm run build`
- `cd services/frontend && ./node_modules/.bin/tsc --noEmit`
- `cd services/frontend && npm run build`

## Sensitive Data

Do not print tokens, identities beyond IDs returned in normal API responses, raw customer data, private logs, or secrets. Product titles/SKUs shown in UI are operational Catalog data.

## Rollback

Revert additive bulk endpoint, API client types/methods, publication page, products table button, tests, and Goal 20 docs. No schema rollback is needed.
