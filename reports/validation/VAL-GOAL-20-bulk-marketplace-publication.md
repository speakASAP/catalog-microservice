# VAL-GOAL-20: Bulk Marketplace Publication Dispatch

```yaml
id: VAL-GOAL-20-BULK-MARKETPLACE-PUBLICATION
status: passed
created: 2026-06-30
repository: /home/ssf/Documents/Github/catalog-microservice
branch: feature/catalog-goal-19-canonical-content-connectors
```

## Validation Evidence

- `git diff --check` passed.
- `npm test -- --runInBand src/products/products.service.spec.ts` passed: 1 suite, 22 tests.
- `npm run build` passed.
- `npm test -- --runInBand` passed: 9 suites, 71 tests.
- `cd services/frontend && ./node_modules/.bin/tsc --noEmit` passed.
- `cd services/frontend && npm run build` passed and included `/dashboard/products/publish`; Next.js emitted only the existing multiple-lockfile workspace-root warning.

## Boundary Evidence

- Catalog bulk endpoint dispatches to existing marketplace-owned workflows instead of posting directly to external marketplaces.
- Bazos remains authority for identity, compliance, drafts, queueing, and publish actions.
- FlipFlop remains storefront owner; Catalog dispatches to the native FlipFlop product-service bulk publish lifecycle endpoint instead of treating projection availability as publication.
- No schema, migration, secret, deployment manifest, pricing, stock, checkout, or Auth ownership change was introduced by Goal 20.

## Known Gaps

- Bazos bulk operation is per-product iteration over the existing single-product sell-action contract; no native Bazos bulk endpoint exists.
- FlipFlop native endpoint deploy must precede the Catalog caller deploy so `/products/publish/bulk` is available in product-service.


## 2026-06-30 Native FlipFlop Follow-up

- Catalog `prepareFlipFlopSale` now calls `POST /products/publish/bulk` on FlipFlop product-service with the caller Authorization header.
- Catalog `GET /api/products/:id/flipflop-status` now reads `GET /products/publish/:catalogProductId/status` instead of invoking publication or projection checks.
- Focused Catalog product service spec passed after this caller switch; backend build passed.


## 2026-06-30 Native FlipFlop Caller Validation

- `git diff --check` passed.
- `npm test -- --runInBand src/products/products.service.spec.ts` passed: 1 suite, 21 tests.
- `npm run build` passed.
- `npm test -- --runInBand` passed: 8 suites, 67 tests.
