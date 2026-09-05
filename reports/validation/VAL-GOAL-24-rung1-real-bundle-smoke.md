# VAL - GOAL 24 Rung 1 Real Bundle Smoke

Date: 2026-07-03

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

## Scope

Owner-approved runtime validation for the first non-mutating real-bundle checkout smoke. This created one Catalog-owned `catalog.bundle.v1` target bundle and then exercised Orders and Payments validation-only endpoints.

## Catalog Target Bundle

Activated through `POST /api/internal/bundles/:bundleId/activate`.

Sanitized result:

```json
{
  "bundleId": "e38ce03c-d18b-40a4-9898-f82a3f77dc0b",
  "status": "active",
  "contractVersion": "catalog.bundle.v1",
  "itemProductIds": [
    "8edc51f2-bed2-433f-8a3c-5738b49a02e1",
    "dfd1001e-f2e3-4909-be87-6ae9546457dc"
  ],
  "validation": { "state": "valid", "blockers": [] },
  "idempotencyReplayed": false
}
```

The bundle uses `visibility.scope=catalog_internal`, no SKU, no stock, no channel publication, and no checkout-capable visibility.

## Orders Validator

Result: HTTP `201`. Sanitized response included:

```json
{
  "success": true,
  "data": {
    "valid": true,
    "mutation": false,
    "orderCreated": false,
    "warehouseMutation": false,
    "eventPublished": false,
    "channel": "flipflop",
    "externalOrderId": "goal24-rung1-real-bundle-e38ce03c-20260703",
    "itemCount": 2,
    "total": 300,
    "currency": "CZK",
    "bundleEvidenceCount": 1,
    "idempotencyStatus": "available",
    "existingOrderId": null
  }
}
```

## Payments Validator

In-pod `POST /payments/validate-create` using runtime `PAYMENT_API_KEY` and `applicationId=flipflop-service`. API key value was not printed.

Result: HTTP `201`. Sanitized response included:

```json
{
  "success": true,
  "data": {
    "valid": true,
    "mutation": false,
    "providerCall": false,
    "applicationId": "flipflop-service",
    "orderId": "goal24-rung1-real-bundle-e38ce03c-20260703",
    "amount": 300,
    "currency": "CZK",
    "paymentMethod": "invoice",
    "callbackOrigin": "https://payments.alfares.cz",
    "successOrigin": "https://payments.alfares.cz",
    "cancelOrigin": "https://payments.alfares.cz"
  }
}
```

## Boundary Decision

No deployment, DB migration, direct DB write, order creation, Warehouse reservation, payment creation, provider call, secret print, customer/provider data dump, marketplace publication, channel visibility, or Kubernetes manifest change was run. The only approved runtime mutation was creation and activation of the single catalog-internal validation bundle.

## State Update

Resolved:

- `[RESOLVED: owner-approved Rung 1 non-mutating real checkout smoke passed against active catalog.bundle.v1 bundle e38ce03c-d18b-40a4-9898-f82a3f77dc0b]`

Still blocked:

- `[RESOLVED: owner-approved Rung 2 live pending-order smoke proved pending Orders create, Warehouse reservation, and payment-status cleanup release for catalog.bundle.v1 bundle 919be990-1c76-4f9c-b100-829281c6a709]`
- `[RESOLVED/NARROWED: Catalog fail-closed external marketplace bundle publication policy defined in docs/contracts/catalog-bundle-marketplace-publication-policy.md]`
- `[RESOLVED/NARROWED: Allegro-owned catalog.bundle.v1 external publication policy handoff recorded as fail-closed in Allegro main 8b05807 / handoff commit 27b5f88]`
- `[RESOLVED/NARROWED: Bazos-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Bazos source policy at Bazos main 9703b0c / source acc0ac9]`
- `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Aukro policy at Aukro main f44d7d7 / source bd86caa]`
- `[RESOLVED/NARROWED: Heureka-owned catalog.bundle.v1 feed publication policy handoff resolved to fail-closed Heureka policy at Heureka main 1cf0f32]`
