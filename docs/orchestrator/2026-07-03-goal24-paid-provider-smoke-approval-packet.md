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
| `providerSuccessEvidence` | webhook/callback/provider fixture proving paid success without manual state bypass | Payments `46bf1c3` records owner-approved synthetic Fiobanka completed callback through `/webhooks/fiobanka`, source-level and runtime-verified HMAC secret readiness on deployed image `7cfb431`, a prepared rollback packet, and the provider-authenticity decision that native signed Fiobanka callback authenticity remains missing while authenticated transaction polling is source-supported if the owner accepts polling; runtime `FIO_BANKA_API_KEY` is not configured, so polling evidence remains `[RESOLVED/NARROWED: Payments b19e3b5 records owner-approved read-only Fiobanka polling run and redacted real CZK transaction match for retained Goal 24 variable-symbol hash d7512419521d2cab without token/raw payload output]; [RESOLVED/NARROWED: redacted runtime evidence packet captured a real bank-originated CZK transaction-polling match for the retained Goal 24 variable symbol hash d7512419521d2cab without token or raw payload output]` |
| `providerCancelEvidence` | provider-side cancellation path before completed payment, if applicable | Fiobanka QR has no proven provider-side unpaid cancel/void operation in source. Current executable policy is stop-before-paid only: do not complete/pay the transfer and do not simulate provider cancel. `[MISSING: owner-approved provider cancel/void operation if a future selected provider supports it]` |
| `refundPlan` | completed-payment refund path, max amount, provider rollback operation, and evidence policy | `[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]`; `[MISSING: owner-approved Fiobanka refund/reversal execution path and redacted provider evidence]`; Payments refund endpoint is provider-side for completed payments |
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
- Payments success evidence: Payments `9718efd` records synthetic Fiobanka QR creation, owner-approved synthetic completed callback through `/webhooks/fiobanka` without manual payment-state bypass, source/runtime HMAC hardening, official Fio JSON API polling defaults, currency-specific CZK/EUR read-token selection, and a redacted owner-approved CZK transaction-polling match for retained variable-symbol hash `d7512419521d2cab` without token or raw payload output.
- Payments to Orders token proof: in-pod Payments probe did not print the token; fake UUID status update returned HTTP `404` after auth, so the service role was accepted and no order was mutated.
- FlipFlop verifier evidence: `npm run verify:orders-hub-integration` passed; `npm run verify:paid-provider-bundle-checkout-gate` returned `runtimeProgression=source_rollout_enabled_paid_provider_still_blocked`, `catalogBundleIdCheckoutAuthority=bounded_evidence_only`, and durable bundleId migration `source_rollout_enabled_paid_provider_blocked`.

Runtime HMAC/polling reconciliation evidence:

- Payments `46bf1c3` is current `main`, retains `472f07f` and `1d503fa`, and records the Fiobanka provider-authenticity decision: native signed callback authenticity remains missing unless the owner supplies an official contract; authenticated Fio transaction-polling reconciliation is source-supported if the owner accepts polling.
- Runtime ready pod `payments-microservice-6d5f9fbbfc-8sp7b` on image `localhost:5000/payments-microservice:7cfb431` returned `FIO_BANKA_WEBHOOK_SECRET_PRESENT=true`, sanitized length `64`, and `/health` HTTP `200` without secret output.
- Later Payments evidence `b19e3b5` runtime-validates authenticated polling with currency-specific keys and a redacted real CZK transaction match: `[RESOLVED/NARROWED: Payments b19e3b5 records owner-approved read-only Fiobanka polling run and redacted real CZK transaction match for retained Goal 24 variable-symbol hash d7512419521d2cab without token/raw payload output]; [RESOLVED/NARROWED: redacted runtime evidence packet captured a real bank-originated CZK transaction-polling match for the retained Goal 24 variable symbol hash d7512419521d2cab without token or raw payload output]`.

Hard-stop facts that remain unavailable even after owner approval:

