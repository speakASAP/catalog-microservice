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
- A direct `source=allegro-service` envelope failed closed with `order_event_source_invalid=8` because Marketing currently accepts only the `orders.order.created.v1` envelope source `orders-microservice`.

## Protected Marketplace Replay Endpoint Contract

Each marketplace that participates in scheduled affinity replay must expose a protected internal endpoint or an owner-run CLI export with equivalent output. Allegro should implement this first because it already has qualified data.

Recommended Allegro endpoint:

```text
GET /api/internal/allegro/order-affinity/replay-candidates
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

1. `ready now after Marketing parser support`: marketplace-owned envelope with `source="allegro-service"`, `type="marketplace.order_affinity_candidate.v1"`, and a payload containing only `channel`, synthetic non-sensitive replay id, `currency`, and `items[]` with Catalog `productId`, optional `sku`, `quantity`, optional `unitPrice`, and optional `totalPrice`.
2. `temporary compatibility only`: an Orders-created compatible envelope may be emitted if Marketing explicitly documents that normalization step and preserves `payload.channel="allegro"`; this must not hide marketplace provenance in run metadata.

The first durable implementation should prefer option 1 and add Marketing parser/normalizer support. Until then, scheduled publish must remain blocked by `[MISSING: Marketing parser support for marketplace-owned replay source envelopes]`.

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
- `[MISSING: Bazos paid multi-product replay eligibility mapping]`
- `[MISSING: FlipFlop paid multi-product replay eligibility mapping]`

## Marketing Scheduler And Idempotency Contract

Marketing must add a durable run ledger before marketplace-wide scheduling is enabled.

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

Current deployed Marketing uses `marketing_order_affinity:<eventId>:<batchIndex>` and produced `marketing_order_affinity:backfill:allegro-history-20260703:1` for the owner-approved one-time run. That remains acceptable for the recorded manual publish but is not sufficient as the marketplace-wide scheduled ledger contract.

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
- Catalog still has no standalone stale-affinity retention or decay policy.

Therefore scheduled replacement/pruning remains blocked until all of these non-Catalog proofs exist:

- `[MISSING: Marketing durable run ledger proving a complete source/window snapshot]`
- `[MISSING: marketplace producer guarantee that replay window is complete and repeatable]`
- `[MISSING: owner-approved retention/decay policy for stale affinity rows]`

Allowed future replacement model:

1. Producer declares a complete snapshot window.
2. Marketing records the complete dry-run ledger and candidate set summary.
3. Catalog receives either an explicit replace-window request or a prune-window request scoped to `source=marketing_order_affinity`, `channel`, and window metadata.
4. Catalog never prunes manual, curated, non-Marketing, non-window, checkout, product, price, stock, payment, or marketplace listing data.

## Parallel Execution Plan

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 Allegro replay producer | ready now | Allegro worker | Add protected read-only replay endpoint or CLI export that emits bounded affinity snapshots | Allegro order service/controller/tests/docs | Catalog/Marketing source, payments, Warehouse, marketplace publication | This contract | focused Allegro order tests, service build, diff check |
| W2 Marketing parser/normalizer | dependency-gated | Marketing worker | Accept marketplace-owned replay envelopes and preserve source/channel provenance | Marketing order-affinity parser/backfill tests/docs | Catalog source, marketplace DB queries | W1 response shape accepted | focused parser/backfill tests, build, diff check |
| W3 Marketing scheduler/ledger | dependency-gated | Marketing worker | Add run ledger, dry-run-first scheduler, idempotency key registry | Marketing scheduler/ledger/tests/docs | Catalog schema, marketplace source | W2 parser support | scheduler/ledger tests, dry-run evidence, diff check |
| W4 Catalog prune/replace | source complete; integration-gated | Catalog worker | Maintain source/window scoped stale-affinity replacement API | Catalog product-relations contract/source/tests | Orders/Marketing/marketplace source, product/price/stock mutations | W3 ledger, producer completeness, owner retention policy before scheduled use | focused Catalog relation tests, build, diff check |
| W5 Other marketplaces | blocked | Channel workers | Define paid multi-product replay eligibility and protected endpoints | Aukro/Bazos/FlipFlop docs/source/tests | Catalog/Marketing shared contracts until W2/W3 stable | marketplace eligibility mapping | focused channel tests/builds |
| W6 Integration validation | final integration | Catalog orchestrator | Run dry-run matrix and owner-approved publish windows | validation reports/status docs | unapproved runtime mutation | W1-W3 complete; W4 only if pruning approved | dry-run summaries, Catalog readback aggregates |

Shared contracts:

- `docs/contracts/catalog-product-relations.md`
- `docs/contracts/catalog-marketplace-affinity-backfill.md`
- Marketing orders-events integration contract
- Marketplace-specific replay endpoint docs

Integration owner: Catalog orchestrator until a commerce/data integration owner is assigned.

Validation owner: integration validator.

Merge order: W1 Allegro producer docs/source, W2 Marketing parser, W3 scheduler/ledger, optional W4 Catalog prune/replace, W5 additional marketplaces, W6 integration validation.

## Blockers

- `[MISSING: Marketing parser support for marketplace-owned replay source envelopes]`
- `[MISSING: durable Marketing backfill run ledger and idempotency key registry]`
- `[MISSING: Allegro-owned protected replay endpoint so future runs do not require a temporary SQL export]`
- `[MISSING: scheduled dry-run matrix across Allegro, Aukro, Bazos, FlipFlop, and central Orders]`
- `[MISSING: owner-approved retention/decay policy for stale affinity rows]`
- `[MISSING: Aukro paid multi-product replay eligibility mapping]`
- `[MISSING: Bazos paid multi-product replay eligibility mapping]`
- `[MISSING: FlipFlop paid multi-product replay eligibility mapping]`
- `[UNKNOWN: whether marketplace services other than Allegro currently have paid multi-product orders mapped to Catalog product ids]`
