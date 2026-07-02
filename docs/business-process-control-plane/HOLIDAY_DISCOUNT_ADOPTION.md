# BPCP Holiday Discount Adoption

Status: service-local adoption contract
Date: 2026-07-03
Service: `catalog-microservice`
Central contract pack: `statex-ecosystem/docs/business-process-control-plane/`

## Role

Product fact provider for category, tags, marketplace profile, eligibility facts, and display-safe product metadata.

## Responsibilities

- Expose product facts needed by BPCP and pricing.
- Mark products/categories as holiday-eligible only through the explicit allow-list contract (`CATALOG_BPCP_HOLIDAY_ELIGIBLE_CATEGORY_IDS`, `CATALOG_BPCP_HOLIDAY_ELIGIBLE_TAGS`).
- Preserve Catalog as fact owner, not discount calculator.

## Required interfaces

- Product facts endpoint or existing product API extension.
- Category and tag identifiers.
- Optional `discountEligibilityFacts` projection.
- BPCP RabbitMQ consumer binding:
  - exchange: `bpcp.events`
  - routing keys: `bpcp.process.published.v1`, `bpcp.process.paused.v1`, `bpcp.process.retired.v1`
  - queue: `catalog.bpcp.process-lifecycle.v1`
  - DLQ: `catalog.bpcp.process-lifecycle.v1.dlq`
- Protected fact endpoint:
  - `GET /api/business-process/catalog/products/:productId/discount-eligibility`
  - response schema: `catalog.discount-eligibility-facts.v1`
  - embedded allow-list schema: `catalog.holiday-discount-eligibility-allow-list.v1`
- Durable local process store:
  - event dedupe table: `catalog_bpcp_process_event_dedupe`
  - active projection table: `catalog_bpcp_process_projection`
  - SQL migration: `scripts/migrations/20260703_bpcp_process_projection_store.sql`

## Boundaries

- This service must not become the global owner of BPCP process definitions.
- This service must fail closed on invalid or unknown BPCP process versions.
- This service must keep existing domain ownership and invariants.
- This service must expose or document dry-run behavior before live execution.
- This service must not overwrite existing service contracts without an
  explicit integration owner and validation owner.

## Holiday Discount pilot expectations

- Recognize `holiday-discount-2026` only through versioned BPCP contracts.
- Preserve `processId`, `processVersion`, and `policyId` in every relevant
  decision, event, snapshot, log, or rendered experience.
- Support rollback by respecting BPCP pause and retired states.
- Keep process display and process execution separate where applicable.

## Blockers and unknowns

- Durable BPCP event dedupe/projection store is implemented in code and requires the additive SQL migration before runtime can leave memory fallback. Runtime blocker string: [MISSING: durable BPCP event dedupe/projection store]

- Holiday eligibility fact schema is implemented as `catalog.discount-eligibility-facts.v1` with allow-list contract `catalog.holiday-discount-eligibility-allow-list.v1`.
- [MISSING: approved Holiday Discount selected category/tag allow-list]
- FlipFlop order-service consumes Catalog facts for quote eligibility; central Orders immutable snapshot remains a later integration.

## Validation evidence required before implementation is accepted

- Product fixture with eligible category/tag returns stable facts and includes `catalog.holiday-discount-eligibility-allow-list.v1`.
- Ineligible product fixture does not leak false holiday eligibility.
- Existing catalog quality gates remain unchanged.

## Parallel handoff

This adoption doc is safe for a focused service owner to implement in parallel
after the central BPCP schemas are accepted. The service owner must not edit
shared BPCP schemas directly; schema changes go through the BPCP integration
owner.
