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
| `approvalWindow` | start/end time and allowed retry count | `[MISSING: approvalWindow]` |
| `checkoutOwner` | service/person that initiates the checkout | `[MISSING: checkoutOwner]` |
| `targetBundleId` | active `catalog.bundle.v1` bundle id | `[MISSING: targetBundleId]` |
| `componentProductIds` | exact component Catalog product ids and quantities | `[MISSING: componentProductIds]` |
| `warehousePlan` | warehouse id(s), max hold quantity, release/fulfill/reversal path | `[MISSING: warehousePlan]` |
| `paymentProvider` | provider/method, sandbox/live mode, maximum amount, currency | `[MISSING: paymentProvider]` |
| `providerSuccessEvidence` | webhook/callback/provider fixture proving paid success without manual state bypass | `[MISSING: providerSuccessEvidence]` |
| `providerCancelEvidence` | provider-side cancellation path before completed payment, if applicable | `[MISSING: providerCancelEvidence]` |
| `refundPlan` | completed-payment refund path, max amount, provider rollback operation, and evidence policy | `[MISSING: refundPlan]` |
| `ordersRollbackPlan` | payment-status/order-status transitions and idempotency keys | `[MISSING: ordersRollbackPlan]` |
| `warehouseRollbackPlan` | release/cancel/return mapping for active and fulfilled component reservations | `[MISSING: warehouseRollbackPlan]` |
| `centralOrdersUuidProof` | proof active checkout passes central Orders UUID to Payments | `[MISSING: centralOrdersUuidProof]` |
| `paymentsOrdersTokenProof` | runtime proof Payments can call Orders with expected service role | `[MISSING: paymentsOrdersTokenProof]` |
| `evidenceRedactionPolicy` | prohibited fields and allowed aggregate/hash evidence | `[MISSING: evidenceRedactionPolicy]` |
| `stopConditions` | exact failures that stop before next side effect | `[MISSING: stopConditions]` |

## Non-Approval Boundaries

This packet does not approve:

- provider charge, capture, refund, webhook simulation, or payment status mutation;
- Warehouse reservation, release, fulfillment decrement, cancel, return, or stock hold;
- Orders create/status mutation;
- FlipFlop/channel checkout submission;
- external marketplace listing/feed mutation;
- deployment, migration, secret read, raw provider payload output, customer/address/payment data output, or token printing.

## Required Stop Order

Any future smoke must stop before the next side effect when one of these checks fails:

1. Approval packet is incomplete or expired.
2. Target bundle is not active or component ids/quantities differ from the approved packet.
3. Checkout cannot prove central Orders UUID propagation to Payments.
4. Payments cannot prove selected provider success/cancel/refund semantics without manual state bypass.
5. Warehouse cannot map every component reservation to approved release/fulfill/cancel/return behavior.
6. Evidence redaction cannot be guaranteed.
7. Any owner service reports dirty, unmerged, or unvalidated source relevant to the smoke.

## Active Source-Only Workstreams

| Workstream | Thread | Status | Objective |
| --- | --- | --- | --- |
| Orders UUID/token verifier | `019f292b-431d-7f80-8956-73a732f750e3` | started | Prove or keep blocked central Orders UUID propagation and Orders/Payments status mapping. |
| Payments provider rollback contract | `019f292b-6f1a-74f0-9cc1-4dd6246840b1` | started | Prove or keep blocked provider-specific success/cancel/refund rollback contract. |
| Heureka channel fail-closed envelope | `019f292b-a487-7850-946a-9f0533e8e0e2` | started | Prove fail-closed non-mutating channel policy envelope for `catalog.bundle.v1`. |

## Current Decision

Runtime paid/provider bundle progression remains blocked on `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]` until this packet is complete, owner-approved, and validated by the owning services.
