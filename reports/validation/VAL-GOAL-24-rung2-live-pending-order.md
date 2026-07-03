# VAL-GOAL-24 Rung 2 Live Pending-Order Evidence

Date: 2026-07-03
Owner: Catalog Goal 24 integration validator
Scope: Catalog-owned documentation of an owner-approved live pending-order smoke across Catalog, Orders, Warehouse, and Payments runtime contracts.

## Intent Preservation Chain

Vision -> purchase-derived product relationships can become safe bundle commerce only when product identity, order lines, stock holds, and payment cleanup stay service-owned.
Goal Impact -> the stale Rung 2 pending-order blocker is resolved for pending/manual validation only.
System -> Catalog owns `catalog.bundle.v1` identity; Orders owns order rows and line snapshots; Warehouse owns component-line reservations; Payments owns payment status cleanup.
Feature -> owner-approved live pending-order smoke with immediate Warehouse release.
Task -> create one active internal validation bundle over stocked products, validate the Orders payload, create one pending order, prove reservation, set payment status to cancelled, and prove reservation release.
Execution Plan -> use runtime service tokens only inside pods, redact order identity, query aggregate stock/reservation counts, and stop before paid/provider/fulfillment behavior.
Coding Prompt -> do not print token values, raw order id, customer data, provider payloads, marketplace rows, or secret material.
Code -> no source code changed; report-only reconciliation in Catalog.
Validation -> HTTP and DB readback evidence below plus `git diff --check` for docs.
State Update -> Rung 2 pending-order blocker resolved; paid/provider checkout remains blocked.

## Catalog Bundle Target

Created and activated through the protected Catalog bundle API before the order smoke:

```json
{
  "bundleId": "919be990-1c76-4f9c-b100-829281c6a709",
  "contractVersion": "catalog.bundle.v1",
  "source": "manual",
  "status": "active",
  "visibilityScope": "catalog_internal",
  "validationState": "valid",
  "blockers": [],
  "productIds": [
    "ce4a51aa-2d12-4ab7-a965-7a36609d01fc",
    "dbc51dde-fc66-4511-b178-f929183f4647"
  ]
}
```

Both products had Warehouse stock in `c0de0000-0000-4000-8000-000000000013` before the live create:

```text
ce4a51aa-2d12-4ab7-a965-7a36609d01fc|quantity=118|reserved=0|available=118
dbc51dde-fc66-4511-b178-f929183f4647|quantity=108|reserved=0|available=108
```

## Orders Create Evidence

Orders runtime calls were made from the Orders pod with `x-service-name=flipflop-service` and the runtime `FLIPFLOP_INTERNAL_SERVICE_TOKEN`. Token value was not printed.

`POST /api/orders/validate-create` returned HTTP `201` for the exact payload later used by live create.

`POST /api/orders` returned HTTP `201` and the sanitized response evidence was:

```json
{
  "stage": "created",
  "validateHttpStatus": 201,
  "createHttpStatus": 201,
  "orderIdHash": "d5da31a627220cc3",
  "orderStatus": "pending",
  "paymentStatus": "pending",
  "itemCount": 2,
  "bundleEvidenceCount": 1,
  "bundleContractVersion": "catalog.bundle.v1",
  "warehouseHandoffStatus": "reserved",
  "warehouseReservedCount": 2,
  "warehouseFailedCount": 0
}
```

Warehouse readback after create:

```text
reservations: active|2|2
ce4a51aa-2d12-4ab7-a965-7a36609d01fc|quantity=118|reserved=1|available=117
dbc51dde-fc66-4511-b178-f929183f4647|quantity=108|reserved=1|available=107
```

## Cleanup Evidence

Cleanup used Orders `PUT /api/orders/:id/payment-status` with `orders.payment-status.v1`, `status=cancelled`, `x-service-name=payments-microservice`, and runtime `PAYMENTS_INTERNAL_SERVICE_TOKEN`. Token value and raw order id were not printed.

```json
{
  "stage": "cleanup-payment-status",
  "httpStatus": 200,
  "orderIdHash": "d5da31a627220cc3",
  "orderStatus": "pending",
  "paymentStatus": "cancelled",
  "warehouseHandoffStatus": "released",
  "warehouseReservedCount": 2,
  "warehouseFailedCount": 0
}
```

Warehouse readback after cleanup:

```text
reservations: released|2|2
ce4a51aa-2d12-4ab7-a965-7a36609d01fc|quantity=118|reserved=0|available=118
dbc51dde-fc66-4511-b178-f929183f4647|quantity=108|reserved=0|available=108
```

The central Orders row remains as a validation artifact with `paymentStatus=cancelled`; the Warehouse hold was released and no provider payment or fulfillment path was exercised.

## Non-Goals And Guardrails

No paid/provider webhook, fulfillment, stock decrement, refund, marketplace publication, channel visibility, Kubernetes manifest change, deployment, migration, secret value, raw order id, customer/address/payment-provider payload, or Catalog product-relation mutation occurred.

## State Update

Resolved:

- `[RESOLVED: owner-approved Rung 2 live pending-order smoke proved pending Orders create, Warehouse reservation, and payment-status cleanup release for catalog.bundle.v1 bundle 919be990-1c76-4f9c-b100-829281c6a709]`

Still blocked:

- `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]`
- `[RESOLVED/NARROWED: Allegro-owned catalog.bundle.v1 external publication policy handoff recorded as fail-closed in Allegro main 8b05807 / handoff commit 27b5f88]`
- `[MISSING: Bazos-owned catalog.bundle.v1 external publication policy handoff]`
- `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Aukro policy at Aukro main f44d7d7 / source bd86caa]`
- `[RESOLVED/NARROWED: Heureka-owned catalog.bundle.v1 feed publication policy handoff resolved to fail-closed Heureka policy at Heureka main 1cf0f32]`
