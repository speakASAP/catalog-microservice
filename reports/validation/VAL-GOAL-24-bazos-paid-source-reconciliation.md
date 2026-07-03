# Goal 24 Bazos Paid Source Reconciliation

Date: 2026-07-03

## Scope

Catalog integration-owner reconciliation of the Bazos-owned Goal 24 paid replay source handoff. This report updates Catalog status/contract docs only after Bazos `main` merged the paid lifecycle fixture.

## IPS Chain

Vision -> marketplace purchase history can improve related-product evidence without leaking sensitive order/payment/customer ownership into Catalog.
Goal Impact -> Catalog no longer carries stale broad Bazos producer-source blockers after Bazos implemented the bounded source contract.
System -> Bazos owns paid order projection and protected replay producer; Marketing owns dry-run aggregation and ledger; Catalog owns relation persistence and replace-window retention policy.
Feature -> Bazos `marketplace.order_affinity_candidate.v1` replay source readiness reconciliation.
Task -> merge Bazos paid lifecycle fixture, preserve aggregate-only evidence, update Catalog docs with narrower remaining gates.
Execution Plan -> Bazos source branch merge/validation first, then Catalog docs-only reconciliation; no Catalog source/runtime mutation.
Coding Prompt -> replace stale broad blockers with resolved/narrowed source-contract markers and keep recurring publish blocked until live evidence and owner activation approval exist.
Code -> docs/status/report updates only in Catalog.
Validation -> Bazos focused validation and Catalog `git diff --check`.

## Bazos Evidence

- Bazos `main` merged/pushed `d4040c8 Merge goal24 Bazos paid lifecycle fixture`.
- Bazos `main` then advanced to `27f325d fix: emit marketing-compatible bazos replay events`, which aligns replay envelopes with Marketing parser expectations: `type`, `eventVersion`, and `payload.items[].productId`.
- Worker branch `codex/bazos-paid-lifecycle-fixture` was deleted locally and from `origin`.
- Source contract now includes local paid projection fields `paymentStatus`, `paidAt`, and bounded `itemSnapshots`.
- Replay remains aggregate-safe: paid/processable local Bazos orders only, at least two distinct Catalog product IDs, hashed replay refs, and no customer/address/payment-provider/token/raw marketplace payload output.
- The paid lifecycle fixture forwards Bazos `paymentStatus` to central Orders when synthetic/internal Bazos order creation forwards a central order.
- The follow-up event-shape fix emits `payload.items[].productId` instead of Catalog-only item keys so Marketing can parse Bazos replay events consistently with other marketplace producers.

## Validation Evidence

- Bazos `git diff --check` passed on latest `main` at `27f325d`.
- Bazos focused Jest passed on latest `main`: `services/aukro-service/src/aukro/orders/orders.service.spec.ts` -> 1 suite, 17 tests.
- Bazos service build passed on latest `main`: `npm --prefix services/aukro-service run build`.
- Bazos push/cleanup passed: paid lifecycle fixture merged through `d4040c8`, latest `origin/main` is `27f325d`, and `origin/codex/bazos-paid-lifecycle-fixture` was deleted.
- Catalog docs-only `git diff --check` passed.

## Resolved Or Narrowed Blockers

- `[RESOLVED/NARROWED: Bazos paid order history source implemented as local paid projection fields]`
- `[RESOLVED/NARROWED: Bazos persisted order item replay source implemented as bounded itemSnapshots]`
- `[RESOLVED/NARROWED: Bazos order item ingestion contract implemented for source item lines or linked Bazos ads with Catalog product IDs]`

## Remaining Blockers

- `[MISSING: live Bazos paid multi-product order replay evidence]`
- `[MISSING: owner approval to activate recurring Bazos affinity publish after live dry-run evidence]`
- `[MISSING: owner-approved source/window for any future replace-window publish]`

## Boundary

No Catalog source code, Catalog production data, product relations, marketplace publish, Kubernetes manifest, deployment script, secret value, customer/address/payment/provider payload, or raw marketplace order id was changed.
