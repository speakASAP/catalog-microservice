# Catalog Bundle Aggregate V1 Contract

```yaml
id: CATALOG-BUNDLE-AGGREGATE-V1
status: owner-ready-design
owner: catalog-commerce-integration-owner
created: 2026-07-03
scope: standalone Catalog bundle aggregate API and persistence proposal
source_goal: implementation-goals/GOAL-24-product-relations.md
upstream:
  - docs/contracts/catalog-bundle-commerce-contract.md
  - docs/contracts/catalog-product-relations.md
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Catalog can expose durable bundle identity for storefront/channel consumers without taking checkout, stock, payment, or marketplace ownership.
- Goal Impact: Goal 24 narrows `[MISSING: Catalog standalone bundle aggregate API and persistence contract]` into an owner-ready `catalog.bundle.v1` design that downstream Orders/Warehouse/Payments/FlipFlop contracts can consume.
- System: Catalog owns bundle identity, component product references, lifecycle metadata, visibility, and policy references; Products/Pricing remain product truth; Orders owns order identity/items/idempotent create; Warehouse owns reservations/stock; Payments owns payment execution; FlipFlop owns checkout UX.
- Feature: standalone bundle aggregate API and persistence design.
- Task: define DTO shape, lifecycle/status transitions, idempotency/visibility rules, fail-closed validation, rejected SKU/read-only alternatives, and downstream handoff requirements.
- Execution Plan: documentation-only contract proposal; no migration, source implementation, runtime mutation, deployment, checkout/payment/warehouse/order change, marketplace publication, or product-like SKU implementation.
- Coding Prompt: keep bundles as aggregate metadata over existing product IDs; preserve normal product lines for selling; record missing downstream facts with `[MISSING: ...]` instead of inventing behavior.
- Code: this contract plus linked Goal 24 contract/status/validation docs only.
- Validation: `git diff --check`; pre-coding scripts remain `[MISSING: scripts/pre_coding_gate.py]` and `[MISSING: scripts/strict_doc_audit.py]` if absent.
- State Update: B1 Catalog aggregate design is owner-ready; runtime implementation remains dependency-gated.

## Accepted Model

`catalog.bundle.v1` is a standalone Catalog aggregate that references existing sellable Catalog products. It is not stored in `products`, does not have a SKU in v1, does not own stock, and does not authorize checkout totals. It exists so storefronts and downstream services can refer to one durable bundle identity while still selling and reserving each component product line normally.

The current `GET /api/products/:productId/bundle-candidates` endpoint remains read-only candidate evidence. A `candidateId` may seed a create request, but it is not a durable `bundleId` and must not be sent to Orders, Warehouse, Payments, or marketplaces as sellable identity.

## Aggregate DTO Shape

Canonical response envelope:

```json
{
  "success": true,
  "data": {
    "bundleId": "uuid",
    "contractVersion": "catalog.bundle.v1",
    "status": "draft",
    "source": "order_affinity",
    "idempotencyKey": "catalog.bundle.v1:order_affinity:source:target:policy:v1",
    "items": [
      { "productId": "uuid", "quantity": 1, "position": 1, "role": "component" },
      { "productId": "uuid", "quantity": 1, "position": 2, "role": "component" }
    ],
    "presentation": {
      "displayName": "Starter set",
      "description": null,
      "pricePolicy": "checkout_authoritative",
      "discountPolicyRef": "bundle-discount-policy-id-or-null",
      "freeShippingPolicyRef": "shipping-policy-id-or-null",
      "currencyHint": "CZK"
    },
    "visibility": {
      "scope": "catalog_internal|storefront|channel",
      "channels": ["flipflop"],
      "startsAt": null,
      "endsAt": null
    },
    "evidence": {
      "relationSource": "marketing_order_affinity",
      "candidateId": "order_affinity:source:target",
      "sourceRunId": "non-sensitive-run-id"
    },
    "validation": { "state": "valid|blocked", "blockers": [] },
    "createdAt": "2026-07-03T00:00:00.000Z",
    "updatedAt": "2026-07-03T00:00:00.000Z",
    "archivedAt": null
  }
}
```

Create request shape:

```json
{
  "contractVersion": "catalog.bundle.v1",
  "idempotencyKey": "catalog.bundle.v1:manual:summer-starter:1",
  "source": "manual",
  "items": [
    { "productId": "uuid", "quantity": 1, "position": 1 },
    { "productId": "uuid", "quantity": 1, "position": 2 }
  ],
  "presentation": {
    "displayName": "Starter set",
    "description": null,
    "pricePolicy": "checkout_authoritative",
    "discountPolicyRef": null,
    "freeShippingPolicyRef": null,
    "currencyHint": "CZK"
  },
  "visibility": { "scope": "catalog_internal", "channels": [], "startsAt": null, "endsAt": null },
  "evidence": { "candidateId": "optional-non-sensitive-candidate-id" }
}
```

Field rules:

- `contractVersion` must equal `catalog.bundle.v1`.
- `bundleId` is server-generated UUID and is the only durable bundle identity.
- `idempotencyKey` is required on create and unique within `contractVersion`; replay with the same normalized request returns the existing aggregate, while replay with different normalized content fails with `409 idempotency_conflict`.
- `source` is one of `manual`, `order_affinity`, or `campaign` in v1.
- `items` must contain 2 to 10 unique visible Catalog product IDs; `quantity` defaults to `1` and must be an integer from `1` to `99`; `position` defines stable display order.
- `presentation.pricePolicy` must be `checkout_authoritative` in v1. Catalog may carry policy refs and currency hints but never final payable totals.
- `evidence` must be non-sensitive JSON. It must not contain customer, address, payment provider, raw marketplace, token, or secret payloads.

## API Proposal

All mutation endpoints are protected by the existing `CatalogAuthGuard` and restricted to catalog/platform admins or approved internal service actors.

- `POST /api/internal/bundles`: create or idempotently replay a draft bundle aggregate.
- `GET /api/bundles/:bundleId`: read one visible bundle aggregate.
- `GET /api/bundles?status=&source=&productId=&channel=&limit=&cursor=`: list visible bundle aggregates with deterministic ordering by `updatedAt desc, bundleId asc`.
- `PATCH /api/internal/bundles/:bundleId`: update draft-only presentation, visibility, policy refs, evidence, and item order.
- `POST /api/internal/bundles/:bundleId/activate`: move `draft -> active` after full fail-closed validation.
- `POST /api/internal/bundles/:bundleId/archive`: move `draft|active -> archived`; archive is soft and must not delete historical aggregate rows.

No v1 endpoint creates orders, carts, payments, reservations, marketplace offers, product rows, SKUs, stock records, or price records.

## Persistence Proposal

Recommended additive persistence for a later implementation:

`catalog_bundles`

- `id uuid primary key`
- `contract_version text not null default 'catalog.bundle.v1'`
- `status text not null check in ('draft','active','archived')`
- `source text not null check in ('manual','order_affinity','campaign')`
- `idempotency_key text not null`
- `display_name text not null`
- `description text null`
- `price_policy text not null check price_policy='checkout_authoritative'`
- `discount_policy_ref text null`
- `free_shipping_policy_ref text null`
- `currency_hint char(3) null`
- `visibility jsonb not null default '{"scope":"catalog_internal","channels":[]}'`
- `evidence jsonb not null default '{}'`
- `created_by jsonb null`
- `updated_by jsonb null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `archived_at timestamptz null`
- unique index on `(contract_version, idempotency_key)`

