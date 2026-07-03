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
| `providerSuccessEvidence` | webhook/callback/provider fixture proving paid success without manual state bypass | Payments `1d503fa` records owner-approved synthetic Fiobanka completed callback through `/webhooks/fiobanka`, source-level and runtime-verified HMAC secret readiness on deployed image `7cfb431`, a prepared rollback packet, and the provider-authenticity decision that native signed Fiobanka callback authenticity remains missing while authenticated transaction polling is source-supported if the owner accepts polling; runtime `FIO_BANKA_API_KEY` is not configured, so polling evidence remains `[MISSING: runtime FIO_BANKA_API_KEY read-token configuration and owner-approved polling run evidence]` |
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
- Payments success evidence: Payments `1d503fa` records synthetic Fiobanka QR creation, owner-approved synthetic completed callback through `/webhooks/fiobanka` without manual payment-state bypass, source-level HMAC signature hardening, deployed runtime HMAC secret readiness on image `7cfb431`, and source-supported authenticated transaction-polling reconciliation with runtime token evidence still missing.
- Payments to Orders token proof: in-pod Payments probe did not print the token; fake UUID status update returned HTTP `404` after auth, so the service role was accepted and no order was mutated.
- FlipFlop verifier evidence: `npm run verify:orders-hub-integration` passed; `npm run verify:paid-provider-bundle-checkout-gate` returned `runtimeProgression=source_rollout_enabled_paid_provider_still_blocked`, `catalogBundleIdCheckoutAuthority=bounded_evidence_only`, and durable bundleId migration `source_rollout_enabled_paid_provider_blocked`.

Runtime HMAC/polling reconciliation evidence:

- Payments `1d503fa` is current `main`, retains `472f07f`, and records the Fiobanka provider-authenticity decision: native signed callback authenticity remains missing unless the owner supplies an official contract; authenticated Fio transaction-polling reconciliation is source-supported if the owner accepts polling.
- Runtime ready pod `payments-microservice-6d5f9fbbfc-8sp7b` on image `localhost:5000/payments-microservice:7cfb431` returned `FIO_BANKA_WEBHOOK_SECRET_PRESENT=true`, sanitized length `64`, and `/health` HTTP `200` without secret output.
- The same pod returned `FIO_BANKA_API_KEY_PRESENT=false`, so authenticated polling cannot be runtime-validated yet and remains `[MISSING: runtime FIO_BANKA_API_KEY read-token configuration and owner-approved polling run evidence]`.

Hard-stop facts that remain unavailable even after owner approval:

- `[RESOLVED/NARROWED: FlipFlop main 1b62909 maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`.
- `[RESOLVED/NARROWED: Fiobanka webhook source no longer accepts arbitrary non-empty x-fio-signature values]`; `[RESOLVED/NARROWED: deployed ready Payments pod has FIO_BANKA_WEBHOOK_SECRET present and healthy without secret output]`; `[MISSING: runtime FIO_BANKA_API_KEY read-token configuration and owner-approved polling run evidence]`; `[MISSING: official/native Fio Banka callback signature contract if provider-authentic bank-originated signed callbacks are required]`.
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
3. Stop before paid completion if Fiobanka runtime HMAC secret/deploy verification or provider-authentic callback evidence is required but missing.
4. Stop before provider refund/cancel/reversal if the provider operation, provider owner, evidence redaction path, and amount ceiling are not explicitly recorded.
5. Stop before Orders cleanup if the Orders actor, route, transition, reason code, sideEffectsHandled acknowledgement, and idempotency key are not recorded.
6. Stop before Warehouse cleanup if any component reservation state is unknown or the state-to-operation mapping is not deterministic.
7. Stop before channel cleanup if cleanup would hide a failed provider/Orders/Warehouse rollback or require raw private evidence.

Owner approval boundary: the current owner approval covers self-discovery, packet fill, and read-only/preflight verification only. It does not approve future money movement, stock movement, order mutation, webhook replay, provider refund/cancel/reversal, or channel cleanup execution.

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
| FlipFlop | `1b62909` maps durable `catalog.bundle.v1` `bundleId` into central Orders `bundleEvidence` as bounded audit evidence | Source rollout is resolved/narrowed without changing totals, component item lines, stock identity, or provider state; live paid/provider execution remains blocked. |
| Payments | `ea4fc71` records pending Fiobanka QR evidence, owner-approved synthetic completed-callback evidence through `/webhooks/fiobanka`, selected-provider callback evidence, provider rollback packet evidence, Fiobanka pre-completion rollback boundary, source-only refund/cancel rollback plan, and source-level Fiobanka HMAC signature hardening | Route-level completion, selected-provider callback evidence, rollback planning, Fiobanka pre-completion rollback, and source signature hardening are narrowed as dependency-gated evidence; runtime secret/deploy verification, official/native provider authenticity if required, and post-completion refund/reversal execution approval remain missing. |

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