- `[RESOLVED/NARROWED: FlipFlop main 1b62909 maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`.
- `[RESOLVED/NARROWED: Fiobanka webhook source no longer accepts arbitrary non-empty x-fio-signature values]`; `[RESOLVED/NARROWED: deployed ready Payments pod has FIO_BANKA_WEBHOOK_SECRET present and healthy without secret output]`; `[RESOLVED/NARROWED: Payments b19e3b5 records owner-approved read-only Fiobanka polling run and redacted real CZK transaction match for retained Goal 24 variable-symbol hash d7512419521d2cab without token/raw payload output]; [RESOLVED/NARROWED: redacted runtime evidence packet captured a real bank-originated CZK transaction-polling match for the retained Goal 24 variable symbol hash d7512419521d2cab without token or raw payload output]`; `[MISSING: official/native Fio Banka callback signature contract if provider-authentic bank-originated signed callbacks are required]`.
- `[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]`.
- `[MISSING: Fiobanka provider-side refund/reversal or unpaid cancel/void execution path with redacted evidence]`.
- `[MISSING: named live-run executor/runtime validation owner for the exact side-effectful smoke]`.

## Refund/Cancel Rollback Execution Approval Decision

Status: fail-closed source-controlled runbook evidence. This packet does not authorize any refund, cancel, void, reversal, live checkout, provider redirect, webhook replay, Orders mutation, Warehouse mutation, or channel cleanup beyond the retained owner-confirmed 1 CZK Fiobanka evidence payment. It resolves the approval ambiguity by stating the exact execution gate; it does not execute or approve the side effect.

A future paid/provider `catalog.bundle.v1` smoke may execute rollback only after a new source-controlled run packet records all of the following fields as concrete values, with no `[MISSING: ...]` entries for the selected path:

| Rollback field | Required source-controlled value before execution | Current decision |
| --- | --- | --- |
| Provider rollback operation | One exact Payments/provider operation: unpaid provider cancel/void, completed-payment refund, bank reversal, or explicit no-provider-cancel/no-provider-refund policy accepted by owner for a stop-before-paid smoke | `[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]`; selected Fiobanka QR is safe only before payer transfer/completion; completed-transfer refund/reversal remains `[MISSING: owner-approved Fiobanka completed-transfer refund/reversal workflow]` |
| Provider execution owner | Named Payments/provider owner authorized to run or supervise the selected provider operation and stop before money movement if evidence is incomplete | `[MISSING: named Payments/provider rollback execution owner]` |
| Orders cleanup operation | Exact Orders route/action, service role, status transition, approval actor, reason code, sideEffectsHandled acknowledgement, and idempotency key for the selected state | Reserved-only cleanup may use bounded `orders.payment-status.v1` `cancelled`/`failed` release semantics after provider proof; post-paid cancellation/refund remains `[MISSING: owner-approved Orders cancellation/refund correction actor, reason, sideEffectsHandled acknowledgement, and route]` |
| Warehouse cleanup operation | Exact component-line operation per state: `release` for active reserved-only holds, `cancel` for approved fulfilled/stock-decremented cancellation, `return` for approved physical return, line-by-line cleanup for partial failures, fail closed for unknown state | Source-policy operation selection exists; execution remains blocked until the run packet records deterministic reservation state, stock window, max quantity, and selected operation for each component line |
| Channel cleanup operation | Exact FlipFlop/customer-visible cleanup for cart/session/local order projection/payment-result messaging and retry/cancel guidance; exact success/cancel URLs before provider creation | `[MISSING: exact success/cancel URLs for the live run]`; FlipFlop owns channel cleanup policy but not provider, Orders, or Warehouse side effects |
| Idempotency and retry | One approval id, one run id, one central Orders UUID, one Payments idempotency key anchored to the central Orders UUID, one Warehouse cleanup idempotency key per component line, and max retry count | Current approval id exists for packet/preflight only; side-effectful run id and cleanup idempotency keys remain `[MISSING: side-effectful rollback run id and cleanup idempotency keys]` |
| Redaction evidence | Allowed aggregate/hash evidence only; no token values, raw provider/customer/order/payment payloads, raw DB rows, secrets, or bank/card data | Existing redaction policy is accepted and remains mandatory |
| Hard-stop authority | Named live-run executor and runtime validation owner with authority to stop before each next side effect | `[MISSING: named live-run executor/runtime validation owner for the exact side-effectful smoke]` |

