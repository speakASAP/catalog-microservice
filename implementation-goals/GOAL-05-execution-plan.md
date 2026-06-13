# EP-CATALOG-05: Catalog/Warehouse Contract

```yaml
id: EP-CATALOG-05
status: planned
source_goal: implementation-goals/GOAL-05-catalog-warehouse-contract.md
owner: orchestrator
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: pre-coding-ready
```

## Metadata

Remote implementation repository: `alfares:/home/ssf/Documents/Github/catalog-microservice`.

Target branch: `feature/catalog-goal-05-catalog-warehouse-contract`.

Current planning branch inspected: `feature/catalog-goal-05-catalog-warehouse-contract`.

Lifecycle state: planning and pre-coding gate complete. Source implementation has not started.

Related warehouse repository inspected for contract context only: `alfares:/home/ssf/Documents/Github/warehouse-microservice`.

## Upstream Traceability

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/MASTER_PROMPT.md`
- `docs/orchestrator/INTENT.md`
- `docs/orchestrator/GOALS.md`
- `docs/orchestrator/PLAN.md`
- `docs/orchestrator/STATUS.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/IMPLEMENTATION_ORCHESTRATOR.md`
- `docs/governance/PROJECT_INVARIANTS.md`
- `docs/process/OPERATIONAL_GATES.md`
- `docs/orchestration/branch-workflow.md`
- `implementation-goals/README.md`
- `implementation-goals/GOAL-05-catalog-warehouse-contract.md`
- Warehouse reference: `warehouse-microservice/docs/contracts/availability-contracts.md`

## Goal Impact

Goal 5 aligns Catalog product identity with warehouse availability without moving stock truth into Catalog. Catalog should be able to prove that requested product IDs are valid Catalog products before any stock write or stock-aware consumer flow depends on them. Consumers should also have a batch availability path so product lists do not require N+1 calls to Warehouse.

## Project Invariants

- `CAT-INV-001`: Catalog remains the product identity and sellable-content authority.
- `CAT-INV-002`: Warehouse remains the authority for stock quantities, reservations, movements, and locations. Catalog must not persist stock quantities or calculate stock truth.
- `CAT-INV-009`: Existing product and channel-readiness read envelopes remain backward compatible. Goal 5 should add a new endpoint/module or additive contract only.
- `CAT-INV-010`: If a catalog-side endpoint calls a protected warehouse endpoint, it must use approved service authentication and must not expose secrets or unauditable mutation paths.

## Sensitive-Data Handling

Use synthetic product IDs, SKUs, warehouse IDs, and availability totals in tests and validation reports. Do not print service JWTs, runtime secrets, production stock rows, warehouse locations, customer identifiers, order identifiers, supplier identifiers, or raw production product lists.

Any warehouse service token must be read from runtime configuration only. It must not be committed, printed, included in validation artifacts, or copied into local workspace files.

## Contract/Schema Impact

Preferred implementation is schema-neutral and additive:

- No Catalog database columns for stock quantity, reserved quantity, available quantity, warehouse locations, movements, or reservations.
- Add a Catalog-side batch availability read endpoint that validates Catalog product IDs, then calls Warehouse batch availability.
- Preserve Warehouse response authority by returning stock fields as warehouse-sourced values with an explicit `source: "warehouse"` marker.
- Return zero availability only when Warehouse returns zero rows for a valid Catalog product, not as a Catalog-owned stock calculation.

Planned Catalog response shape:

```ts
type CatalogWarehouseAvailabilityResponse = {
  requestedProductIds: string[];
  invalidProductIds: string[];
  items: Array<{
    productId: string;
    sku: string;
    source: "warehouse";
    totalQuantity: number;
    totalReserved: number;
    totalAvailable: number;
    warehouses: Array<{
      warehouseId: string;
      quantity: number;
      reserved: number;
      available: number;
    }>;
  }>;
};
```

Planned endpoint:

```http
POST /api/products/availability/batch
Authorization: Bearer <catalog-approved caller token>
Content-Type: application/json

