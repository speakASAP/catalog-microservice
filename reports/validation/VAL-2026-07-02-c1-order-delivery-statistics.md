# VAL-2026-07-02 C1 Order And Delivery Statistics

## Scope

C1 Catalog/admin statistics worker for Orders-backed product/order/delivery analytics.

Allowed files touched:

- `src/products/products.service.ts`
- `src/products/products.service.spec.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/dashboard/products/[id]/page.tsx`
- `docs/orchestrator/2026-07-02-order-delivery-statistics-plan.md`
- `docs/orchestrator/STATUS.md`
- `docs/IMPLEMENTATION_STATE.md`

Forbidden areas not touched: product-quality/manual-overrides/product-relations/local-resale/canonical JSON source, migrations, deployment manifests, secret files.

## Intent Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog/admin operators need product-centric visibility into Orders-backed sales, lifecycle, and delivery signals.
- Goal Impact: existing product statistics UI can show real Orders order status rows now and future lifecycle/delivery aggregates when the Orders contract exists.
- System: Orders remains order lifecycle/payment/channel/delivery authority; Catalog remains product truth and read-only consumer.
- Feature: typed fail-soft product order/delivery statistics display.
- Task: C1 Catalog/admin order and delivery statistics worker.
- Execution Plan: extend existing Goal 17 product statistics client/UI only.
- Coding Prompt: do not invent missing Orders lifecycle/delivery data; show `[MISSING: Orders stats endpoint]`.
- Code: source files listed above.
- Validation: commands below.

## Validation Evidence

- `npm test -- --runInBand src/products/products.service.spec.ts` passed: 1 suite, 39 tests.
- `git diff --check` passed.
- `npm run build` passed.
- `cd services/frontend && npm run build` passed with the existing Next.js multiple-lockfile workspace-root warning only.

## Blockers

- `[MISSING: Orders stats endpoint]` for product-scoped lifecycle/payment/delivery aggregates and channel-level delivery exception counts.

## Boundary Check

No order rows, customer data, payment details, delivery addresses, provider payloads, secrets, tokens, Warehouse mutations, Orders mutations, migrations, deploys, or pushes were used. Catalog does not call global Orders admin lifecycle summaries as product-level facts.
