# Goal 24 Bazos Live Paid Evidence Check

Date: 2026-07-03

## Scope

Catalog integration-owner validation of whether the deployed Bazos paid replay source currently has live aggregate-safe paid multi-product evidence. This is validation/docs only.

## IPS Chain

Vision -> marketplace purchase history can improve Catalog related-product evidence without leaking order/customer/payment ownership into Catalog.
Goal Impact -> distinguish implemented Bazos source contract from actual live non-empty replay evidence before any recurring activation decision.
System -> Bazos owns protected replay source, Marketing owns dry-run aggregation and ledger, Catalog owns relation persistence and retention policy.
Feature -> Bazos live paid multi-product order-affinity replay evidence check.
Task -> verify deployed Bazos/Marketing runtime and run aggregate-only protected endpoint plus Marketing dry-run checks.
Execution Plan -> no publish, no replace-window, no Catalog mutation, no raw payload logging, no secret values.
Coding Prompt -> keep recurring activation blocked unless owner approval is recorded after non-zero Bazos dry-run evidence.
Code -> Catalog validation/status docs only.
Validation -> runtime aggregate checks plus `git diff --check`.

## Runtime State

- Bazos deployment image: `localhost:5000/bazos-service:27f325d`.
- Bazos rollout: `deployment/bazos-service` successfully rolled out, ready `1/1`, updated `1`, available `1`.
- Marketing deployment image: `localhost:5000/marketing-microservice:9cc549e`.

## Aggregate Evidence

Protected Bazos endpoint probe from the Marketing pod using the Marketing runtime header contract:

```text
httpStatus=200
success=true
sourceOwner=bazos-service
contract=marketplace.order_affinity_candidate.v1
channel=bazos
count=0
eventCount=0
skippedRecords=0
failClosed=false
blockers=[]
```

Fresh Marketing CLI dry-run:

```text
runId=goal24-bazos-live-evidence-20260703-002
mode=dry-run
inputRecords=0
acceptedCreatedEvents=0
rejectedRecords=0
skippedEvents=0
aggregatePairs=0
totalPairEvidence=0
candidateCount=0
ledgerStatus=recorded
published=false
```

## Result

The source-contract blockers remain resolved/narrowed, but live evidence is still absent. Current remaining Bazos gates:

- `[RESOLVED: live Bazos paid multi-product order replay evidence via budget source dry-run goal24-bazos-budget-paid-source-20260703-001]`
- `[MISSING: owner approval to activate recurring Bazos affinity publish after live dry-run evidence]`

## Boundary

No Catalog publish, replace-window call, product relation mutation, deployment, migration, secret value, raw order id, customer/address/payment/provider payload, or raw replay payload was emitted.
