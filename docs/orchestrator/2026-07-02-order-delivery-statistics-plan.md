# Order and Delivery Statistics Plan

Date: 2026-07-02
Parent plan: `orders-microservice/docs/orchestrator/2026-07-02-order-lifecycle-warehouse-status-rollout-plan.md`

## Objective

Catalog/admin surfaces should show product, order, channel, and delivery statistics from Orders without duplicating order lifecycle logic.

## Current Evidence

- Catalog already has product sales statistics backed by Orders.
- Existing dirty work exists around product quality/manual overrides and product relations. This workstream must not overwrite it.

## Workstream

Owner role: Catalog/admin statistics owner
Status: ready after Orders stats endpoints

Allowed files:

- product statistics clients
- admin/frontend statistics components
- docs, tests, validation reports

Forbidden files:

- current product quality/manual override dirty work unless explicitly coordinated
- marketplace content canonical JSON work

## Required Work

1. Consume Orders aggregate endpoints for lifecycle/payment/delivery statistics.
2. Display product-level and channel-level order status metrics.
3. Surface delivery exceptions: not received, returned, delayed, and unfulfilled.
4. Keep Orders as the only lifecycle authority.

## Validation

- admin product page shows Orders-backed sales and lifecycle metrics
- missing Orders stats endpoint is reported as `[MISSING: Orders stats endpoint]`
- frontend handles empty/error states without inventing data

## C1 Catalog Outcome - 2026-07-02

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog/admin operators need product-centric order and delivery visibility while Orders remains lifecycle authority.
- Goal Impact: the product admin statistics panel now handles Orders product sales, order status, and future lifecycle/delivery aggregates in one fail-soft surface.
- System: Catalog reads bounded Orders aggregates only; Orders remains order lifecycle/payment/channel/delivery source of truth.
- Feature: product sales statistics normalization now accepts Orders `byChannel` and `byStatus`; lifecycle/payment/delivery panels render only when product-scoped Orders stats exist.
- Task: C1 Catalog/admin statistics worker.
- Execution Plan: extend existing Goal 17 product statistics bridge/client/UI; do not touch product quality/manual overrides/product relations/local resale/canonical JSON work; no deploy or push.
- Coding Prompt: consume real Orders product aggregate fields when present; report missing lifecycle/delivery aggregate contract as `[MISSING: Orders stats endpoint]`.
- Code: `src/products/products.service.ts`, `services/frontend/lib/api/products.ts`, `services/frontend/app/dashboard/products/[id]/page.tsx`, `src/products/products.service.spec.ts`.
- Validation: `npm test -- --runInBand src/products/products.service.spec.ts`; `git diff --check`; `npm run build`; `cd services/frontend && npm run build`.

Current blocker: `[MISSING: Orders stats endpoint]` for product-scoped lifecycle/payment/delivery aggregates and channel-level lifecycle/delivery exception counts. Catalog must not use global Orders admin lifecycle summaries as product-level evidence.