`catalog_bundle_items`

- `bundle_id uuid not null references catalog_bundles(id)`
- `product_id uuid not null references products(id)`
- `quantity integer not null default 1`
- `position integer not null`
- `role text not null default 'component'`
- primary key `(bundle_id, product_id)`
- unique index `(bundle_id, position)`

Optional implementation detail: keep component rows normalized instead of storing `productIds` only in JSONB. Response DTOs may still return ordered `items` and derived `productIds` for consumers.

## Lifecycle And Status

Status meanings:

- `draft`: editable aggregate. It may be shown only to internal/admin consumers unless visibility explicitly allows preview.
- `active`: read-only enough for storefront/channel display and downstream bundle evidence. Activation requires current validation to pass.
- `archived`: hidden from normal list/read unless explicitly requested by admins. It remains available for historical idempotency/audit and must not be hard-deleted by normal automation.

Allowed transitions:

- `draft -> active`
- `draft -> archived`
- `active -> archived`
- `archived -> draft` is rejected in v1. Create a new bundle with a new idempotency key if reactivation semantics are later required.

Activation validation must fail closed when any component product is missing, inactive, not visible to the intended scope, duplicated, outside quantity bounds, missing required current price/currency evidence for a monetary claim, or blocked by missing policy refs needed by presentation text.

