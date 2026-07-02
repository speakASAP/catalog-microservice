# GOAL-21: Catalog Product Events Outbox

```yaml
id: GOAL-21-CATALOG-PRODUCT-EVENTS
status: active
owner: W0 Catalog Events worker
created: 2026-07-02
branch: main
```

## Vision

Catalog product-truth changes propagate to dependent services through a durable event contract without letting those services redefine product truth.

## Goal Impact

Product lifecycle, sellability, category, and deletion changes become observable and replayable for channel services, Warehouse-adjacent read models, and operators while preserving Catalog as product truth and Warehouse as stock authority.

## System Boundary

Catalog owns the product event contract and outbox rows for product-truth changes. Warehouse owns stock events. Channel services own platform publication, compliance, queueing, pacing, and marketplace state.

## Feature

- Define versioned `catalog.events` product event contracts.
- Add a durable outbox table and producer foundation for product lifecycle events.
- Record outbox rows transactionally when products are created, updated, archived/soft-deleted, and hard-deleted.
- Document the publisher interface and runtime wiring blocker if RabbitMQ replay is not landed in this lane.

## Non-Goals

- No RabbitMQ deployment or live broker publishing in this lane.
- No channel-service edits.
- No Warehouse stock ownership or stock-event changes in Catalog.
- No Orders, Payments, deploy script, Kubernetes, Vault, or secret changes.
- No product mutation against production data and no deployment.

## Acceptance Criteria

- `docs/contracts/catalog-events.md` defines the envelope, routing keys, idempotency, replay, DLQ, and subscription-by-category rules for:
  - `catalog.product.upserted.v1`
  - `catalog.product.updated.v1`
  - `catalog.product.archived.v1`
  - `catalog.product.deleted.v1`
  - `catalog.product.category_changed.v1`
  - `catalog.product.sellability_changed.v1`
- Catalog has an additive outbox migration and TypeORM entity.
- `ProductsService` records outbox events in the same transaction as product create/update/archive/delete mutations when the producer is injected.
- Focused product-event tests cover create, update/archive/sellability, soft delete, and hard delete event recording.
- Validation evidence includes focused tests and `npm run build` when practical.

## Boundary Checks

- CAT-INV-001: Catalog emits product-truth events from Catalog product mutations.
- CAT-INV-002: no stock quantity, reservation, movement, or warehouse-location truth is added to Catalog events.
- CAT-INV-003: Auth remains identity owner; event actor metadata is a sanitized projection from existing request actor context.
- CAT-INV-005: channel publication and compliance remain channel-owned.
- CAT-INV-006: hard delete remains gated by the existing controller approval and role checks.
- CAT-INV-009: public product read envelopes are unchanged.
- CAT-INV-010: mutation auth/audit behavior is preserved.
