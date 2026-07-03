# Catalog Bundle Commerce Contract

```yaml
id: CATALOG-BUNDLE-COMMERCE-CONTRACT
status: accepted-contract-b1-source-implemented
owner: catalog-commerce-integration-owner
created: 2026-07-03
scope: ecosystem bundle identity, presentation, checkout-smoke, and service ownership boundaries
source_goal: implementation-goals/GOAL-24-product-relations.md
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: purchase-derived product relationships should become safe bundle commerce only when product identity, checkout totals, stock reservation, and payment evidence remain owned by the correct services.
- Goal Impact: Goal 24 broad bundle-selling blockers are narrowed into an accepted architecture model plus implementation-gated contracts.
- System: Catalog owns product identity, relation rows, read-only bundle candidates, and future bundle aggregate metadata; FlipFlop owns storefront/cart/checkout UX; Orders owns canonical order identity, line snapshots, totals accepted from channel create requests, idempotency, and order lifecycle; Warehouse owns stock and reservation effects; Payments owns payment creation, provider redirects, status, and reconciliation.
- Feature: standalone Catalog bundle aggregate contract for future bundle selling, with fail-closed smoke and presentation rules.
- Task: define the recommended model, rejected alternatives, per-service contract boundaries, smoke scope, presentation policy, parallel workstreams, and remaining blockers.
- Execution Plan: documentation-only contract decision in Catalog; no source, migration, deployment, order/payment/stock mutation, marketplace publication, or real checkout mutation.
- Coding Prompt: do not make Payments pricing truth, do not make Catalog a checkout/stock owner, do not create bundle SKUs until explicitly approved, and record missing runtime approvals with `[MISSING: ...]`.
- Code: this contract, `docs/contracts/catalog-bundle-aggregate-v1.md`, and Goal 24 documentation/state updates only.
- Validation: `git diff --check`; focused source tests/builds are not required because only Markdown docs changed.
- State Update: the Catalog bundle ownership decision is accepted as a standalone aggregate model, while implementation and live side effects remain gated.

## Accepted Decision

Recommended model: Catalog-owned standalone bundle aggregate.

B1 design artifact: `docs/contracts/catalog-bundle-aggregate-v1.md` defines the owner-ready `catalog.bundle.v1` API/persistence proposal. It keeps the accepted standalone aggregate model, rejects SKU/read-only alternatives for v1 selling, and gates source implementation on owner acceptance plus downstream Orders/Warehouse/Payments/FlipFlop contracts.

The first ecosystem bundle-selling model should be a Catalog aggregate that references existing sellable Catalog product IDs and exposes deterministic metadata for storefront/channel consumers. It is not a Catalog product row, not a SKU, not a stock item, and not a payment price record in its first version.

Minimum future aggregate identity:

```json
{
  "bundleId": "catalog-bundle-uuid",
  "contractVersion": "catalog.bundle.v1",
  "status": "draft|active|archived",
  "source": "order_affinity|manual|campaign",
  "productIds": ["catalog-product-id-1", "catalog-product-id-2"],
  "presentation": {
    "displayName": "Bundle display name",
    "pricePolicy": "checkout_authoritative",
    "discountPolicyRef": "bundle-discount-policy-id-or-null",
    "freeShippingPolicyRef": "shipping-policy-id-or-null"
  },
  "evidence": {
    "relationSource": "marketing_order_affinity",
    "candidateId": "non-sensitive-candidate-id"
  }
}
```

The current `GET /api/products/:productId/bundle-candidates` endpoint remains read-only candidate metadata. A candidate ID is not a durable `bundleId` and must not be sent to Orders, Warehouse, or Payments as sellable bundle identity until a future Catalog aggregate API is implemented and validated.

## Rejected Alternatives

Read-only candidate only as the long-term model is rejected for real selling. It is safe for display and operator discovery, but it cannot carry lifecycle, policy refs, or a stable identity for idempotency, smoke evidence, or future channel governance.

Product-like SKU in Catalog is rejected for the first implementation. It would require Warehouse stock identity, reservation semantics, SKU/pricing rules, return handling, and channel publication behavior that do not exist yet. A bundle SKU can be reconsidered only after standalone aggregate selling is proven and Warehouse explicitly accepts bundle stock semantics.

FlipFlop-local intent as the ecosystem contract is rejected. FlipFlop GOAL-13 proves one storefront path can submit identifiers and recompute totals server-side, but it does not define Catalog aggregate ownership, Orders bundle identity, Warehouse stock effects, or Payments metadata policy for other channels.

Payments-owned bundle pricing is rejected. Payments receives final amount/currency from the checkout/order owner and may store bounded metadata for reconciliation, but it must not calculate discounts, free shipping, bundle eligibility, or Catalog prices.

Warehouse-owned bundle identity is rejected. Warehouse reserves product lines and owns stock effects; it should not become product-content or merchandising owner for bundle definitions.

## Service Contracts

Catalog:

- Owns read-only bundle candidates today and the future standalone `catalog.bundle.v1` aggregate.
- Must keep current product price evidence as presentation-only unless a checkout/Orders contract applies it.
- Must fail closed when current prices, currency, policy refs, or product visibility are missing.
- Must not create order rows, carts, payments, reservations, marketplace offers, or product-like bundle SKUs in this phase.

FlipFlop:

- May continue using the local product-detail bundle intent path that submits product identifiers only and recomputes monetary effects server-side.
- Must treat Catalog `bundle-candidates` as display/input evidence, not as final totals.
- Future ecosystem bundle checkout should submit a `bundleId` plus product lines only after Catalog aggregate implementation exists.

Orders:

- Current accepted create-order contract remains normal item lines with canonical Catalog `productId`, quantities, prices, totals, and optional `warehouseId`.
- Future bundle support should be additive metadata, not a replacement for normal item lines.
- Recommended representation for first ecosystem bundle create: keep each product as a normal order item and add bounded order metadata such as `bundleEvidence: [{ bundleId, contractVersion, productIds, discountPolicyRef, freeShippingPolicyRef, appliedSavings }]`.
- Orders must continue rejecting idempotency conflicts and must not infer bundle eligibility from raw browser claims.

Warehouse:

- First ecosystem bundle selling should reserve each component product line independently through existing reservation lifecycle endpoints.
- Warehouse must not reserve a bundle aggregate or synthetic SKU until a later Warehouse-owned bundle-stock contract exists.
- If any component reservation fails, the order/checkout path must fail closed and compensate already reserved lines through existing release behavior.

Payments:

- Payments receives final `orderId`, `amount`, `currency`, `applicationId`, payment method, callback/success/cancel URLs, customer snapshot, and bounded metadata.
- Allowed bundle metadata is audit evidence only: `bundleIds`, `bundleContractVersion`, `discountPolicyRefs`, `freeShippingPolicyRef`, and `serverTotalSource`.
- Forbidden Payments behavior: recomputing bundle price, applying free shipping, changing order totals, validating Catalog product prices, storing raw Catalog candidate payloads, or using metadata as pricing truth.

## Discount And Free-Shipping Presentation Policy

Catalog and storefronts may present bundle candidates only under these rules:

- Use CZK amount copy such as `Set price candidate` or `Potential savings` only when Catalog has current price evidence for every component and a policy ref is present.
- Use `free-shipping eligible candidate` only when the displayed subtotal crosses a configured threshold and the UI also indicates checkout will confirm the final delivery cost.
- Do not display percentage discounts unless the server-owned checkout policy applies that percentage to the final order total.
- Do not display `free shipping applied`, `you will pay`, `payment total`, or equivalent final-total language from Catalog candidate responses.
- Candidate `suggestedBundlePrice`, `topUpAmount`, and `freeShippingEligible` are merchandising hints until checkout/Orders confirms final totals.
- If price, currency, threshold, policy ref, or product visibility is missing, UI must render neutral related-product copy or suppress the monetary claim.

## Approved Real Checkout Smoke Scope

Fail-closed smoke scope for later validation has two rungs.

Rung 1, ready when credentials are approved, non-mutating:

- FlipFlop product detail/cart/checkout path carries only product IDs or future `bundleId` plus line items.
- Orders `POST /api/orders/validate-create` accepts the intended create-order payload shape and reports no order creation, no item save, no Warehouse mutation, and no event publish.
- Payments `POST /payments/validate-create` accepts the final payment payload shape and returns `mutation=false` and `providerCall=false`.
- Warehouse validation is read-only availability/logistics or source-level reservation verifier only; no `reserve`, `fulfill`, `release`, `cancel`, `expire`, or `return` endpoint is called.
- Evidence must redact tokens, customer data, addresses, payment provider identifiers, raw provider payloads, and private order identifiers.

Rung 2, still gated by explicit owner approval, live create without paid/provider side effects:

- Create exactly one synthetic or owner-approved test checkout using a non-provider/manual pending payment method where available, or stop if no side-effect-safe payment method exists.
- Prove local order total, central Orders total, and payment validation amount match before any provider redirect or webhook.
- Warehouse reservation may be exercised only if the owner approves stock hold/release side effects and the test plan includes immediate release/cancel evidence.
- Do not mark paid, simulate provider webhooks, fulfill stock, decrement stock, issue refunds, publish marketplace offers, or mutate real customer data.

Anything beyond Rung 2 is now contract-approved but runtime-gated by `docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md`. The prior broad blocker is narrowed to `[RESOLVED/NARROWED: owner-approved paid/provider checkout implementation contract defined in docs/contracts/catalog-bundle-paid-provider-channel-implementation-contract.md]`; live paid/provider execution still remains blocked by missing target, payment mode, stock window, provider-status, refund/cancel, and rollback facts.

Rung 2 owner-approved evidence completed on 2026-07-03: one pending two-line Orders create over active Catalog bundle `919be990-1c76-4f9c-b100-829281c6a709` reserved both Warehouse component lines, then Payments-owned cancelled status released both reservations back to baseline. This proves pending-order/reservation mechanics only; it does not approve paid/provider checkout, fulfillment, refunds, external marketplace publication, or channel-visible bundle selling.


## 2026-07-03 Catalog Source Implementation Update

Catalog B1.1 source implementation is complete on branch `goal24-catalog-bundle-api`: additive bundle aggregate tables, protected API/service, idempotency conflict handling, fail-closed activation, and focused tests. Runtime migration/deploy/smoke remain owner-gated.

## Remaining Blockers

- `[RESOLVED: Catalog standalone bundle aggregate API and persistence contract design owner-ready in docs/contracts/catalog-bundle-aggregate-v1.md]`
- `[RESOLVED: owner accepted catalog.bundle.v1 source implementation gate in Codex thread on 2026-07-03]`
- `[RESOLVED: Catalog additive migration/API source implemented for catalog.bundle.v1 in branch goal24-catalog-bundle-api]`
- `[RESOLVED: owner-approved Catalog bundle aggregate migration application/deploy/runtime smoke]`
- `[RESOLVED: Orders additive bundleEvidence metadata contract on create-order and idempotent replay merged in Orders commit 18892a5]`
- `[RESOLVED: Warehouse component-line reservation sign-off merged in Warehouse commit ae8c8fe and retained on main 74870b0]`
- `[RESOLVED: Payments bounded bundle metadata allowlist test covering free-shipping evidence merged in Payments commit aa79fa2]`
- `[RESOLVED: owner-approved Rung 1 non-mutating real checkout smoke passed against active catalog.bundle.v1 bundle e38ce03c-d18b-40a4-9898-f82a3f77dc0b]`
- `[RESOLVED: owner-approved Rung 2 live pending-order smoke proved pending Orders create, Warehouse reservation, and payment-status cleanup release for catalog.bundle.v1 bundle 919be990-1c76-4f9c-b100-829281c6a709]`
- `[RESOLVED/NARROWED: Catalog fail-closed external marketplace bundle publication policy defined in docs/contracts/catalog-bundle-marketplace-publication-policy.md]`
- `[RESOLVED/NARROWED: Allegro-owned catalog.bundle.v1 external publication policy handoff recorded as fail-closed in Allegro main 8b05807 / handoff commit 27b5f88]`
- `[RESOLVED/NARROWED: Bazos-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Bazos source policy at Bazos main 9703b0c / source acc0ac9]`
- `[RESOLVED/NARROWED: Aukro-owned catalog.bundle.v1 external publication policy handoff resolved to fail-closed Aukro policy at Aukro main f44d7d7 / source bd86caa]`
- `[RESOLVED/NARROWED: Heureka-owned catalog.bundle.v1 feed publication policy handoff resolved to fail-closed Heureka policy at Heureka main 1cf0f32]`

## Parallel Execution

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 Catalog aggregate design | owner-ready | Catalog commerce architect | Define `catalog.bundle.v1` aggregate DTO/API/persistence plan | `docs/contracts/catalog-bundle-aggregate-v1.md` and linked Goal 24 docs | migrations/source until plan accepted | this contract | `git diff --check` for docs | Design resolves API/persistence contract shape; source implementation remains gated. |
| B2 Orders metadata contract | ready now | Orders contract worker | Add docs/tests for additive `bundleEvidence` metadata while preserving item lines | Orders contract docs/verifiers | DB migrations, live create mutation | B1 identity draft | create-order verifier/build when changed | Must not replace normal item rows. |
| B3 Warehouse component reservation sign-off | ready now | Warehouse reservation owner | Document component-line reservation as v1 bundle stock behavior | Warehouse docs/tests if needed | stock mutation, migration, deploy | B1/B2 draft | reservation verifier/build when changed | Keep synthetic SKU blocked. |
| B4 Payments metadata allowlist | ready now | Payments boundary owner | Document/test allowed bundle metadata as evidence only | Payments docs/DTO verifier if needed | provider internals, amount calculation | B2 metadata draft | payment validation spec/build when changed | Must preserve `amount` as caller-owned final total. |
| B5 FlipFlop non-mutating smoke harness | dependency-gated | Storefront checkout owner | Run Rung 1 with approved credentials/products | FlipFlop smoke docs/scripts | live paid provider, stock decrement | B1-B4 accepted and credentials approved | non-mutating smoke report | Stop before Rung 2 without owner approval. |
| B6 Final integration | final integration | Commerce integration validator | Reconcile contracts and decide whether to implement source changes | integration report | parallel edits to shared contracts | B1-B5 outputs | cross-repo diff/test evidence | Merge order: Catalog identity, Orders metadata, Warehouse sign-off, Payments allowlist, FlipFlop smoke. |

Shared contracts: this document, `docs/contracts/catalog-product-relations.md`, Orders create-order contract, Warehouse reservation contract, Payments create-payment validation contract, and FlipFlop GOAL-13 bundle intent docs.

Integration owner: Catalog commerce integration owner until a dedicated bundle-selling owner is assigned.

Validation owner: final integration validator.

Merge order: Catalog aggregate contract first, Orders metadata second, Warehouse reservation sign-off third, Payments metadata allowlist fourth, FlipFlop smoke harness fifth, final cross-repo validation last.
