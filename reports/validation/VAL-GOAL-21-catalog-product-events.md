# VAL-GOAL-21: Catalog Product Events Outbox

```yaml
id: VAL-GOAL-21-CATALOG-PRODUCT-EVENTS
status: source_pass_runtime_wiring_blocked
validated_artifact: implementation-goals/GOAL-21-catalog-product-events.md
owner: W0 Catalog Events worker
created: 2026-07-02
last_updated: 2026-07-02
repository: /home/ssf/Documents/Github/catalog-microservice
branch: main
head_before_work: 5bac303 feat: show catalog stock availability
```

## Artifact Validated

Scope: Catalog product event contract, additive outbox migration/entity/module, record-only publisher foundation, `ProductsService` transactional enqueue hooks, and focused product service coverage.

## Validation Scope

Validated source-level behavior only. No migration was applied, no RabbitMQ publisher was wired, no production product mutation was run, and no deployment was performed.

## Evidence

- Added `docs/contracts/catalog-events.md` for `catalog.events` product events v1, including envelope, routing keys, idempotency/replay, DLQ, and subscription-by-category rules.
- Added additive migration `scripts/migrations/20260702_catalog_product_event_outbox.sql`.
- Added `src/product-events/*` with outbox entity, typed event envelope/input contracts, module, and record-only publisher service.
- Wired `ProductsModule` to import `ProductEventsModule`.
- Wrapped `ProductsService` create/update/soft-delete/hard-delete write paths in the TypeORM transaction manager when available and recorded outbox event intents in the same transaction.
- Added focused Jest coverage for create/upserted, update/archive/sellability, soft delete, and hard delete event records.

## Gate Evidence

| Command | Result | Evidence |
|---|---|---|
| `npm test -- --runInBand src/products/products.service.spec.ts` | Pass | 1 suite, 28 tests passed after fixing test-only literal/mock typings. |
| `npm run build` | Pass | Nest build completed with exit 0. |
| `git diff --check` | Pass | No whitespace errors for tracked modified files. |
| Direct changed-file byte scan | Pass | No disallowed control characters found in modified/new files. |

## Invariant Evidence

- CAT-INV-001: product-truth changes now record Catalog-owned product events.
- CAT-INV-002: events include product metadata only; no stock quantities, reservations, movements, or warehouse locations are introduced.
- CAT-INV-003: actor metadata is sanitized from existing auth context; Catalog does not issue identity.
- CAT-INV-005: no channel publishing, queueing, pacing, or compliance logic was added.
- CAT-INV-006: hard delete remains guarded by the existing controller approval/role path; producer only records an event after that service path is invoked.
- CAT-INV-009: public read contracts are unchanged.
- CAT-INV-010: existing protected product mutation endpoints and audit logging remain in place.

## Sensitive-Data Evidence

Tests and docs use synthetic product IDs/SKUs only. Event payloads intentionally exclude tokens, raw headers, emails, customer data, payment data, private marketplace payloads, and inline media blobs.

## Passed Criteria

- Contract covers all six requested event types.
- Durable outbox schema and entity are additive and do not foreign-key products, preserving hard-delete event evidence.
- Product create records `catalog.product.upserted.v1`.
- Product update records `catalog.product.updated.v1` and derived `archived`, `category_changed`, or `sellability_changed` events when observable from before/after state.
- Soft delete records `catalog.product.archived.v1` and `catalog.product.sellability_changed.v1` when sellability changes.
- Hard delete records `catalog.product.deleted.v1` with the final product snapshot.

## Failed Criteria

None for source scope.

## Remaining Blockers

- `[MISSING: owner-approved Catalog event publisher runtime wiring and broker deployment contract]`
- `[MISSING: catalog_product_event_outbox migration application]`
- `[MISSING: runtime health/readiness/outbox counters for Catalog product events]`

## Handoff Notes

This lane intentionally stops at durable outbox recording. Future publisher work should replay `pending` and retry-due `failed` rows to RabbitMQ exchange `catalog.events`, publish with AMQP `messageId=eventId`, add DLQ wiring, and expose outbox counters. If product truth is mutated outside `ProductsService`, route that path through `ProductsService` or inject the same producer so update events remain complete.

## Recommendation

Accept source scope. Do not deploy until the migration and publisher/health wiring plan is approved.
