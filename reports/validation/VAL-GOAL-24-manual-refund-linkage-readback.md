# Goal 24 Manual Refund Linkage Readback

Date: 2026-07-03

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Goal 24 full paid/refund closeout must tie owner-confirmed manual refund evidence to the exact service-owned payment, order, channel, and stock records without exposing raw private data.
- Goal Impact: the manual refund execution confirmation is preserved, while the exact paid-smoke linkage is narrowed by runtime readback instead of guessed.
- System: Payments owns Fiobanka provider/payment rows; Orders owns central order lifecycle; FlipFlop owns channel-local order acknowledgement; Warehouse owns stock correction; Catalog owns integration status only.
- Feature: sanitized manual refund exact-linkage readback.
- Task: find whether the completed Fiobanka evidence payment can be tied to central Orders and FlipFlop local order state.
- Execution Plan: read-only runtime DB/API evidence through service pods; output only booleans, counts, hashes, suffixes, statuses, and marker text.
- Coding Prompt: do not print token values, connection strings, raw order/payment ids, raw customer data, raw provider payloads, raw DB rows, screenshots, or bank payloads.
- Code: Catalog docs/status/verifier/report only.
- Validation: `npm run verify:goal24-refund-cancel-rollback-execution-approval`, `npm run build`, and `git diff --check`.
- State Update: manual refund execution is owner-confirmed, and the owner explicitly accepts closeout without exact order linkage for this retained evidence path.

## Sanitized Runtime Evidence

Payments readback:

- completed Fiobanka rows checked: `2`.
- selected retained Goal 24 provider variable suffix: `9053`.
- selected payment hash: `9fa68d05c012c879`, suffix `67006cd2`.
- selected payment application: `flipflop-service`, amount `1.00`, currency `CZK`, method `fiobanka`, status `completed`.
- selected payment completion: `completedAtPresent=true`, `refundedAtPresent=false`.
- selected payment metadata keys: `bankTransfer`, `cancelUrl`, `goal`, `source`, `successUrl`; `hasFlipflopOrderId=false`, `hasCentralOrderIdMetadata=false`.
- payment transaction summary: one `payment/success/1.00` transaction, hash `27bc23466954fcec`, suffix `2aa44fc0`.
- webhook summary: provider `fiobanka`, event suffix `9053:completed`, payload hash prefix `d853688eae04`, status `processed`, `processedAtPresent=true`.

Orders readback:

- central Orders lookup by the selected payment order reference hash `e7c32db560b0d5d4`, suffix `3a18ad56`: `found=false`.
- no central status, paymentStatus, Warehouse handoff, or bundleEvidence row was available for that reference.

FlipFlop readback:

- local order lookup by selected payment id and selected payment order reference: `foundCount=0`.
- no local order status/paymentStatus/readback row was available to acknowledge as `refunded`.

## Decision

[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no central Orders or FlipFlop exact-order linkage for the retained Goal 24 payment]

This readback means no exact paid-smoke order rollback can be proven from linked central Orders or FlipFlop state. The owner explicitly accepts the owner-confirmed manual refund as sufficient closeout without exact order linkage for this retained evidence path. [RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage] [RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]

Closed by owner decision:

- `[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact order linkage]`.
- `[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]`.

Future-smoke guardrails:

- Future paid/provider smokes still require exact payment/order/channel linkage before execution.
- This closeout does not authorize future provider refunds, Orders mutations, Warehouse corrections, or channel acknowledgement without a linked run packet.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Dependencies | Blockers | Validation owner | Merge order |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Payments evidence readback | complete-read-only | Catalog integration validator consuming Payments evidence | completed Fiobanka rows, transaction summary, webhook summary | current deployed Payments DB | none for readback | Catalog integration validator | first |
| Orders exact linkage | waived-for-retained-evidence | Orders lifecycle owner | central order lifecycle and Warehouse handoff for exact paid smoke | exact linked central Orders UUID | `[MISSING: sanitized exact-order linkage between the manual refund confirmation and a completed Goal 24 paid-smoke order]` | Orders/Warehouse validation owner | before post-paid correction |
| FlipFlop acknowledgement | waived-for-retained-evidence | FlipFlop channel owner | local order `refunded/refunded` acknowledgement for exact order | exact linked FlipFlop order | `[MISSING: FlipFlop runtime readback showing an exact linked smoke order acknowledged as status=refunded and paymentStatus=refunded after manual refund]` | FlipFlop checkout owner | after external refund evidence and before final closeout |
| Final integration closeout | final integration | Catalog commerce integration owner | reconcile provider refund plus Orders/Warehouse/channel cleanup | linked payment/order/channel evidence | blockers above | Catalog validation owner | last |

Shared contracts: Payments Fiobanka provider evidence, Orders `orders.payment-status.v1`/post-paid correction policy, Warehouse component-line cleanup policy, FlipFlop channel acknowledgement, Catalog Goal 24 approval packet.

Integration owner: Catalog commerce integration owner.

Validation owner: Catalog validation owner for docs/verifier; runtime validation owner remains `[MISSING: exact linked paid-smoke runtime validation owner]`.

Merge order: Payments readback evidence -> Catalog reconciliation -> FlipFlop channel acknowledgement reconciliation -> Orders/Warehouse exact correction packet -> final Catalog closeout.

## Boundaries

No payment, refund, provider reversal, webhook replay, Orders mutation, Warehouse mutation, FlipFlop mutation, DB write, deploy, migration, secret output, raw bank/customer/payment payload, raw order/payment id, screenshot, or raw DB row was performed or recorded.
