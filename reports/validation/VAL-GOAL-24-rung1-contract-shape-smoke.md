# VAL - GOAL 24 Rung 1 Contract-Shape Smoke

Date: 2026-07-03

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

## Scope

Docs/runtime validation evidence only. This smoke exercised the accepted downstream non-mutating validators for the first ecosystem bundle-selling path without creating Orders, Payments, Warehouse reservations, product rows, Catalog bundle rows, provider calls, or marketplace publications.

This is not a full real-bundle checkout smoke because the deployed Catalog bundle API returned no active `catalog.bundle.v1` aggregate target. The run used two real active Catalog product IDs and a synthetic bundle UUID only to prove downstream validator contract shape.

## Runtime Context

- Catalog current worktree inspected clean, with concurrent `main` at `7f509c2`; canonical checkout was not modified for this validation.
- Kubernetes node `alfares` was `Ready`; Catalog, Orders, Payments, and FlipFlop product-service pods were `1/1` ready.
- Runtime images observed: Catalog `localhost:5000/catalog-microservice:e62bc63`, Orders `localhost:5000/orders-microservice:ad83d15`, Payments `localhost:5000/payments-microservice:579f2c5`, FlipFlop product-service `latest`.
- Catalog bundle API read-only probe returned `[]` for `/api/bundles?status=active&limit=5`.

## Target Evidence

Read-only Catalog product API returned active products including:

- `8edc51f2-bed2-433f-8a3c-5738b49a02e1` / `EAN4893575894`
- `dfd1001e-f2e3-4909-be87-6ae9546457dc` / `ALLEGRO-OFFER-18103829475`

No product or bundle rows were created or updated.

## Orders Validator

Command shape: in-pod `POST http://127.0.0.1:3203/api/orders/validate-create` from the Orders pod, using the runtime `FLIPFLOP_INTERNAL_SERVICE_TOKEN` environment variable in the `x-internal-service-token` header and `x-service-name: flipflop-service`. Token value was not printed.

Result: HTTP `201`. Sanitized response:

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
    "itemCount": 2,
    "total": 300,
    "currency": "CZK",
    "paymentMethod": "validation",
    "shippingMethod": "validation",
    "bundleEvidenceCount": 1,
    "idempotencyStatus": "available",
    "existingOrderId": null
  }
}
```

## Payments Validator

Initial attempt from the Payments pod failed before validation because the container does not include `curl`. Retried with Node's built-in HTTP client.

Second attempt reached the validator but failed with HTTP `400` because the pod default `PAYMENT_APPLICATION_ID=payments-microservice` is not in the create allowlist. Read-only env-shape check showed allowed application IDs include `flipflop-service`; no API key values were printed.

Final command shape: in-pod `POST http://127.0.0.1:3468/payments/validate-create` from the Payments pod, using the runtime `PAYMENT_API_KEY` environment variable in `X-API-Key`. API key value was not printed. Payload used `applicationId=flipflop-service`, `https://payments.alfares.cz` callback/success/cancel origins, amount `300`, currency `CZK`, method `invoice`, and bounded bundle metadata.

Result: HTTP `201`. Sanitized response:

```json
{
  "success": true,
  "data": {
    "valid": true,
    "mutation": false,
    "providerCall": false,
    "applicationId": "flipflop-service",
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

No deployment, DB migration, DB write, Catalog bundle creation, Catalog product mutation, Orders create, Warehouse reservation, Payments create, provider call, secret print, raw customer/provider data dump, marketplace publication, or Kubernetes manifest change was run.

## State Update

Resolved/narrowed:

- `[RESOLVED: owner-approved Rung 1 non-mutating real checkout smoke passed against active catalog.bundle.v1 bundle e38ce03c-d18b-40a4-9898-f82a3f77dc0b]`

Still blocked:

- `[RESOLVED: owner-approved Rung 2 live pending-order smoke proved pending Orders create, Warehouse reservation, and payment-status cleanup release for catalog.bundle.v1 bundle 919be990-1c76-4f9c-b100-829281c6a709]`
- `[RESOLVED/NARROWED: Catalog fail-closed external marketplace bundle publication policy defined in docs/contracts/catalog-bundle-marketplace-publication-policy.md]`
- `[RESOLVED/NARROWED: Allegro-owned catalog.bundle.v1 external publication policy handoff recorded as fail-closed in Allegro main 8b05807 / handoff commit 27b5f88]`
- `[MISSING: Bazos-owned catalog.bundle.v1 external publication policy handoff]`
- `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Aukro policy at Aukro main f44d7d7 / source bd86caa]`
- `[RESOLVED/NARROWED: Heureka-owned catalog.bundle.v1 feed publication policy handoff resolved to fail-closed Heureka policy at Heureka main 1cf0f32]`
