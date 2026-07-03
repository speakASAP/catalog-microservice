# Goal 24 Paid/Provider Smoke Approval Packet

```yaml
id: GOAL24-PAID-PROVIDER-SMOKE-APPROVAL-PACKET
status: owner-approved-preflight-filled-runtime-hard-stopped
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
| `approvalId` | non-secret owner approval id for this exact smoke window | `GOAL24-PAID-PROVIDER-SMOKE-20260703-CODEX-OWNER-APPROVED-001` |
| `approvalWindow` | exact date, start/end time, timezone, maximum duration, and allowed retry count | `2026-07-03T21:48:12+02:00` through `2026-07-03T23:59:59+02:00`, Europe/Prague, one bounded attempt after all hard stops clear; preflight/read-only checks allowed in current session |
| `checkoutOwner` | service/person that initiates the checkout | FlipFlop checkout/order-service owns initiation; Catalog remains integration packet owner; runtime submission remains hard-stopped until FlipFlop accepts durable Catalog bundle evidence in checkout |
| `targetBundleId` | active `catalog.bundle.v1` bundle id approved for this smoke only | `919be990-1c76-4f9c-b100-829281c6a709`, active, `catalog.bundle.v1`, `catalog_internal`, validation `valid`, blockers `[]` |
| `componentProductIds` | exact component Catalog product ids and quantities | `ce4a51aa-2d12-4ab7-a965-7a36609d01fc` qty `1`; `dbc51dde-fc66-4511-b178-f929183f4647` qty `1` |
| `warehousePlan` | warehouse id(s), max hold quantity, release/fulfill/reversal path | Warehouse `c0de0000-0000-4000-8000-000000000013`; max hold qty `1` per component; readback `available=118/108`, `reserved=0/0`; release before fulfillment, fulfill on paid, cancel/return only through approved post-fulfillment workflow |
| `paymentProvider` | provider, method, sandbox/live mode, success URL, cancel URL, callback/webhook route, maximum amount, and currency | Fiobanka bank-transfer QR, `paymentMethod=fiobanka`, `applicationId=flipflop-service`, CZK, maximum `300 CZK`, callback `/webhooks/fiobanka`; success/cancel URLs must be FlipFlop approved runtime URLs before provider creation `[MISSING: exact success/cancel URLs for the live run]` |
| `providerSuccessEvidence` | webhook/callback/provider fixture proving paid success without manual state bypass | Payments `f9d40a4` records owner-approved synthetic Fiobanka completed callback through `/webhooks/fiobanka` with matched payment completion; real bank-originated signature remains `[MISSING: real Fiobanka bank-originated callback/signature evidence]` |
| `providerCancelEvidence` | provider-side cancellation path before completed payment, if applicable | `[MISSING: Fiobanka provider-side unpaid cancel/void operation or explicit no-provider-cancel policy for pending bank transfer]` |
| `refundPlan` | completed-payment refund path, max amount, provider rollback operation, and evidence policy | `[MISSING: owner-approved Fiobanka refund/reversal execution path and redacted provider evidence]`; Payments refund endpoint is provider-side for completed payments |
| `ordersRollbackPlan` | payment-status/order-status transitions and idempotency keys | Orders `62f5d62`: `completed -> paid/confirm/fulfill`, `failed|cancelled -> release` before fulfillment; post-paid cancellation requires approved cancellation actor/reason/sideEffectsHandled and provider rollback proof; idempotency key prefix `goal24-paid-provider-smoke-20260703-001` |
| `warehouseRollbackPlan` | release/cancel/return mapping for active and fulfilled component reservations | Warehouse `3043cad`: component-line `release` for reserved-only, `fulfill` on paid, `cancel`/`return` only for owner-approved post-fulfillment correction; aggregate bundle stock identity forbidden |
| `centralOrdersUuidProof` | proof active checkout passes central Orders UUID to Payments | FlipFlop source verifier passed for central Orders before payment and Payments using central UUID; durable Catalog `bundleId` checkout path remains `[RESOLVED/NARROWED: FlipFlop main 1b62909 maps durable catalog.bundle.v1 bundleId into Orders bundleEvidence as bounded audit evidence]` |
| `paymentsOrdersTokenProof` | runtime proof Payments can call Orders with expected service role | Payments pod probe used token without printing it; `PATCH /api/orders/00000000-0000-4000-8000-000000000000/payment-status` returned HTTP `404`, `authAccepted=true`, `responseClass=not_found_after_auth` |
| `evidenceRedactionPolicy` | prohibited fields and allowed aggregate/hash evidence | Approved: hashes, statuses, counts, endpoint/status, commit ids, bundle/component ids, aggregate Warehouse counts. Forbidden: token values, raw provider payloads, customer/card/bank data, raw DB rows, raw order/payment ids, secrets |
| `hardStopAuthority` | named owner/operator authorized to stop the run before the next side effect | Owner/operator approval captured in current Codex thread; Catalog integration owner and runtime validation owner must stop at first hard-stop condition. Runtime validation owner remains `[MISSING: named live-run executor]` |
| `stopConditions` | exact failures that stop before next side effect | Stop on expired packet, bundle/component mismatch, amount/currency mismatch, missing central UUID, missing Payments Orders token acceptance, placeholder-only provider proof unless explicitly accepted, missing refund/cancel path, Warehouse aggregate mismatch, raw evidence requirement, dirty owner repo, or FlipFlop durable checkout gate failure |

## 2026-07-03 Owner Approval And Self-Discovered Runtime Facts

Owner approval for self-discovery and bounded verification was captured in the current Codex thread on 2026-07-03. Catalog records the non-secret approval id `GOAL24-PAID-PROVIDER-SMOKE-20260703-CODEX-OWNER-APPROVED-001` for this approval packet only. This approval authorizes filling the packet and running read-only/preflight checks; it does not override the hard stops below when required runtime contracts are still missing.

Discovered target and evidence:

- Target bundle: `919be990-1c76-4f9c-b100-829281c6a709`, active `catalog.bundle.v1`, `catalog_internal`, validation `valid`, blockers `[]`.
- Components: `ce4a51aa-2d12-4ab7-a965-7a36609d01fc` qty `1`; `dbc51dde-fc66-4511-b178-f929183f4647` qty `1`.
- Warehouse read-only aggregate via `CLIPLOT_WAREHOUSE_SERVICE_TOKEN` inside the Warehouse pod, token not printed: both components returned HTTP `200` from `/api/warehouses/logistics/:productId`; warehouse `c0de0000-0000-4000-8000-000000000013`; available/reserved `118/0` and `108/0`; `canReserveFromWarehouse=true` for both.
- Payment method: Fiobanka bank-transfer QR, `applicationId=flipflop-service`, maximum `300 CZK`, callback route `/webhooks/fiobanka`.
- Payments success evidence: Payments `f9d40a4` records synthetic Fiobanka QR creation and owner-approved synthetic completed callback through `/webhooks/fiobanka` without manual payment-state bypass.
- Payments to Orders token proof: in-pod Payments probe did not print the token; fake UUID status update returned HTTP `404` after auth, so the service role was accepted and no order was mutated.
- FlipFlop verifier evidence: `npm run verify:orders-hub-integration` passed; `npm run verify:paid-provider-bundle-checkout-gate` returned `runtimeProgression=blocked`, `catalogBundleIdCheckoutAuthority=false`, and durable bundleId migration `evidence_only_runtime_blocked`.

Hard-stop facts that remain unavailable even after owner approval:

- `[RESOLVED/NARROWED: FlipFlop main 1b62909 maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`.
- `[MISSING: real Fiobanka bank-originated callback/signature evidence beyond the current non-empty-signature placeholder verifier, unless the owner explicitly approves the synthetic Fiobanka fixture as sufficient for this one run]`.
- `[MISSING: Fiobanka provider-side refund/reversal or unpaid cancel/void execution path with redacted evidence]`.
- `[MISSING: named live-run executor/runtime validation owner for the exact side-effectful smoke]`.

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
3. Checkout cannot prove central Orders UUID runtime propagation for the approved target to Payments.
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
| Orders UUID/token verifier | `019f292b-431d-7f80-8956-73a732f750e3` | started | Prove or keep blocked central Orders UUID runtime propagation for the approved target and Orders/Payments status mapping. |
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
| Orders | `a7a6947` merged Warehouse cleanup semantics reconciliation plus central UUID source proof | Source choreography and active checkout central UUID propagation are narrowed, but provider refund/cancel execution proof, runtime target packet evidence, and owner-approved cancellation cleanup inputs remain required. |
| Warehouse | `0b4c41b` on `origin/main` source-verifies component-line hold/release/fulfill/cancel/return plus cleanup operation matrix | Component-line lifecycle and cleanup operation-selection semantics are narrowed to source evidence; approved stock window/max quantity and live canary remain missing. |
| FlipFlop | `1b62909` keeps durable `catalog.bundle.v1` `bundleId` as evidence-only and runtime checkout submission blocked | Checkout owner packet remains dependency-gated until approved rollout maps display-only bundle evidence into Orders without changing totals, stock identity, or provider state. |
| Payments | `1458ffe` records pending Fiobanka QR evidence, owner-approved synthetic completed-callback evidence through `/webhooks/fiobanka`, selected-provider callback evidence, provider rollback packet evidence, Fiobanka pre-completion rollback boundary, and a source-only refund/cancel rollback plan | Route-level completion, selected-provider callback evidence, rollback planning, and Fiobanka pre-completion rollback are narrowed as dependency-gated evidence; real bank-originated signature evidence plus post-completion refund/reversal execution approval remain missing. |

Exact next required owner packet before any live paid/provider smoke: a single owner-approved run packet naming `approvalId`, `approvalWindow`, `checkoutOwner`, active `targetBundleId`, component product ids/quantities, Warehouse stock window/max quantity, selected provider/method/environment/max amount, provider completion evidence, provider refund/cancel/reversal operation, Orders cancellation actor/reason/side-effect acknowledgements, Warehouse cleanup operation for reserved/fulfilled/partial states, runtime checkout packet central Orders UUID proof, Payments Orders service-token proof, evidence redaction policy, hard-stop authority, dedicated smoke owner, and runtime validation owner.

## Current Decision

Runtime paid/provider bundle progression remains blocked after packet fill because FlipFlop source rollout is merged, but Fiobanka provider rollback/real bank-originated callback evidence is still unavailable. Resolved/narrowed by this packet: target bundle, component product ids, Warehouse aggregate/max quantity, selected provider/method/max amount, Payments Orders service-token acceptance, evidence policy, approval id/window, and hard-stop conditions. Remaining blockers: `[RESOLVED/NARROWED: FlipFlop main 1b62909 maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`, `[MISSING: real Fiobanka bank-originated callback/signature evidence or explicit one-run approval to accept the synthetic Fiobanka fixture]`, `[MISSING: Fiobanka provider-side refund/reversal or unpaid cancel/void execution path with redacted evidence]`, and `[MISSING: named live-run executor/runtime validation owner for the exact side-effectful smoke]`.
