# Goal 24 Bazos Budget Paid Multi-Product Source Evidence

Date: 2026-07-03

## Scope

Catalog integration-owner record for the owner-requested Bazos runtime source projection and Marketing dry-run evidence. This validates live Bazos paid multi-product replay evidence without Catalog publish or replace-window.

## IPS Chain

Vision -> marketplace purchase history can improve related-product evidence without moving customer, payment, address, or raw marketplace ownership into Catalog.
Goal Impact -> Bazos live replay evidence is now non-empty and aggregate-safe.
System -> Bazos owns local paid source projection and replay endpoint; Marketing owns dry-run aggregation and ledger; Catalog owns relation persistence and activation policy.
Feature -> Bazos paid multi-product order-affinity replay validation.
Task -> create bounded Bazos budget paid source row and validate protected endpoint plus Marketing dry-run.
Execution Plan -> no Catalog publish, no replace-window, no Orders/Warehouse/Payments side effects, no raw payload output.
Coding Prompt -> resolve live-evidence blocker only; keep recurring activation blocked until owner activation approval is recorded.
Code -> Catalog validation/status docs only.
Validation -> runtime aggregate probes and `git diff --check`.

## Runtime Source Projection

Bazos created/updated one synthetic/internal paid source projection row with:

```text
status=completed
paymentStatus=paid
currency=CZK
total=2
itemCount=2
distinctProducts=2
forwarded=false
hasCentralOrderId=false
```

## Aggregate Evidence

Protected Bazos endpoint from the Marketing pod:

```text
httpStatus=200
success=true
sourceOwner=bazos-service
contract=marketplace.order_affinity_candidate.v1
channel=bazos
count=1
eventCount=1
eventTypes=[marketplace.order_affinity_candidate.v1]
eventVersions=[1]
skippedRecords=0
failClosed=false
blockers=[]
minItemCount=2
maxItemCount=2
```

Marketing dry-run:

```text
runId=goal24-bazos-budget-paid-source-20260703-001
mode=dry-run
inputRecords=1
acceptedCreatedEvents=1
rejectedRecords=0
skippedEvents=0
aggregatePairs=2
totalPairEvidence=2
byChannel.bazos=1
rejectionReasons={}
candidateCount=2
ledgerStatus=recorded
published=false
```

## Result

- `[RESOLVED: live Bazos paid multi-product order replay evidence via budget source dry-run goal24-bazos-budget-paid-source-20260703-001]`
- `[MISSING: owner approval to activate recurring Bazos affinity publish after live dry-run evidence]`

## Boundary

No Catalog publish, replace-window call, product relation mutation, Orders create, Warehouse reservation, Payments action, deployment, migration, secret value, raw order id, customer/address/payment/provider payload, raw replay payload, or marketplace publication occurred.