{
  "productIds": ["catalog-product-1", "catalog-product-2"],
  "warehouseIds": ["warehouse-1"]
}
```

Response envelope should follow existing Catalog conventions:

```json
{
  "success": true,
  "data": {
    "requestedProductIds": ["catalog-product-1"],
    "invalidProductIds": [],
    "items": []
  }
}
```

## Warehouse Contract Reference

Warehouse already exposes a batch availability contract:

- `POST /api/stock/availability/batch`
- Request body: `{ productIds: string[], warehouseIds?: string[] }`
- Response body: `{ success: true, data: ProductAvailability[] }`
- Missing stock rows for known product IDs return zero totals.
- Warehouse is protected by `JwtRolesGuard` via a global `APP_GUARD`; default roles include `global:superadmin` and `internal:warehouse-microservice:admin`.

Goal 5 source work must not modify the warehouse repository unless the owner explicitly expands scope. Direct warehouse verification may be added after catalog implementation if a service token is available in the approved runtime environment.

## Scope

- Document the Catalog/Warehouse product identity and availability boundary.
- Add a Catalog-side batch availability endpoint or module if implementation proceeds.
- Validate requested product IDs against Catalog before calling Warehouse.
- Call Warehouse batch availability once per request, not once per product.
- Return warehouse-sourced stock projection data without storing it as Catalog truth.
- Add focused tests for valid IDs, invalid IDs, batch behavior, warehouse failure handling, and no stock persistence.
- Record validation evidence in `reports/validation/`.

## Non-Goals

- Do not store stock quantity, reserved quantity, available quantity, warehouse locations, movement history, or reservations in Catalog.
- Do not implement warehouse stock mutation endpoints in Catalog.
- Do not implement reservations, checkout holds, movement history, supplier reconciliation, or location allocation.
- Do not bypass Warehouse auth boundaries or hardcode service credentials.
- Do not modify FlipFlop, Bazos, Orders, Auth, or Warehouse source code without a separate owner-approved plan.
- Do not deploy production changes without explicit owner approval.

## Files To Inspect

- `src/products/products.controller.ts`
- `src/products/products.service.ts`
- `src/products/products.module.ts`
- `src/products/product.entity.ts`
- `src/products/products.service.spec.ts`
- `src/channel-readiness/channel-readiness.service.ts`
- `src/app.module.ts`
- `src/auth/catalog-auth.guard.ts`
- `src/logger/logger.service.ts`
- `package.json`
- `docs/governance/PROJECT_INVARIANTS.md`
- `docs/process/OPERATIONAL_GATES.md`
- Warehouse reference: `warehouse-microservice/src/stock/stock.controller.ts`
- Warehouse reference: `warehouse-microservice/docs/contracts/availability-contracts.md`

## Files To Create

Preferred source layout:

- `src/warehouse-availability/warehouse-availability.types.ts`
- `src/warehouse-availability/warehouse-availability.service.ts`
- `src/warehouse-availability/warehouse-availability.controller.ts`
- `src/warehouse-availability/warehouse-availability.module.ts`
- `src/warehouse-availability/warehouse-availability.service.spec.ts`
- `reports/validation/VAL-GOAL-05-catalog-warehouse-contract.md` after implementation validation.

## Files To Modify

- `src/app.module.ts` to import the availability module.
- `src/products/products.module.ts` only if the module needs exported product lookup helpers.
- `src/products/products.service.ts` only if a batch product identity helper is needed.
- `src/products/products.controller.ts` only if routing through the product controller is simpler than a standalone controller.
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `docs/orchestrator/PLAN.md`
- `implementation-goals/GOAL-05-catalog-warehouse-contract.md` only for status/checklist updates.

## Files That Must Not Be Modified

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/INTENT.md`
- `docs/orchestrator/MASTER_PROMPT.md`
- `docs/governance/PROJECT_INVARIANTS.md` unless the owner approves governance changes.
- Warehouse source code unless a separate owner-approved Warehouse task is opened.
- Auth, FlipFlop, Bazos, Orders, payment, supplier, or channel repositories.
- Production secrets, local `.env` files, Kubernetes secret values, or generated frontend build output.

## Implementation Steps

1. Confirm branch `feature/catalog-goal-05-catalog-warehouse-contract` and clean or documented working tree before source edits.
2. Add typed request/response contracts for batch availability.
3. Add a product identity lookup helper that returns known Catalog products for requested IDs without changing public product read envelopes.
4. Reject or explicitly report invalid product IDs before calling Warehouse. Preferred behavior is `400 Bad Request` with invalid IDs when any requested ID is not a Catalog product.
5. Add a warehouse availability client that calls `POST /api/stock/availability/batch` once with the validated IDs and optional warehouse IDs.
6. Read Warehouse base URL and service token from environment/config only. Do not print or persist token values.
7. Map Warehouse availability rows into Catalog response items with `source: "warehouse"` and product identity metadata such as SKU.
8. Preserve Warehouse zero-row semantics for valid products that have no stock rows.
9. Handle Warehouse auth/network failures as upstream dependency failures without fabricating stock values.
10. Add focused Jest tests using mocked product lookup and mocked Warehouse client/fetch/axios behavior.
11. Run validation: `npm test`, `npm run build`, and `git diff --check`.
12. Record implementation validation in `reports/validation/VAL-GOAL-05-catalog-warehouse-contract.md`, `docs/orchestrator/STATUS.md`, and `docs/IMPLEMENTATION_STATE.md`.