## Idempotency, Visibility, And Replay

Create idempotency:

- Normalize item product IDs, quantities, positions, source, policy refs, visibility, and display fields before comparing a replay.
- Same key + same normalized content returns the existing aggregate with `idempotencyReplayed=true`.
- Same key + different normalized content fails with `409 idempotency_conflict`; it must not mutate the existing aggregate.
- Idempotency keys must be caller-supplied and deterministic for generated bundles, such as `catalog.bundle.v1:order_affinity:<sourceProductId>:<targetProductId>:<policyRef>:1`.

Visibility:

- Reads must apply the same Catalog product visibility rules used by product reads. If the actor cannot see every component, the bundle is hidden or returned with `validation.state=blocked` only to privileged internal/admin actors.
- `visibility.scope=channel` requires at least one allowed channel token and must not imply marketplace publication approval.
- Expired visibility windows suppress normal reads; admins may request archived/expired rows explicitly in a future admin-only query.

Replay and determinism:

- List ordering must be deterministic.
- Component ordering must be stable by `position`, then `productId` as a tie-breaker if needed.
- Validation blockers must use stable machine codes, for example `product_not_visible`, `product_inactive`, `current_price_missing`, `currency_mismatch`, `policy_ref_missing`, `sku_model_forbidden`, and `checkout_contract_missing`.

## Fail-Closed Validation

Catalog must reject or block instead of fabricating bundle readiness when facts are missing.

Create/update rejects:

- non-UUID `productId`, duplicate products, self-empty item sets, fewer than 2 or more than 10 components;
- product IDs not found or not visible to the actor;
- quantity outside `1..99`;
- unsupported `contractVersion`, `source`, `status`, `pricePolicy`, or visibility scope;
- final payment/order totals, raw customer/order/payment/provider data, raw marketplace payloads, tokens, or secrets in `evidence`;
- attempts to set SKU, stock quantity, reserved quantity, order totals, payment amount, provider metadata as pricing truth, or marketplace publication IDs as Catalog-owned fields.

Activation blocks:

- any component product inactive, archived, deleted, or outside requested visibility;
- monetary presentation without current price and one currency for every component;
- savings/free-shipping language without a policy ref;
- missing downstream create-order/validate-create contract when an active bundle is requested for checkout-capable visibility.

## Rejected V1 Alternatives

Product-like SKU remains rejected for v1. It would move SKU identity, stock semantics, return handling, reservation behavior, price records, and marketplace publication rules into Catalog before Warehouse/Orders/channels accept those contracts.

Read-only `bundle-candidates` as the long-term sellable model remains rejected. Candidates lack durable lifecycle, idempotency, visibility, policy refs, and replay/audit semantics.

FlipFlop-local bundle intent remains valid as a storefront implementation detail, but it is not the ecosystem aggregate contract. Other channels must not infer durable bundle identity from FlipFlop-local state.

Warehouse-owned or Payments-owned bundle identity remains rejected. Warehouse reserves component product lines; Payments receives final caller-owned amount/currency and bounded evidence only.

## Downstream Handoff Requirements

Orders:

- `[MISSING: Orders additive bundleEvidence metadata contract on create-order and idempotent replay]`
- Preserve normal product item lines with `productId`, quantity, unit price snapshot, currency, and totals.
- Accept optional `bundleEvidence[]` only after it validates `bundleId`, `contractVersion='catalog.bundle.v1'`, product ID set, policy refs, and idempotency replay behavior.
- Never infer eligibility or totals from browser-submitted bundle evidence alone.

Warehouse:

- `[MISSING: Warehouse approval that first ecosystem bundle selling reserves component lines only]`
- Reserve and release each component product line independently through existing reservation lifecycle.
- Do not reserve `bundleId`, synthetic SKU, or aggregate stock in v1.

Payments:

- `[MISSING: Payments bounded bundle metadata allowlist test covering free-shipping evidence without pricing authority]`
- Allow only audit metadata such as `bundleIds`, `bundleContractVersion`, `discountPolicyRefs`, `freeShippingPolicyRef`, and `serverTotalSource`.
- Keep amount/currency caller-owned from checkout/Orders; do not compute discounts or free shipping.

FlipFlop:

