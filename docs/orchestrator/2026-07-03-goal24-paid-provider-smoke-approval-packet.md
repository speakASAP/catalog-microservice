# Goal 24 Paid/Provider Smoke Approval Packet

```yaml
id: GOAL24-PAID-PROVIDER-SMOKE-APPROVAL-PACKET
status: draft-owner-input-required
owner: catalog-commerce-integration-owner
created: 2026-07-03
scope: required owner inputs before any catalog.bundle.v1 paid/provider checkout smoke with stock and rollback effects
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: `catalog.bundle.v1` can move toward paid/provider checkout only when product identity, order state, payment provider effects, and Warehouse stock effects remain owned by the correct services.
- Goal Impact: the broad paid/provider blocker is now an explicit owner approval packet instead of an ambiguous runtime request.
- System: Catalog owns bundle identity; FlipFlop/channel owns checkout initiation; Orders owns order identity and lifecycle state; Payments owns provider payment/refund/cancel effects; Warehouse owns component-line stock reservation/fulfillment/reversal; channel services own marketplace/feed publication policy.
- Feature: owner approval packet for a future paid/provider smoke.
- Task: define mandatory inputs, rollback proof, stop conditions, evidence redaction, owner roles, and parallel source-verifier lanes.
- Execution Plan: documentation-only integration artifact. Do not run provider calls, checkout, order creation, Warehouse reservation/fulfillment/release, Payments mutation, channel/feed/listing mutation, migration, deploy, secret read, or production data mutation from this packet.
- Coding Prompt: keep every unavailable fact as `[MISSING: ...]`; do not infer live approval from source-policy merges.
- Code: this document plus Catalog status entry only.
- Validation: `git diff --check` and marker audit.
- State Update: paid/provider runtime remains blocked until every required input is filled and owner-approved.

## Required Owner Inputs

The following fields must be filled before any live or sandbox paid/provider smoke is executable:

| Field | Required value | Current state |
| --- | --- | --- |
| `approvalId` | non-secret owner approval id for this exact smoke window | `[MISSING: approvalId]` |
| `approvalWindow` | exact date, start/end time, timezone, maximum duration, and allowed retry count | `[MISSING: approvalWindow]` |
| `checkoutOwner` | service/person that initiates the checkout | `[MISSING: checkoutOwner]` |
| `targetBundleId` | active `catalog.bundle.v1` bundle id approved for this smoke only | `[MISSING: targetBundleId]` |
| `componentProductIds` | exact component Catalog product ids and quantities | `[MISSING: componentProductIds]` |
| `warehousePlan` | warehouse id(s), max hold quantity, release/fulfill/reversal path | `[MISSING: warehousePlan]` |
| `paymentProvider` | provider, method, sandbox/live mode, success URL, cancel URL, callback/webhook route, maximum amount, and currency | `[MISSING: paymentProvider]` |
| `providerSuccessEvidence` | webhook/callback/provider fixture proving paid success without manual state bypass | `[MISSING: providerSuccessEvidence]` |
| `providerCancelEvidence` | provider-side cancellation path before completed payment, if applicable | `[MISSING: providerCancelEvidence]` |
| `refundPlan` | completed-payment refund path, max amount, provider rollback operation, and evidence policy | `[MISSING: refundPlan]` |
| `ordersRollbackPlan` | payment-status/order-status transitions and idempotency keys | `[MISSING: ordersRollbackPlan]` |
| `warehouseRollbackPlan` | release/cancel/return mapping for active and fulfilled component reservations | `[MISSING: warehouseRollbackPlan]` |
| `centralOrdersUuidProof` | proof active checkout passes central Orders UUID to Payments | `[MISSING: centralOrdersUuidProof]` |
| `paymentsOrdersTokenProof` | runtime proof Payments can call Orders with expected service role | `[MISSING: paymentsOrdersTokenProof]` |
| `evidenceRedactionPolicy` | prohibited fields and allowed aggregate/hash evidence | `[MISSING: evidenceRedactionPolicy]` |
| `hardStopAuthority` | named owner/operator authorized to stop the run before the next side effect | `[MISSING: hardStopAuthority]` |
| `stopConditions` | exact failures that stop before next side effect | `[MISSING: stopConditions]` |

## Non-Approval Boundaries

This packet does not approve:

- provider charge, capture, refund, webhook simulation, or payment status mutation;
- Warehouse reservation, release, fulfillment decrement, cancel, return, or stock hold;
- Orders create/status mutation;
- FlipFlop/channel checkout submission;
- external marketplace listing/feed mutation;
- deployment, migration, secret read, raw provider payload output, customer/address/payment data output, or token printing.


## Sanitized Evidence Policy

Allowed evidence in the final report:

- non-secret approval id;
- approved test-window timestamps;
- service names and commit ids;
- endpoint names and HTTP status codes;
- approved target `bundleId`, or a redacted/hash reference if the owner marks it private;
- aggregate item counts, reservation counts, and final statuses;
- redacted or hashed central order/payment references;
- boolean token presence and role checks without token values;
- provider method and environment label only when approved.

Forbidden evidence:

- token values, API keys, webhook secrets, provider credentials, decoded JWTs, card data, bank data, raw customer name/email/address/phone, raw provider payloads, raw payment webhooks, raw order request/response bodies, raw DB rows, screenshots containing private data, marketplace account ids, or logs containing private identifiers.

If any forbidden evidence would be required to prove success, the smoke must stop before the live provider/payment step and record `[MISSING: sanitized evidence path for required proof]`.

## Rollback Runbook

### Stock Rollback

1. Capture sanitized pre-run component stock/reservation aggregate counts only if approved.
2. Allow Warehouse reservation only through Orders-owned component-line handoff.
3. On provider cancel/failure before fulfillment, require Orders/Payments mapping to Warehouse `release`, `cancel`, or `expire` for every active component reservation.
4. On provider success/paid transition, require Orders mapping to Warehouse `fulfill` for every component reservation before any fulfillment order claim is considered complete.
5. On refund/cancel after fulfillment, require an owner-approved business event that maps to Warehouse `cancel` or `return`; do not invent refund-to-stock behavior.
6. Verify cleanup by aggregate status/count readback only; do not print raw reservation rows or customer/order payloads.

### Refund/Cancel Rollback

1. Payments owns provider rollback. The packet must name the selected provider operation: cancel, void, refund, reversal, or `[MISSING: provider rollback operation]`.
2. If the payment reaches completed/provider-paid status, `POST /payments/:paymentId/refund` is real provider-side money movement and requires explicit owner approval in this packet.
3. If the provider supports unpaid cancellation/void, the packet must name the exact route/tool and evidence that it does not capture funds.
4. Provider webhook simulation or manual paid/cancelled status bypass is forbidden unless a separately approved provider fixture contract exists.
5. Payments must send only bounded status to Orders: `completed`, `failed`, or `cancelled` through `orders.payment-status.v1`; refunds need a separate approved correction/refund workflow.

## Required Stop Order

Any future smoke must stop before the next side effect when one of these checks fails:

1. Approval packet is incomplete or expired.
2. Target bundle is not active or component ids/quantities differ from the approved packet.
3. Checkout cannot prove central Orders UUID propagation to Payments.
4. Payments cannot prove selected provider success/cancel/refund semantics without manual state bypass.
5. Warehouse cannot map every component reservation to approved release/fulfill/cancel/return behavior.
6. Evidence redaction cannot be guaranteed.
7. Any owner service reports dirty, unmerged, or unvalidated source relevant to the smoke.
8. Central Orders UUID proof is missing or Payments receives a local/legacy order id.
9. Payments Orders service-token role proof is absent or unverified.
10. Amount/currency differs between checkout, Orders, and Payments validation.
11. Provider redirect, webhook, refund, or cancel evidence would require forbidden raw payloads or secrets.
12. Warehouse reservation count differs from expected component count or any cleanup step fails.

## Active Source-Only Workstreams

| Workstream | Thread | Status | Objective |
| --- | --- | --- | --- |
| Orders UUID/token verifier | `019f292b-431d-7f80-8956-73a732f750e3` | started | Prove or keep blocked central Orders UUID propagation and Orders/Payments status mapping. |
| Payments provider rollback contract | `019f292b-6f1a-74f0-9cc1-4dd6246840b1` | started | Prove or keep blocked provider-specific success/cancel/refund rollback contract. |
| Heureka channel fail-closed envelope | `019f292b-a487-7850-946a-9f0533e8e0e2` | started | Prove fail-closed non-mutating channel policy envelope for `catalog.bundle.v1`. |


## Dependency Map

| Workstream | Status | Owner role | Objective | Allowed files/repos | Forbidden actions | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Catalog approval packet | active here | Catalog commerce integration owner | Maintain this packet, blockers, merge order, and sanitized evidence policy | Catalog docs/orchestrator/status only | source behavior, deploy, DB, provider, stock, marketplace mutation | current Goal 24 cross-service handoffs | `git diff --check`, marker audit | Catalog remains integration owner until a dedicated smoke owner is assigned. |
| FlipFlop durable bundleId checkout gate | dependency-gated | FlipFlop checkout owner | Prove checkout accepts durable Catalog `bundleId` or explicitly scope smoke to existing local bundle intent | FlipFlop Goal 24 docs/verifier/source-policy | live checkout, provider redirects, order/payment/stock mutation | owner packet fields, Catalog target bundle | FlipFlop `verify:paid-provider-bundle-checkout-gate` | Current FlipFlop gate says runtime remains blocked. |
| Orders central UUID and lifecycle bridge | dependency-gated | Orders lifecycle owner | Prove central Orders UUID flows to Payments and `orders.payment-status.v1` maps status to Warehouse effects | Orders docs/verifiers/source-policy | raw provider payloads, unapproved cancellations/refunds | Payments status bridge token proof | Orders payment-boundary/warehouse-handoff verifiers | Existing route allows Payments service role; runtime proof remains missing. |
| Warehouse component stock rollback | dependency-gated | Warehouse reservation owner | Approve component-line hold/release/fulfill/cancel/return rollback for target bundle | Warehouse docs/verifiers/source-policy | aggregate bundle stock identity, live stock mutation without packet | Orders lifecycle mapping, stock window approval | Warehouse bundle component reservation validation | Warehouse approves component-line semantics only. |
| Payments provider rollback | blocked | Payments provider/refund owner | Name provider method, provider rollback operation, webhook/callback proof, and refund/cancel limits | Payments docs/verifiers/source-policy | provider calls, live payment creation/refund without packet | owner provider selection and max amount | Payments paid-provider rollback readiness | Current Payments readiness says paid/provider remains blocked. |
| Final live smoke integration | final integration | runtime validation owner `[MISSING: assigned owner]` | Execute one approved live run and sanitized report | approved runbook/report only | any side effect outside packet | all workstreams complete and owner-approved | `[MISSING: approved live smoke validation]` | Stop on first hard stop condition. |

Shared contracts: this packet, Catalog `catalog.bundle.v1` contracts, FlipFlop paid/provider checkout gate, Orders create/payment-status contracts, Warehouse component reservation contract, Payments create/status/refund contracts.

Integration owner: Catalog commerce integration owner until `[MISSING: dedicated paid/provider smoke owner]` is resolved.

Validation owner: `[MISSING: runtime validation owner for live paid/provider bundle smoke]`.

Merge order: Catalog packet -> FlipFlop durable bundleId/checkout gate -> Orders central UUID/status bridge runtime proof -> Warehouse stock rollback plan -> Payments provider rollback plan -> final owner-approved smoke packet execution.

## 2026-07-03 Upstream Packet Reconciliation

Catalog consumed the latest upstream evidence as dependency-gated integration input:

| Owner packet | Evidence consumed | Catalog reconciliation decision |
| --- | --- | --- |
| Orders | `62f5d62` merged cancel/cleanup rollback gate | Source choreography is narrowed, but provider refund/cancel proof and owner-approved cancellation cleanup inputs remain required. |
| Warehouse | `3043cad` on `origin/main` source-verifies component-line hold/release/fulfill/cancel/return plus cleanup operation matrix | Component-line lifecycle and cleanup operation-selection semantics are narrowed to source evidence; approved stock window/max quantity and live canary remain missing. |
| FlipFlop | `23a901d` keeps durable `catalog.bundle.v1` `bundleId` as evidence-only and runtime checkout submission blocked | Checkout owner packet remains dependency-gated until approved rollout maps display-only bundle evidence into Orders without changing totals, stock identity, or provider state. |
| Payments | `f9d40a4` records pending Fiobanka QR evidence, owner-approved synthetic completed-callback evidence through `/webhooks/fiobanka`, and a source-only refund/cancel rollback plan | Route-level completion and rollback planning are narrowed as dependency-gated evidence; real bank-originated signature evidence or approved selected-provider fixture plus provider-specific refund/cancel/reversal execution approval remain missing. |

Exact next required owner packet before any live paid/provider smoke: a single owner-approved run packet naming `approvalId`, `approvalWindow`, `checkoutOwner`, active `targetBundleId`, component product ids/quantities, Warehouse stock window/max quantity, selected provider/method/environment/max amount, provider completion evidence, provider refund/cancel/reversal operation, Orders cancellation actor/reason/side-effect acknowledgements, Warehouse cleanup operation for reserved/fulfilled/partial states, active checkout central Orders UUID proof, Payments Orders service-token proof, evidence redaction policy, hard-stop authority, dedicated smoke owner, and runtime validation owner.

## Current Decision

Runtime paid/provider bundle progression remains blocked on `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]` until this packet is complete, owner-approved, and validated by the owning services. Additional unresolved packet fields: `[MISSING: target active catalog.bundle.v1 bundle id approved for paid/provider smoke]`, `[MISSING: approved payment method/provider mode and maximum amount for paid/provider smoke]`, `[MISSING: runtime verification of Payments Orders service token/role]`, `[MISSING: hard stop authority for paid/provider smoke]`, `[MISSING: dedicated paid/provider smoke owner]`, and `[MISSING: runtime validation owner for live paid/provider bundle smoke]`.
