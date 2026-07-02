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
