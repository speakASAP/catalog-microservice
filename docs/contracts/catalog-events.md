# Catalog Product Events Contract

```yaml
id: CATALOG-EVENTS-PRODUCTS-V1
status: source_runtime_publisher_ready_runtime_enablement_blocked
owner: catalog orchestrator
created: 2026-07-02
last_updated: 2026-07-02
exchange: catalog.events
schema_version: 1
```

## Intent

Catalog publishes product lifecycle and product-truth change events so Warehouse, channel services, and operator tools can refresh their read models without redefining product truth.

Catalog remains the authority for product identity, lifecycle, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness. Warehouse remains the authority for stock quantities, reservations, movements, and warehouse locations. Channel services remain the authority for platform publishing, compliance, pacing, and external marketplace state.

## Broker

- Exchange: `catalog.events`
- Exchange type: `topic`
- Delivery intent: persistent messages after durable outbox commit
- Runtime publisher: `ProductEventOutboxPublisherService`, disabled by default until broker URL/client dependency/runtime migration/deploy are owner-wired
- Dead-letter target: outbox status `dead_letter`; broker DLX/queue binding remains `[MISSING: catalog.events.dlx/catalog.events.dlq broker topology]`

## Envelope

All event payloads use this versioned envelope:

```json
{
  "eventId": "uuid",
  "eventType": "catalog.product.updated.v1",
  "eventVersion": 1,
  "occurredAt": "2026-07-02T10:00:00.000Z",
  "producer": {
    "service": "catalog-microservice",
    "component": "ProductsService"
  },
  "aggregate": {
    "type": "product",
    "id": "catalog-product-id"
  },
  "routingKey": "catalog.product.updated.v1",
  "idempotencyKey": "catalog.product.updated.v1:catalog-product-id:eventId",
  "actor": {
    "type": "jwt|service|unknown",
    "sub": "auth-subject-or-service-name",
    "roles": ["catalog:authenticated"]
  },
  "data": {
    "product": {
      "id": "catalog-product-id",
      "sku": "SKU-001",
      "title": "Product title",
      "ownerUserId": "auth-user-or-null",
      "lifecycle": "active",
      "isActive": true,
      "categoryIds": ["category-id"],
      "updatedAt": "2026-07-02T10:00:00.000Z"
    },
    "change": {
      "changedFields": ["title", "lifecycle"],
      "before": {},
      "after": {}
    }
  }
}
```

The envelope must not contain stock quantities, reservations, customer data, payment data, service tokens, JWTs, raw private marketplace payloads, or inline media blobs.

## Events

| Event type | Routing key | When recorded | Required data |
|---|---|---|---|
| `catalog.product.upserted.v1` | `catalog.product.upserted.v1` | Product is created or an idempotent future upsert writes product truth. | Product snapshot and `changedFields`. |
| `catalog.product.updated.v1` | `catalog.product.updated.v1` | Product truth fields are updated. | Product snapshot, changed field names, before/after summary. |
| `catalog.product.archived.v1` | `catalog.product.archived.v1` | Product is soft-deleted or transitions to archived/inactive. | Product snapshot and archive reason. |
| `catalog.product.deleted.v1` | `catalog.product.deleted.v1` | Product is hard-deleted after explicit owner approval and superadmin authorization. | Final product snapshot before deletion. |
| `catalog.product.category_changed.v1` | `catalog.product.category_changed.v1` | Product category membership changes. | `beforeCategoryIds`, `afterCategoryIds`, added/removed category IDs. |
| `catalog.product.sellability_changed.v1` | `catalog.product.sellability_changed.v1` | Catalog-owned lifecycle/active state changes the product's Catalog sellability flag. | `beforeSellable`, `afterSellable`, lifecycle/isActive before/after. |

## Idempotency And Replay

- The outbox row owns `eventId`; RabbitMQ publication must use that value as AMQP `messageId`.
- Consumers must deduplicate by `eventId` first, then `idempotencyKey`.
- Replaying a pending/failed outbox row must publish the same envelope without changing `eventId`, `occurredAt`, `aggregate.id`, or `data`.
- Event delivery is at-least-once. Consumers must tolerate duplicates and out-of-order delivery by comparing `occurredAt` and product `updatedAt` when maintaining read models.
- Published rows are retained for audit/replay evidence until an owner-approved retention policy exists.

## Outbox State Model

Catalog records product event intents in `catalog_product_event_outbox` in the same database transaction as the product mutation.

Outbox statuses:

- `pending`: durable event intent committed; not yet published.
- `publishing`: future publisher has selected the row for a publish attempt.
- `published`: broker accepted the event.
- `failed`: broker publish failed and the row is retryable if `nextAttemptAt` is due and attempts remain.
- `dead_letter`: max attempts exceeded or publisher classified the payload as non-retryable; operators inspect or replay manually.

## DLQ Rules

- Retry transient broker failures with exponential or configured delay until `maxAttempts`.
- Move non-retryable payload validation failures to `dead_letter` without changing the original envelope.
- Move retryable failures to `dead_letter` after `attempts >= maxAttempts`.
- Failed rows must retain `lastError`, `attempts`, and `nextAttemptAt` without losing the original envelope.
- AMQP publish uses exchange `catalog.events`, routing key equal to `eventType`, durable/persistent JSON messages, `messageId=eventId`, and bounded headers.
- DLQ replay requires operator review because channel services may have already observed later product events.

## Runtime Publisher Configuration

- `CATALOG_EVENT_PUBLISHER_ENABLED=false` keeps the worker in safe disabled mode and does not claim rows.
- `CATALOG_EVENTS_RABBITMQ_URL` is the preferred broker URL; `RABBITMQ_URL` is accepted as a fallback.
- `CATALOG_EVENT_OUTBOX_BATCH_SIZE`, `CATALOG_EVENT_OUTBOX_REPLAY_INTERVAL_MS`, `CATALOG_EVENT_OUTBOX_RETRY_DELAY_MS`, `CATALOG_EVENT_OUTBOX_RETRY_MAX_DELAY_MS`, and `CATALOG_EVENT_OUTBOX_MAX_ATTEMPTS` bound replay behavior.
- Current package scope intentionally does not add RabbitMQ dependencies. Runtime enablement remains blocked on `[MISSING: amqplib package in Catalog runtime image or approved equivalent broker client]`.
- Runtime enablement remains blocked on `[MISSING: catalog_product_event_outbox migration application]` and `[MISSING: Catalog deployment/env wiring for CATALOG_EVENTS_RABBITMQ_URL or RABBITMQ_URL]`.

## Subscription By Category

Consumers can subscribe by event type and filter by `data.product.categoryIds` or the outbox `categoryIds` column.

Recommended patterns:

- Broad product truth sync: bind `catalog.product.*.v1` and deduplicate by `eventId`.
- Category-specific refresh: bind `catalog.product.upserted.v1`, `catalog.product.updated.v1`, and `catalog.product.category_changed.v1`, then accept only rows whose category set intersects the consumer's configured category IDs.
- Sellability/index refresh: bind `catalog.product.sellability_changed.v1`, `catalog.product.archived.v1`, and `catalog.product.deleted.v1`.

Consumers must treat category filtering as routing optimization, not authorization. Authorization and channel policy remain service-owned.

## Current Runtime Gap

This lane adds source-level RabbitMQ replay worker, bounded health/readiness counters, and fail-closed runtime configuration. Production use still requires `[MISSING: catalog_product_event_outbox migration application]`, `[MISSING: Catalog RabbitMQ runtime env/client dependency wiring]`, `[MISSING: catalog.events broker topology/DLQ binding]`, and a no-downtime deploy by the integration owner.