Execution boundary for the retained 1 CZK Fiobanka evidence payment:

- The retained 1 CZK Fiobanka evidence narrows real transfer completion only. It must not be reused as authorization to run another paid/provider smoke, refund, cancel, reversal, webhook replay, Orders cleanup, Warehouse cleanup, or channel cleanup.
- For Fiobanka QR, the only currently source-supported side-effect-safe rollback is stop-before-paid: do not complete/pay the bank transfer, do not invoke refund, do not simulate provider cancel, and clean only pending Orders/Warehouse/channel state through owner-approved pre-fulfillment cleanup.
- If a future run intentionally reaches completed/provider-paid state, rollback execution is blocked until the packet names a manual Fiobanka bank refund/reversal or other provider-approved correction workflow, plus Orders and Warehouse post-fulfillment correction semantics. A refund alone is not Warehouse return evidence.

Hard-stop conditions before rollback execution:

1. Stop before checkout submission if the packet is expired, missing a named runtime executor, or missing exact success/cancel URLs.
2. Stop before provider creation if the central Orders UUID, amount/currency, target bundle, component ids, Warehouse stock window, or Payments Orders service-token proof differs from the packet.
3. Stop before paid completion if the selected provider-authenticity path is missing; current Fiobanka polling evidence is resolved/narrowed, but native signed callback evidence remains missing if callbacks are required.
4. Stop before provider refund/cancel/reversal if the provider operation, provider owner, evidence redaction path, and amount ceiling are not explicitly recorded.
5. Stop before Orders cleanup if the Orders actor, route, transition, reason code, sideEffectsHandled acknowledgement, and idempotency key are not recorded.
6. Stop before Warehouse cleanup if any component reservation state is unknown or the state-to-operation mapping is not deterministic.
7. Stop before channel cleanup if cleanup would hide a failed provider/Orders/Warehouse rollback or require raw private evidence.

Owner approval boundary: the current owner approval covers self-discovery, packet fill, and read-only/preflight verification only. It does not approve future money movement, stock movement, order mutation, webhook replay, provider refund/cancel/reversal, or channel cleanup execution.


## 2026-07-04 Exact Linked Paid-Flow Discount Fixture Gate

Retained manual-refund evidence is closed by owner acceptance without exact order linkage. A future exact linked paid/provider smoke is a separate side-effectful lane.

The prior approval window expired at `2026-07-03T23:59:59+02:00`; remote continuation readback was `2026-07-04T00:00:06+02:00`. The old approval id must not be reused for a new side-effectful checkout/payment attempt.

Catalog reconciles FlipFlop `31845ef docs: close goal24 channel cleanup packet`, Payments `d5ee11b docs: record fiobanka refund upload deploy gate`, and Orders `e3f6e18 docs: preserve goal24 orders cleanup packet` as dependency evidence only. FlipFlop records an owner-approved server-validated discount/price fixture path for a future exact linked paid/provider smoke, but runtime preflight stopped before side effects because guarded discount-code generation returned `401 Unauthorized` without a named admin/actor or approved token-handling path.

Current hard stops before any exact linked paid/provider attempt:

- `[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]`.
- `[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]`.
- `[MISSING: named runtime validation owner for the exact side-effectful smoke]`.
- `[MISSING: named FlipFlop channel cleanup executor]`.

Boundary: no discount code, checkout, order, payment, provider call, Warehouse reservation, Orders mutation, FlipFlop mutation, DB write, deploy, migration, secret/token output, raw customer/order/payment/provider evidence, or marketplace/feed mutation is authorized by this packet until the fields above are source-controlled and owner-approved.