- `[MISSING: FlipFlop adoption contract for catalog.bundle.v1 read/display before ecosystem checkout]`
- May read active bundles for display after Catalog aggregate implementation.
- Must submit normal product lines and future `bundleEvidence` only after Orders/Warehouse/Payments contracts are accepted.
- Must keep existing local bundle intent separate from durable Catalog `bundleId` until migration is explicit.

Marketplace/channel services:

- `[MISSING: channel-specific external marketplace bundle publication policies]`
- Must not publish a Catalog bundle as a marketplace listing or offer without a channel-owned publication policy.

## Parallel Execution And Merge Order

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 Catalog aggregate design | owner-ready | Catalog commerce architect | Finalize owner review for this `catalog.bundle.v1` proposal | Catalog contract/goal/status/validation docs | migrations, runtime source, deploy, order/payment/stock/channel repos | accepted bundle commerce contract | `git diff --check` | This file is the handoff artifact. |
| B1.1 Catalog source implementation | dependency-gated | Catalog backend worker | Implement additive bundle API/entity after owner accepts this design | future `src/bundles/*`, migration, focused tests, docs | Orders/Warehouse/Payments/FlipFlop, deploy until approved | owner acceptance of B1 | focused Jest/build/diff | Must preserve no-SKU/no-stock/no-checkout boundary. |
| B2 Orders metadata contract | ready now after B1 review | Orders contract worker | Add create-order `bundleEvidence[]` docs/tests | Orders contract docs/verifiers | DB/runtime mutation unless separately approved | B1 DTO/identity | create-order verifier/build | Preserve normal item lines. |
| B3 Warehouse reservation sign-off | ready now after B1 review | Warehouse reservation owner | Document component-line-only reservation for bundles | Warehouse docs/tests | stock mutation/synthetic SKU | B1/B2 draft | reservation verifier/build | Reject aggregate reservation in v1. |
| B4 Payments metadata allowlist | ready now after B1 review | Payments boundary owner | Add evidence-only metadata allowlist test | Payments DTO/docs/tests | amount calculation/provider internals | B2 evidence shape | payment validation spec/build | Payments is not pricing authority. |
| B5 FlipFlop display/smoke | dependency-gated | Storefront owner | Display active Catalog bundles and run non-mutating smoke | FlipFlop docs/source/tests | paid provider, stock decrement, live order without approval | B1-B4 accepted, credentials approved | non-mutating smoke report | Keep local intent separate. |
| B6 Final integration | final integration | Commerce integration validator | Reconcile contracts and approve source implementation/deploy path | integration reports/status | racing shared contracts | B1-B5 outputs | cross-repo validation | Merge order: B1, Orders, Warehouse, Payments, FlipFlop, integration. |

Shared contracts: this file, `docs/contracts/catalog-bundle-commerce-contract.md`, `docs/contracts/catalog-product-relations.md`, Orders create-order contract, Warehouse reservation contract, Payments create-payment validation contract, and FlipFlop bundle intent docs.

Integration owner: Catalog commerce integration owner until reassigned.

Validation owner: final integration validator.

Merge order: Catalog aggregate identity first, Orders metadata second, Warehouse component reservation sign-off third, Payments metadata allowlist fourth, FlipFlop display/smoke fifth, cross-repo integration last.

## Remaining Blockers

Resolved by this design:

- `[RESOLVED: Catalog standalone bundle aggregate API and persistence contract design owner-ready in docs/contracts/catalog-bundle-aggregate-v1.md]`

Still blocked before runtime selling:

- `[MISSING: owner acceptance of catalog.bundle.v1 design before source implementation]`
- `[MISSING: Catalog additive migration/API implementation for catalog.bundle.v1]`
- `[MISSING: Orders additive bundleEvidence metadata contract on create-order and idempotent replay]`
- `[MISSING: Warehouse approval that first ecosystem bundle selling reserves component lines only]`
- `[MISSING: Payments bounded bundle metadata allowlist test covering free-shipping evidence without pricing authority]`
- `[MISSING: FlipFlop adoption contract for catalog.bundle.v1 read/display before ecosystem checkout]`
- `[MISSING: owner-approved Rung 1 non-mutating real checkout smoke credentials and target products]`
- `[MISSING: owner-approved Rung 2 live pending-order smoke plan if production order/reservation evidence is required]`
- `[MISSING: channel-specific external marketplace bundle publication policies]`
