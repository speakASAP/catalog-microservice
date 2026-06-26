# EP-CATALOG-17: Product Marketplace Sales Statistics

```yaml
id: EP-CATALOG-17-PRODUCT-MARKETPLACE-SALES-STATISTICS
status: planned
source_goal: implementation-goals/GOAL-17-product-marketplace-sales-statistics.md
created: 2026-06-26
owner: catalog orchestrator
```

## Intent Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Catalog is the product truth service and gives operators product-centric channel performance visibility.
- Goal Impact: product detail pages show per-product sales totals and history by marketplace.
- System: Orders remains sales/order truth; channel services forward external orders; Catalog reads bounded aggregates.
- Feature: protected product sales statistics contract and admin UI block.
- Task: implement read-only statistics without moving order, payment, stock, or channel ownership into Catalog.
- Code: `[MISSING: implementation pending]`; current UI placeholder shows zero values only.
- Validation: `[MISSING: full validation pending]`.
- State Update: `[MISSING: completion evidence pending]`.

## Applicable Invariants

- CAT-INV-001: Catalog remains product truth and uses canonical product IDs.
- CAT-INV-002: no stock ownership moves into Catalog.
- CAT-INV-003: protected read endpoints must use Auth/service identity.
- CAT-INV-004: FlipFlop checkout/storefront UX remains in FlipFlop.
- CAT-INV-005: Bazos compliance/publishing remains in Bazos.
- CAT-INV-009: public product reads stay backward compatible.
- CAT-INV-010: any protected endpoint preserves auth and auditability.

## Current Gap

Catalog admin has no reliable source for per-product sales counts by marketplace. Bazos draft/listing status is not a sale. Warehouse stock movement is not a sale. Marketplace publish/listing state is not a sale. The durable source must be Orders order items grouped by canonical Catalog `productId` and `channel`.

## Deliverables

1. Orders protected product sales stats read endpoint.
2. Channel adapter fidelity report and fixes where needed.
3. Catalog protected product sales bridge endpoint.
4. Catalog frontend typed client and product detail UI using the bridge endpoint.
5. Validation report and state updates.

## Data Contract Draft

```ts
type ProductSalesStatistics = {
  productId: string;
  source: orders;
  generatedAt: string;
  totals: {
    soldCount: number;
    grossRevenue: Array<{ currency: string; amount: number }>;
    orderCount: number;
  };
  channels: Array<{
    channel: flipflop | bazos | allegro | aukro | heureka | string;
    status: available | zero | unavailable;
    soldCount: number;
    orderCount: number;
    grossRevenue: Array<{ currency: string; amount: number }>;
    latestSaleAt?: string | null;
    unavailableReason?: string;
  }>;
  history: Array<{
    orderId: string;
    orderReference: string;
    channel: string;
    quantity: number;
    grossRevenue: { currency: string; amount: number };
    status: string;
    orderedAt: string;
  }>;
};
```

Do not include customer name, email, address, payment provider data, tracking numbers, raw external payloads, secrets, or tokens.

## Execution Steps

1. Confirm dirty worktree and isolate unrelated existing changes.
2. Implement Orders endpoint and tests.
3. Audit/fix channel order adapters for catalog product ID fidelity.
4. Add Catalog Orders client and protected product sales endpoint.
5. Replace current frontend placeholder values with API data, loading, zero, unavailable, and error states.
6. Update docs/contracts and implementation status.
7. Run validation gates.
8. Request/defer deployment based on owner approval and readiness evidence.

## Validation Plan

```bash
git diff --check
npm run build
npm test -- --runInBand
cd services/frontend && npm run build
```

For Orders:

```bash
npm run build
npm test
```

Production-safe smoke after deployment approval:

```bash
curl -sk https://catalog.alfares.cz/health
curl -sk https://orders.alfares.cz/health
```

Authorized stats smoke requires approved runtime credentials and must not print tokens or raw customer/order/payment payloads.

## Rollback Plan

- UI placeholder can be reverted independently from backend contracts.
- Catalog bridge can return `source unavailable` without affecting product reads.
- Orders stats endpoint is additive and can be disabled by route/config if needed.
- No schema migration should be required unless indexes are needed for performance; any migration must be separately planned and guarded.

## Parallel Execution

See `implementation-goals/GOAL-17-product-marketplace-sales-statistics.md` for the agent-ready workstream split. Keep shared contract changes serialized through the Orders contract owner and Catalog integration owner.