## 2026-07-04 Stale-Head Reconciliation

Catalog consumed the orchestrator-provided clean heads: Catalog `c52600d`, Orders `e3f6e18 docs: preserve goal24 orders cleanup packet`, Payments `d5ee11b docs: record fiobanka refund upload deploy gate`, Warehouse `46a66dc docs: define goal24 warehouse cleanup packet`, and FlipFlop `31845ef docs: close goal24 channel cleanup packet`. These are read-only readiness inputs only; they do not approve side-effectful checkout, provider, Orders, Warehouse, channel, deploy, migration, or DB mutation.

Parallel execution state:

| Workstream | Status | Owner role | Scope | Validation evidence | Merge order |
| --- | --- | --- | --- | --- | --- |
| Catalog stale-head reconciliation | final integration | Catalog integration owner | Catalog docs/status/verifier only | `npm run verify:goal24-refund-cancel-rollback-execution-approval`, `npm run build`, `git diff --check` | current commit after validation |
| Renewed execution packet | blocked | owner/runtime coordinator `[MISSING]` | exact `approvalWindow`, admin/token path, runtime validation owner, hard-stop authority | `[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]` | before any runtime smoke |
| Provider/Orders/Warehouse cleanup | dependency-gated | Payments, Orders, Warehouse, FlipFlop cleanup owners `[MISSING]` | provider callback/refund evidence, Orders correction actor/idempotency, Warehouse stock window/max quantity, channel cleanup | all side-effectful evidence remains `[MISSING]` | before final exact linked smoke |
| Exact linked paid/provider smoke | blocked | runtime validation owner `[MISSING]` | one bounded future live run | `[MISSING: approved live smoke validation]` | last only |

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

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
| Orders | `adddafb` merged the cleanup idempotency key contract after `2d6a4ce`; source choreography, active checkout central UUID propagation, and bounded cleanup idempotency semantics are narrowed, but migration/deploy execution, provider refund/cancel execution proof, runtime target packet evidence, and owner-approved cancellation cleanup inputs remain required. |
| Warehouse | `0b4c41b` on `origin/main` source-verifies component-line hold/release/fulfill/cancel/return plus cleanup operation matrix | Component-line lifecycle and cleanup operation-selection semantics are narrowed to source evidence; approved stock window/max quantity and live canary remain missing. |
| FlipFlop | `1b62909` maps durable `catalog.bundle.v1` `bundleId` into central Orders `bundleEvidence` as bounded audit evidence | Source rollout is resolved/narrowed without changing totals, component item lines, stock identity, or provider state; live paid/provider execution remains blocked. |
| Payments | `9718efd` records pending Fiobanka QR evidence, synthetic completed-callback evidence through `/webhooks/fiobanka`, HMAC hardening/runtime readiness, official Fio JSON API polling defaults, currency-specific CZK/EUR polling tokens, and redacted owner-approved CZK transaction-polling match evidence | Route-level completion, selected-provider callback evidence, polling-token delivery, and real bank-originated polling match evidence are narrowed for Fiobanka polling; official/native callback authenticity if signed callbacks are required and post-completion refund/reversal execution approval remain missing. |

Exact next required owner packet before any live paid/provider smoke: a single owner-approved run packet naming `approvalId`, `approvalWindow`, `checkoutOwner`, active `targetBundleId`, component product ids/quantities, Warehouse stock window/max quantity, selected provider/method/environment/max amount, provider completion evidence, provider refund/cancel/reversal operation, Orders cancellation actor/reason/side-effect acknowledgements, Warehouse cleanup operation for reserved/fulfilled/partial states, runtime checkout packet central Orders UUID proof, Payments Orders service-token proof, evidence redaction policy, hard-stop authority, dedicated smoke owner, and runtime validation owner.

## Current Decision