## Existing Boundary Risks To Handle Carefully

- `ProductsService.sellOnBazos` currently accepts `stockQuantity` from request data for a Bazos offer payload. Goal 5 must not expand or treat that as Catalog stock truth. Any correction belongs to Goal 7 or a separate owner-approved boundary fix.
- Warehouse currently protects all endpoints with `JwtRolesGuard`. Catalog implementation must use an approved service identity path and must not weaken Warehouse auth.
- FlipFlop currently shows stock as `0` according to orchestrator status, but Goal 5 should only provide the Catalog/Warehouse contract surface. FlipFlop consumption belongs to Goal 6 unless the owner expands scope.

## Test Plan

- Unit-test that unknown Catalog product IDs are rejected or reported before any Warehouse request is made.
- Unit-test that multiple valid product IDs produce exactly one Warehouse batch request.
- Unit-test that Warehouse zero-availability rows are returned with `source: "warehouse"` and do not become persisted Catalog fields.
- Unit-test Warehouse upstream `401`, `403`, and network failures return a dependency error without fabricating availability.
- Unit-test request validation for empty product ID arrays, duplicate IDs, malformed IDs, and optional warehouse IDs.
- Keep all fixtures synthetic.

## Validation Plan

Required before implementation closure:

```bash
npm test
npm run build
git diff --check
```

Manual/API validation after source changes should use synthetic product IDs and a mocked or approved runtime Warehouse service token. Production runtime verification requires explicit owner approval and must not mutate production stock.

## Gate Commands

Pre-coding planning gate for this artifact:

```bash
git status --short --branch
python3 -c "from pathlib import Path; files=[Path(p) for p in ['docs/orchestrator/GOALS.md','docs/orchestrator/PLAN.md','docs/orchestrator/STATUS.md','docs/IMPLEMENTATION_STATE.md','implementation-goals/GOAL-05-catalog-warehouse-contract.md','implementation-goals/GOAL-05-execution-plan.md']]; markers=[chr(91)+'MISSING:', chr(91)+'UNKNOWN:']; hits=[str(f) for f in files if f.exists() and any(m in f.read_text() for m in markers)]; print('missing_marker_hits=' + str(hits)); raise SystemExit(1 if hits else 0)"
git diff --check
```

For the pre-coding gate, run the status, missing-marker, and whitespace checks. Build/test are implementation-phase gates after source edits.

## Documentation Updates

- Create `implementation-goals/GOAL-05-execution-plan.md`.
- Create `reports/validation/GOAL-05-pre-coding-gate.md`.
- Update `docs/orchestrator/PLAN.md` with the Goal 5 planning checkpoint.
- Update `docs/orchestrator/STATUS.md` with planning/pre-coding evidence.
- Update `docs/IMPLEMENTATION_STATE.md` with Goal 5 active planning state.

## Rollback Plan

Before coding, rollback is documentation-only: revert `implementation-goals/GOAL-05-execution-plan.md`, `reports/validation/GOAL-05-pre-coding-gate.md`, and the planning entries in state/status/plan docs.

After future source implementation, revert the Goal 5 implementation commit. Because the preferred model is schema-neutral, no database rollback should be needed unless a future deviation introduces persisted fields.

## Agent Handoff Prompt

Implement Goal 5 in the remote `catalog-microservice` repository only. Add an additive Catalog/Warehouse availability contract that validates Catalog product IDs, calls Warehouse batch availability once, and returns warehouse-sourced availability without storing stock truth in Catalog. Preserve existing product read envelopes, keep Warehouse auth boundaries intact, do not mutate production stock, do not modify FlipFlop/Bazos/Auth/Warehouse code without owner approval, and do not deploy without explicit owner approval.

## Completion Checklist

- [x] Planning artifact created
- [x] Source and warehouse contract files inspected for implementation shape
- [x] Pre-coding gate run and recorded
- [x] Coding unblocked
- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated after implementation
- [ ] Deviations documented
