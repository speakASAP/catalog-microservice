# Goal 05 Validation - Catalog/Warehouse Contract

```yaml
id: VAL-CATALOG-05-WAREHOUSE-CONTRACT
status: passed_with_runtime_smoke_limitation
source_goal: implementation-goals/GOAL-05-catalog-warehouse-contract.md
execution_plan: implementation-goals/GOAL-05-execution-plan.md
repository_root: /home/ssf/Documents/Github/catalog-microservice
branch: feature/catalog-goal-05-catalog-warehouse-contract
created: 2026-06-13
last_updated: 2026-06-13
```

## Scope

Goal 5 source implementation for the Catalog/Warehouse contract.

Implemented an additive Catalog endpoint:

```http
POST /api/products/availability/batch
```

The endpoint validates Catalog product IDs first, then performs one Warehouse batch availability request. Catalog enriches the response with Catalog SKU identity and marks returned availability as `source: "warehouse"`.

## Source Changes

- Added `src/warehouse-availability/warehouse-availability.types.ts` for request and response contracts.
- Added `src/warehouse-availability/warehouse-availability.service.ts` for ID validation, Warehouse batch client call, response mapping, zero-row fallback for valid products, and dependency failure handling.
- Added `src/warehouse-availability/warehouse-availability.controller.ts` exposing `POST /api/products/availability/batch` behind `CatalogAuthGuard`.
- Added `src/warehouse-availability/warehouse-availability.module.ts` and imported it in `src/app.module.ts`.
- Added `ProductsService.findIdentitiesByIds` so Goal 5 can prove product identity without changing public product read envelopes.
- Added focused Jest coverage in `src/warehouse-availability/warehouse-availability.service.spec.ts`.

## Commands Run

```bash
npm test -- --runInBand
npm run build
git diff --check
```

## Results

- `npm test -- --runInBand`: passed, 4 suites / 15 tests.
- `npm run build`: passed.
- `git diff --check`: passed.

## Contract Evidence

- Unknown Catalog product IDs are rejected with `400 Bad Request` before any Warehouse request is made.
- Multiple valid product IDs result in exactly one Warehouse batch request.
- Warehouse response rows are mapped with `source: "warehouse"` and Catalog SKU identity.
- Valid products missing Warehouse rows are returned with zero totals and empty `warehouses`, preserving Warehouse zero-row semantics without persisting stock in Catalog.
- Warehouse auth/network failures are surfaced as upstream dependency errors and do not fabricate availability.

## Invariant Evidence

- `CAT-INV-001`: Catalog validates product identity and contributes SKU metadata only.
- `CAT-INV-002`: Stock quantity, reserved, available, warehouse, movement, and reservation truth remains Warehouse-owned; no Catalog schema persistence was added.
- `CAT-INV-009`: Existing product and channel-readiness read envelopes are unchanged; Goal 5 adds a new endpoint only.

## Sensitive-Data Result

Passed. Tests and validation use synthetic product and warehouse IDs. No service JWTs, runtime secrets, production stock rows, warehouse locations, customer data, order data, supplier data, or raw production product lists were printed or committed.

## Limitations

Direct runtime verification against the deployed Warehouse endpoint was not run because it requires an approved runtime service token and production deployment approval. The source-level client path is covered by mocked tests.

## Next Action

Commit Goal 5 source/docs when ready, then deploy only with owner approval and run a runtime smoke using approved service-token handling without printing token values.

## Deployment Evidence

- Commit `874e080` deployed successfully with `./scripts/deploy.sh`.
- Image `localhost:5000/catalog-microservice:874e080` was built and pushed.
- Kubernetes rollout completed successfully.
- Production deploy health returned `healthy`.

## Production Smoke Evidence

Safe smoke passed:

- `GET /health` returned `200`.
- Anonymous `POST /api/products/availability/batch` returned `401` with `Missing or invalid Authorization header`.

This proves the new endpoint is deployed and protected. Full authorized smoke using synthetic product mutations and Warehouse runtime service credentials was not run because it requires explicit approval for production side effects and secret use.