Runtime paid/provider bundle progression remains blocked after packet fill because FlipFlop source rollout is merged, but Fiobanka runtime polling/token evidence and provider rollback evidence are still unavailable. Resolved/narrowed by this packet: target bundle, component product ids, Warehouse aggregate/max quantity, selected provider/method/max amount, Payments Orders service-token acceptance, source-level Fiobanka HMAC hardening, evidence policy, approval id/window, and hard-stop conditions. Remaining blockers: `[RESOLVED/NARROWED: FlipFlop main 1b62909 maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`, `[RESOLVED/NARROWED: deployed ready Payments pod has FIO_BANKA_WEBHOOK_SECRET present and healthy without secret output]`, `[MISSING: official/native Fio Banka callback signature contract if provider-authentic bank-originated signed callbacks are required]`, `[MISSING: owner-approved refund/cancel rollback execution approval for future paid/provider smoke beyond the retained 1 CZK Fiobanka evidence payment]`, `[MISSING: Fiobanka provider-side refund/reversal or unpaid cancel/void execution path with redacted evidence]`, and `[MISSING: named live-run executor/runtime validation owner for the exact side-effectful smoke]`.

## 2026-07-03 Owner-Approved Runtime Attempt Result

Owner approval from the current Codex thread authorized a bounded side-effectful paid/provider smoke attempt and adjacent service changes, but execution stopped before checkout/order/payment/stock mutation.

Evidence consumed:

- FlipFlop `origin/main` `1b62909` contains the source rollout mapping durable `catalog.bundle.v1` `bundleId` into central Orders `bundleEvidence` as bounded audit evidence.
- FlipFlop source validation passed: `npm run verify:catalog-bundleid-checkout-migration`, `npm run verify:paid-provider-bundle-checkout-gate`, `npm run verify:catalog-bundle-adoption`, `npm --prefix services/order-service run build`, and `npm --prefix services/frontend run build`.
- FlipFlop deploy attempted from `/home/ssf/Documents/Github/flipflop` via `./scripts/deploy.sh`; images built and pushed, manifests applied, and rollout restart began.
- Runtime deploy failed before new pods became Ready: new FlipFlop pods stayed in `ContainerCreating`/image pull state until progress deadline; registry manifests returned HTTP `200`; node had no disk/memory/PID pressure; k3s/containerd logs showed node/runtime instability (`RST_STREAM`/reserved container errors) on neighboring workloads.
- Recovery executed without printing secrets: stuck new FlipFlop pods were deleted, Kubernetes rollout was undone for the six FlipFlop deployments, terminating rollout pods were force-cleaned, and final pod state returned to the previous six Ready FlipFlop pods.

Smoke decision: no live checkout, provider redirect/callback, Orders mutation, Payments mutation, Warehouse mutation, refund/cancel/reversal, channel cleanup, DB mutation, migration, or secret output occurred. The live paid/provider smoke remains blocked by `[MISSING: k3s/containerd runtime recovery or sudo-authorized node recovery window for redeploying FlipFlop source rollout]` plus the existing Fiobanka runtime secret/provider-authentic callback and refund/cancel/reversal blockers.

## 2026-07-03 Owner-Approved Stop-Before-Paid Runtime Smoke After Node Recovery

Status: owner-approved bounded stop-before-paid smoke executed and cleaned up; completed-payment provider refund/reversal remains blocked.

Upstream evidence consumed:

- FlipFlop `64e7831 docs: add goal24 channel cleanup contract`, retaining `1b62909` and `7566d4e`, was redeployed after k3s/node recovery. `./scripts/deploy.sh` completed successfully and all six FlipFlop deployments rolled out Ready.
- Payments `197292b docs: reconcile goal24 fiobanka runtime blocker status` supersedes earlier Payments heads and retains Fiobanka HMAC/runtime closure plus provider rollback packet status. Catalog treats it as dependency-gated provider evidence, not as completed refund/reversal proof.
- Orders payment-status source accepts `orders.payment-status.v1` from `internal:payments-microservice:service` and maps `cancelled` to Orders paymentStatus `cancelled` with Warehouse release semantics.
- Warehouse cleanup semantics remain component-line owned; the smoke verified release through Orders handoff, not direct stock edits.

