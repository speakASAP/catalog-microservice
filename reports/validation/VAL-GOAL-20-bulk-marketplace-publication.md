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
- FlipFlop remains storefront/projection owner; Catalog only checks/dispatches the existing projection path until a FlipFlop-owned bulk endpoint exists.
- No schema, migration, secret, deployment manifest, pricing, stock, checkout, or Auth ownership change was introduced by Goal 20.

## Known Gaps

- FlipFlop has no native bulk publish/sell-action endpoint yet. Current Catalog behavior treats FlipFlop publication as availability through the existing Catalog Warehouse-backed FlipFlop projection.
- Bazos bulk operation is per-product iteration over the existing single-product sell-action contract; no native Bazos bulk endpoint exists.
