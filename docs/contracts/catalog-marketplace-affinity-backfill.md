# Marketplace Affinity Backfill Contract

```yaml
id: CATALOG-MARKETPLACE-AFFINITY-BACKFILL-CONTRACT
status: contract-defined-implementation-gated
owner: catalog-orchestrator
created: 2026-07-03
scope: scheduled/idempotent marketplace order-affinity replay into Catalog product relations
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: marketplace purchase history can improve related-product and future bundle surfaces without moving order, payment, customer, address, stock, or publication ownership into Catalog.
- Goal Impact: Allegro's qualified one-time affinity publish becomes a repeatable contract that other channels can implement safely.
- System: marketplace services own their local order history and replay endpoints, Marketing owns aggregation, scheduling, run ledger, idempotency, and Catalog publishing, and Catalog owns relation persistence and read APIs.
- Feature: protected marketplace-owned replay candidates, Marketing scheduled dry-run/publish orchestration, and Catalog upsert-only relation ingestion.
- Task: replace temporary `/tmp` SQL exports with owner-owned replay surfaces and define pruning/replacement gates before any automated marketplace-wide publish.
- Execution Plan: document the contract first, keep source/runtime unchanged, mark missing producer/parser/ledger/prune contracts as `[MISSING: ...]`, and validate docs with `git diff --check`.
- Coding Prompt: do not invent backend fields, do not expose customer/address/payment/provider data, do not run new data mutations, and do not treat the temporary Allegro export as durable infrastructure.
- Code: this contract plus Goal 24 status/validation documentation only.
- Validation: `git diff --check` for this documentation change; runtime publish evidence remains the owner-approved Allegro run recorded in `VAL-GOAL-24-bundle-order-affinity-contract.md`.
- State Update: scheduled marketplace-wide backfill is contract-defined and implementation-gated.

## Ownership Boundary

Marketplace services own:

- Local marketplace order projections and marketplace-specific eligibility filters.
- Protected replay endpoints or owner-run exports for their own order history.
- Mapping from local line items to Catalog product ids.
- Redaction of buyer, delivery, address, payment, provider, raw marketplace payload, token, and credential data before Marketing sees the replay stream.

Marketing owns:

- Reading marketplace replay endpoints and central Orders replay endpoints.
- Dry-run-first aggregation from bounded order-created snapshots into directed `order_affinity` candidates.
- Run ledger, scheduling, idempotency keys, reject accounting, publish thresholds, and Catalog batch publishing.
- Public summaries that include aggregate counts and candidate product ids only.

Catalog owns:

- `POST /api/internal/product-relations/order-affinity/batch` as the only relation write surface for Marketing-derived candidates.
- Server-side forcing of `relationType=order_affinity` and `source=marketing_order_affinity`.
- Product visibility/existence validation, deterministic reads, and upsert-only persistence for the current API.

Catalog does not own:

- Marketplace order extraction, central Orders history, Marketing scheduling, checkout, discounts, Warehouse reservations, Payments totals, or external marketplace publication.

## Current Proven State

- Central Orders replay exists but the read-only aggregate check found `paid_multi_product_orders=0`, so central Orders currently cannot provide a non-empty live publish.
- Allegro one-time source evidence exists: 8 paid `READY_FOR_PROCESSING` marketplace orders with two Catalog products each produced 16 directed `marketing_order_affinity` rows through the deployed Marketing pod and Catalog batch endpoint.
- The successful Allegro publish used a temporary `/tmp/allegro-affinity-events.json` export on `alfares`; it is not a durable replay contract.
- Marketing `main` now accepts marketplace-owned `marketplace.order_affinity_candidate.v1` envelopes for Allegro, Aukro, Bazos, and FlipFlop without weakening canonical Orders event validation. Runtime evidence records Allegro dry-run/pass, an owner-approved one-time Catalog batch publish, and durable ledger recording.

## Protected Marketplace Replay Endpoint Contract

Each marketplace that participates in scheduled affinity replay must expose a protected internal endpoint or an owner-run CLI export with equivalent output. Allegro should implement this first because it already has qualified data.

Recommended Allegro endpoint:

```text
GET /internal/allegro/order-affinity/replay-candidates
```

Access:

- Internal-service authentication only.
- Caller identity: `marketing-microservice`.
- No anonymous, public frontend, marketplace webhook, or operator-browser access.

Query parameters:

- `from`: optional ISO timestamp lower bound for local order creation/update time.
- `to`: optional ISO timestamp upper bound.
- `limit`: positive integer bounded by the producer; default and max are producer-owned.
- `cursor`: opaque producer cursor for pagination.
- `dryRun`: optional boolean accepted for parity, but endpoint must remain read-only either way.

Response envelope:

```json
{
  "success": true,
  "data": {
    "sourceOwner": "allegro-service",
    "consumerOwner": "marketing-microservice",
    "contract": "marketplace.order_affinity_replay_candidates.v1",
    "channel": "allegro",
    "filters": { "from": "2026-07-01T00:00:00.000Z", "to": "2026-07-03T00:00:00.000Z", "limit": 50 },
    "cursorBefore": null,
    "cursorAfter": "opaque-cursor-or-null",
    "count": 1,
    "events": []
  }
}
```

Event payload options:

1. `ready now`: marketplace-owned envelope with `source="allegro-service"`, `type="marketplace.order_affinity_candidate.v1"`, and a payload containing only `channel`, synthetic non-sensitive replay id, `currency`, and `items[]` with Catalog `productId`, optional `sku`, `quantity`, optional `unitPrice`, and optional `totalPrice`.
2. `temporary compatibility only`: an Orders-created compatible envelope may be emitted if Marketing explicitly documents that normalization step and preserves `payload.channel="allegro"`; this must not hide marketplace provenance in run metadata.

Marketing parser/normalizer support for option 1 is resolved on Marketing `main`; future scheduled publish remains gated by producer completeness, durable ledger recording, and owner-reviewed source/window policy.

Forbidden response content:

- Customer names, emails, phones, logins, buyer ids, delivery names, delivery addresses, pickup addresses, billing details, payment provider ids, transaction ids, refund ids, shipping/tracking values, raw marketplace JSON, OAuth tokens, service tokens, credentials, and internal secret names.

## Producer Eligibility Rules

Allegro first version:

- Include only local orders with paid/processable marketplace state equivalent to the already-qualified `READY_FOR_PROCESSING` evidence.
- Include only orders with at least two distinct mapped `catalogProductId` values.
- Exclude unmapped line items from affinity evidence; if fewer than two Catalog products remain, skip the order and count it in producer diagnostics.
- Emit only aggregate-safe item snapshots; do not emit local marketplace order ids unless they are irreversibly synthetic/non-sensitive replay refs.
- Preserve `channel=allegro` so Catalog evidence remains auditable by channel after Marketing aggregation.

Other marketplace services must define their own paid/processable status mapping before joining the schedule:

- `[MISSING: Aukro paid multi-product replay eligibility mapping]`
- `[RESOLVED: Bazos protected replay endpoint compatible with Marketing marketplace replay contract]`
- `[MISSING: Bazos paid order history source]`
- `[MISSING: Bazos persisted order item replay source]`
- `[MISSING: Bazos order item ingestion contract]`
- `[MISSING: FlipFlop paid multi-product replay eligibility mapping]`

## Marketing Scheduler And Idempotency Contract

Marketing has added a durable aggregate-only run ledger before marketplace-wide scheduling.

Run ledger fields:

- `runId`: stable normalized id, for example `marketplace-affinity:allegro:2026-07-03`.
- `sourceOwner`, `channel`, `windowStart`, `windowEnd`, `cursorBefore`, `cursorAfter`.
- `mode`: `dry-run` or `publish`.
- `status`: `planned`, `running`, `dry_run_passed`, `published`, `failed`, or `blocked`.
- `inputRecords`, `acceptedCreatedEvents`, `rejectedRecords`, `skippedEvents`, `aggregatePairs`, `totalPairEvidence`, `batchCount`.
- `rejectionReasons` and `byChannel` aggregate maps.
- `catalogIdempotencyKeys`: batch keys only, no raw order ids.
- `createdAt`, `startedAt`, `completedAt`, `createdBy` or scheduler identity.

Catalog batch idempotency key shape:

```text
marketing_order_affinity:<sourceOwner>:<channel>:<windowStart>:<windowEnd>:<runId>:<batchIndex>
```

Current Marketing scheduled/ledger code uses this source/window key shape. The earlier owner-approved one-time manual publish used `marketing_order_affinity:backfill:allegro-history-20260703:1`; that remains historic evidence only and is not the scheduled ledger contract.

Scheduling gates:

- Every scheduled source starts as dry-run.
- Publish requires zero forbidden-field rejects, zero parser rejects, an owner-approved source/window for the first run of each marketplace, and configured Catalog publisher credentials.
- Publish must have explicit candidate and batch limits.
- Publish output must not print raw events, customer data, addresses, payment/provider data, secrets, or raw marketplace payloads.
- Failed sources must not block other source dry-runs, but a failed source must not publish.

## Pruning And Replacement Semantics

Catalog now exposes `POST /api/internal/product-relations/order-affinity/replace-window` for source/window scoped replacement:

- The endpoint upserts the supplied complete snapshot candidates.
- It stamps each row with `evidence.orderAffinityWindow`.
- It prunes only omitted `marketing_order_affinity` rows whose existing `evidence.orderAffinityWindow` exactly matches the request `sourceOwner`, `channel`, `windowStart`, `windowEnd`, and `runId`.
- Legacy rows without matching window evidence and all non-Marketing/manual rows are retained.
- Catalog has an owner-approved conservative stale-affinity retention policy for current Goal 24 scheduling decisions: exact source/window replacement only, no time-based deletion, no manual/non-window pruning, no score decay, and additive retention for legacy rows without matching window evidence unless owners later approve archival.

Therefore scheduled replacement/pruning remains blocked per source until these non-Catalog proofs exist for the requested source/window:

- durable Marketing ledger recording with `completeSnapshot=true` for the exact source/window
- `[MISSING: marketplace producer guarantee that replay window is complete and repeatable for non-Allegro sources]`
- owner-reviewed publish or replace-window approval for the exact source/window

Allowed future replacement model:

1. Producer declares a complete snapshot window.
2. Marketing records the complete dry-run ledger and candidate set summary.
3. Catalog receives an explicit replace-window request scoped to `source=marketing_order_affinity`, `channel`, and complete window metadata. Standalone prune-window behavior remains out of scope until separately designed and approved.
4. Catalog never prunes manual, curated, non-Marketing, non-window, checkout, product, price, stock, payment, marketplace listing, or legacy rows without exact window evidence.


## Stale-Affinity Retention And Decay Policy

Owner-approved Catalog policy for Goal 24 recurring marketplace affinity replacement:

- `marketing_order_affinity` rows may be replaced only through `POST /api/internal/product-relations/order-affinity/replace-window` for a complete source/window snapshot.
- Replacement may prune only omitted rows whose existing `evidence.orderAffinityWindow` exactly matches the request `sourceOwner`, `channel`, `windowStart`, `windowEnd`, and `runId`.
- No time-based deletion, age-based cleanup, score decay, confidence decay, manual pruning, standalone prune-window endpoint, or non-window broad cleanup is approved.
- Legacy `marketing_order_affinity` rows without matching `evidence.orderAffinityWindow` are retained additively. They may be superseded by later exact-window rows in read ordering, but they must not be deleted or decayed by Catalog automation.
- Manual, curated, non-Marketing, non-window, checkout, product, price, stock, payment, and marketplace listing data are never in scope for this policy.
- Any future archival, decay scoring, run-ledger TTL, or legacy-row migration requires a separate owner-approved retention contract and validation plan.

This resolves the previous broad owner-approved retention/decay blocker for the conservative Catalog-owned policy. Marketing ledger/source-window proof is now implemented, deployed, and runtime-smoked at Marketing image `localhost:5000/marketing-microservice:0aa47ed`; scheduled publish/replacement remains blocked on source-specific producer completeness proof and owner-reviewed publish windows.

## Parallel Execution Plan

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 Allegro replay producer | complete | marketplace producer worker | Protected read-only replay endpoint emits bounded, complete, repeatable affinity snapshots | Allegro order service/controller/tests/docs | Catalog/Marketing source, payments, Warehouse, marketplace publication | This contract | focused Allegro order tests, service build, diff check, producer completeness handoff at Allegro `37a5add` |
| W2 Marketing parser/normalizer | complete | Marketing worker | Accept marketplace-owned replay envelopes and preserve source/channel provenance | Marketing order-affinity parser/backfill tests/docs | Catalog source, marketplace DB queries | W1 response shape accepted | Marketing focused tests/build/diff and runtime Allegro/Aukro evidence |
| W3 Marketing scheduler/ledger | complete | Marketing ledger worker | Add run ledger, dry-run-first scheduler, idempotency key registry, and complete source/window accounting | Marketing scheduler/ledger/tests/docs | Catalog schema, marketplace source | W2 parser support | Marketing focused/full tests/build/diff, deployed image `0aa47ed`, complete-snapshot ledger runtime smoke |
| W4 Catalog replace-window policy | source complete; integration-gated | Catalog worker | Maintain source/window scoped stale-affinity replacement API and conservative retention contract | Catalog product-relations contract/source/tests | Orders/Marketing/marketplace source, product/price/stock mutations | W3 ledger, producer completeness, owner-approved publish window before scheduled use | focused Catalog relation tests, build, diff check |
| W5 Other marketplaces | blocked | Channel workers | Define paid multi-product replay eligibility and protected endpoints | Aukro/Bazos/FlipFlop docs/source/tests | Catalog/Marketing shared contracts until W2/W3 stable | marketplace eligibility mapping | focused channel tests/builds |
| W6 Integration validation | final integration | Catalog orchestrator | Run dry-run matrix and owner-approved publish windows | validation reports/status docs | unapproved runtime mutation | W1-W3 complete; W4 policy/source complete; runtime replacement still needs deploy/smoke approval | dry-run summaries, Catalog readback aggregates |

Shared contracts:

- `docs/contracts/catalog-product-relations.md`
- `docs/contracts/catalog-marketplace-affinity-backfill.md`
- Marketing orders-events integration contract
- Marketplace-specific replay endpoint docs

Integration owner: original Codex thread `019f2683-0cac-7ec0-b4cf-8fe83e07a74e` for Catalog docs/status reconciliation until a commerce/data integration owner is assigned.

Validation owner: integration validator in the original thread.

Merge order: W1 Allegro producer complete, W2 Marketing parser complete, W3 Marketing ledger complete, W4 Catalog integration reconciliation, W5 additional marketplaces, W6 integration validation.

## Blockers

- `[RESOLVED: Marketing parser support for marketplace-owned replay source envelopes]`
- `[RESOLVED: durable Marketing backfill run ledger, complete-snapshot proof, and idempotency key registry]`
- `[RESOLVED: Allegro-owned protected replay endpoint so future runs do not require a temporary SQL export]`
- `[RESOLVED: scheduled dry-run matrix for central Orders, FlipFlop, Allegro, and Aukro zero-row dry-run]`
- `[RESOLVED: Bazos protected replay endpoint compatible with Marketing marketplace replay contract]`
- `[MISSING: non-empty real Aukro multi-Catalog-product replay evidence]`
- `[MISSING: owner-approved Aukro recurring schedule activation policy]`
- `[MISSING: Aukro paid multi-product replay eligibility mapping]`
- `[MISSING: Bazos paid order history source]`
- `[MISSING: Bazos persisted order item replay source]`
- `[MISSING: Bazos order item ingestion contract]`
- `[MISSING: FlipFlop paid multi-product replay eligibility mapping]`
- `[UNKNOWN: whether marketplace services other than Allegro currently have paid multi-product orders mapped to Catalog product ids]`