Runtime smoke executed from a temporary `/tmp` helper, not committed to any service repo. The smoke created one authenticated FlipFlop cart with the two approved component products, submitted checkout with `paymentMethod=fiobanka` and `bundleIntent.bundleId=919be990-1c76-4f9c-b100-829281c6a709`, stopped before payer transfer/completion, and then cleaned the runtime state.

Sanitized evidence:

- `catalog.bundle.v1` evidence was written to the local FlipFlop order metadata: target bundle match `true`, product id count `2`, `contractVersion=catalog.bundle.v1`, `serverTotalSource=checkout_authoritative`.
- Payments row was created for `applicationId=flipflop-service`, `paymentMethod=fiobanka`, redirect URL present, and central Orders UUID matched the payment `orderId` by hash/readback.
- Orders cleanup used the Payments-owned `orders.payment-status.v1` boundary with `status=cancelled`; response HTTP `200`, central order status remained `pending`, central paymentStatus became `cancelled`, and `warehouseHandoff.status=released`.
- FlipFlop local cleanup used the internal order-service route inside the cluster; response HTTP `200`; local order readback became `status=cancelled`, `paymentStatus=failed`, `paymentMethod=fiobanka`.
- Payment provider row readback remained `status=processing`, `paymentMethod=fiobanka`, redirect URL present. This is expected for stop-before-paid Fiobanka QR because no provider-side unpaid cancel/void endpoint is currently proven.

Blockers resolved or narrowed:

- `[RESOLVED: k3s/containerd runtime recovery blocker for redeploying FlipFlop source rollout]`: redeploy completed and six FlipFlop deployments are Ready.
- `[RESOLVED/NARROWED: owner-approved paid/provider checkout smoke with stock cleanup for stop-before-paid Fiobanka QR]`: checkout creation, central Orders UUID propagation, bundleEvidence, Orders cleanup, and Warehouse release were proven with sanitized evidence.
- `[RESOLVED/NARROWED: cross-service packet proving provider pre-completion cancellation cleanup through Orders/Warehouse release semantics]`: Orders/Warehouse cleanup is proven for the unpaid/pre-completion state only.

Remaining blockers:

- `[MISSING: Fiobanka provider-side unpaid cancel/void operation; payment row remains provider-processing because no provider cancel endpoint exists]`.
- `[MISSING: completed-payment Fiobanka refund/reversal path with redacted provider evidence]`; [MISSING: Vault properties FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR for owner-approved payment-order upload].
- `[MISSING: owner-approved post-paid Orders/Warehouse correction packet for a completed provider payment]`.
- `[RESOLVED/NARROWED: Payments b19e3b5 records owner-approved read-only Fiobanka polling run and redacted real CZK transaction match for retained Goal 24 variable-symbol hash d7512419521d2cab without token/raw payload output]; [RESOLVED/NARROWED: redacted runtime evidence packet captured a real bank-originated CZK transaction-polling match for the retained Goal 24 variable symbol hash d7512419521d2cab without token or raw payload output]` if provider-authentic transaction polling is required.
- `[MISSING: official/native Fio Banka callback signature contract]` if bank-originated native signed callbacks are required instead of the current HMAC/polling decision.

Parallel execution update:

| Workstream | Status | Owner role | Validation evidence | Merge order |
| --- | --- | --- | --- | --- |
| FlipFlop durable bundle checkout | completed for stop-before-paid | FlipFlop checkout owner | redeploy succeeded; bundleEvidence runtime readback passed | already deployed before Catalog reconciliation |
| Orders/Warehouse unpaid cleanup | completed for stop-before-paid | Orders/Warehouse owners | `orders.payment-status.v1 cancelled` returned HTTP `200`; `warehouseHandoff.status=released` | consumed before Catalog docs commit |
| Payments provider cancel/refund | dependency-gated | Payments provider owner | payment row remains `processing`; no cancel/void/refund execution proof | must precede any completed-payment smoke |
| Catalog integration reconciliation | final integration | Catalog commerce integration owner | this packet plus validation commands | commit after Catalog verifier/build/diff checks |

State Update: Catalog may now mark the original stop-before-paid smoke and Orders/Warehouse cleanup evidence as resolved/narrowed. Catalog must still keep completed-payment refund/reversal and provider-side cancel/void as `[MISSING: ...]`; no paid transfer, provider callback, provider refund, provider reversal, direct stock edit, direct Orders DB edit, marketplace/feed mutation, migration, or secret output was performed.


## 2026-07-04 Payments Fiobanka Refund Upload Gate Reconciliation

Payments `d5ee11b docs: record fiobanka refund upload deploy gate` is deployed as `localhost:5000/payments-microservice:038c8e3`; sanitized runtime readback shows `FIO_BANKA_REFUND_UPLOAD_ENABLED=false`, `FIO_BANKA_API_KEY_CZK/EUR` present without values, and `FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK/EUR` absent. Fiobanka completed-transfer refund upload is source-defined only as guarded `PENDING_AUTHORIZATION` after Internetbanking authorization; it is not completed refund evidence and remains blocked by [MISSING: Vault properties FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR for owner-approved payment-order upload].

Current decision: full paid/refund remains dependency-gated. Catalog must not treat a Fiobanka payment-order upload acknowledgement as refund/reversal completion, must not proceed without the missing Vault write-token properties and exact future linked payment packet, and must still require Orders/Warehouse/channel cleanup approvals before any completed-payment smoke.

## 2026-07-03 Full Paid/Refund Variant Selection

Owner selected variant 2: full paid/refund evidence is required beyond the stop-before-paid smoke. Catalog consumed Payments `451ebdb fix: fail closed fiobanka refunds`, deployed as `localhost:5000/payments-microservice:451ebdb`, as a safety hardening packet: Fiobanka refunds now fail closed instead of returning a local pseudo-refund that could be persisted as `refunded`.

Decision: full paid/refund remains dependency-gated, not resolved. Payments has no automated Fiobanka bank-transfer refund/reversal implementation; runtime polling-token delivery and retained-variable-symbol polling match are now resolved/narrowed through distinct currency-specific `FIO_BANKA_API_KEY_CZK`/`FIO_BANKA_API_KEY_EUR` evidence. Catalog must not mark a completed Fiobanka payment as rolled back until the provider/bank owner supplies redacted evidence of a real manual bank refund/reversal and Orders/Warehouse owners approve the post-paid correction packet.

Remaining full paid/refund blockers:

- `[MISSING: owner-approved manual Fiobanka completed-transfer refund/reversal workflow with redacted provider/bank evidence]`; [MISSING: Vault properties FIO_BANKA_PAYMENT_ORDER_TOKEN_CZK and FIO_BANKA_PAYMENT_ORDER_TOKEN_EUR for owner-approved payment-order upload].
- `[MISSING: owner-approved post-paid Orders/Warehouse correction packet for a completed provider payment]`.
- `[RESOLVED/NARROWED: Payments b19e3b5 records owner-approved read-only Fiobanka polling run and redacted real CZK transaction match for retained Goal 24 variable-symbol hash d7512419521d2cab without token/raw payload output]; [RESOLVED/NARROWED: redacted runtime evidence packet captured a real bank-originated CZK transaction-polling match for the retained Goal 24 variable symbol hash d7512419521d2cab without token or raw payload output]` as transaction-polling authenticity evidence.
- `[MISSING: official/native Fio Banka callback signature contract]` if native bank-originated signatures are required.

## 2026-07-03 Manual Fiobanka Refund Workflow Clarification

Owner clarified that Fiobanka refunds are normally executed manually in a separate owner-operated refund service and then acknowledged in backend/customer-visible order surfaces. Catalog therefore treats the provider rollback operation for the full paid/refund variant as manual bank/service refund plus redacted evidence, not an automated Payments API refund.

Consumed FlipFlop source evidence: `/admin/orders/:id` can set order status `refunded`, payment status `refunded`, and notes. This resolves/narrows the channel-local acknowledgement workflow only.

Updated blockers:

- `[RESOLVED/NARROWED: owner-approved manual Fiobanka refund workflow is accepted as the provider rollback mechanism for completed transfers]`.
- `[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; automated Payments Fiobanka refund remains fail-closed]`.
- `[RESOLVED/NARROWED: FlipFlop admin order UI supports local refunded acknowledgement with notes after external refund evidence]`.
- `[MISSING: sanitized exact-order linkage between the manual refund confirmation and the Goal 24 completed Fiobanka smoke order]`.
- `[MISSING: FlipFlop runtime readback showing the exact smoke order acknowledged as status=refunded and paymentStatus=refunded after manual refund]`.
- `[MISSING: owner-approved post-paid Orders/Warehouse correction packet for the exact completed payment state]`.

## 2026-07-03 Owner-Confirmed Manual Refund Execution

Owner confirmation in the current Codex thread: automated Fiobanka refund is not available; the refund had to be sent manually through the separate owner-operated refund service, and the owner confirmed the manual refund was completed. Catalog records this as verified manual refund execution for the selected full paid/refund mechanism.

Evidence policy: no raw bank data, customer PII, raw order/payment ids, screenshots, provider payloads, token values, secrets, or raw database rows were captured or printed. Because the thread confirmation did not include a sanitized order/payment hash or refund-service reference, final strict-audit closeout still requires `[MISSING: sanitized exact-order linkage between the manual refund confirmation and the Goal 24 completed Fiobanka smoke order]` if the exact smoke order must be tied to this confirmation.

Current reconciliation: the manual refund execution blocker is resolved/narrowed by owner confirmation; automated Payments Fiobanka refund stays fail-closed; exact post-refund FlipFlop acknowledgement and Orders/Warehouse correction remain separate owner-owned evidence packets.

Sanitized exact-linkage readback on 2026-07-03: completed Fiobanka rows checked `2`; selected retained evidence row has provider suffix `9053`, payment hash `9fa68d05c012c879`, amount `1.00 CZK`, status `completed`, `completedAtPresent=true`, `refundedAtPresent=false`, transaction `payment/success/1.00`, and processed webhook suffix `9053:completed`. The payment metadata has no `flipflopOrderId` and no `centralOrderId`; central Orders lookup by the selected payment order reference returned `found=false`; FlipFlop local order lookup by payment/order reference returned `foundCount=0`. [RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no central Orders or FlipFlop exact-order linkage for the retained Goal 24 payment].

Owner closeout decision after readback: `[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage]`. `[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]`. Exact order linkage and exact FlipFlop refunded readback are waived for this retained evidence closeout only because the completed Fiobanka evidence payment is not linked to central Orders or FlipFlop order state. Future paid/provider smokes still require exact linkage before execution.

Boundary: this confirmation did not run a new paid transfer, automated refund, provider reversal, Orders mutation, Warehouse mutation, FlipFlop runtime mutation, DB edit, deploy, migration, secret output, or raw customer/payment evidence capture.

## 2026-07-04 FlipFlop Autonomous Approval Decision Sync

Catalog consumed FlipFlop `85ecb11 docs: record goal24 autonomous approval decision` as a source-policy integration input only. [RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist] New side-effectful paid/provider runtime execution remains blocked on exact bank/refund authority, provider proof, Orders side-effect acknowledgements, Warehouse live target rows/window/max quantity, Fiobanka payment-order Vault write tokens, and final redacted runtime evidence.

## 2026-07-04 FlipFlop Runtime Ownership Sync

Catalog consumed FlipFlop `2e2c368 docs: narrow goal24 runtime ownership` as source-governance input only. [RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist] New side-effectful paid/provider runtime execution remains blocked on named Auth admin actor/token source, human Payments/provider bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse live target rows/window/max quantity, Fiobanka payment-order Vault write tokens, and final redacted runtime evidence.
