# VAL-GOAL-21: Catalog Product Events Runtime Publisher

```yaml
id: VAL-GOAL-21-CATALOG-PRODUCT-EVENTS-RUNTIME-PUBLISHER
status: source_pass_runtime_enablement_blocked
validated_artifact: implementation-goals/GOAL-21-catalog-product-events.md
owner: W0b Catalog Runtime Publisher worker
created: 2026-07-02
last_updated: 2026-07-02
repository: /home/ssf/Documents/Github/catalog-microservice
branch: main
head_before_work: 6f444f7 feat: add catalog product event outbox
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

- Vision: Catalog remains product truth while downstream services update read models from durable events.
- Goal Impact: Option 2 product availability propagation gets an at-least-once Catalog event publisher foundation without publishing before product mutation commit.
- System: NestJS/TypeORM Catalog service with PostgreSQL outbox and optional RabbitMQ runtime.
- Feature: Replay committed `catalog_product_event_outbox` rows to exchange `catalog.events`.
- Task: Add bounded runtime worker, broker adapter, health counters, env docs, and focused tests.
- Execution Plan: Additive source-only lane, no deploy, no production migration, no secrets mutation.
- Coding Prompt: W0b Catalog Runtime Publisher worker.
- Code: `src/product-events/*`, health wiring, `.env.example`, docs.
- Validation: focused Jest, build, diff check.

## Artifact Validated

Source-level runtime publisher wiring only. No production migration was applied, no RabbitMQ credentials were created, no broker topology was changed, and no deployment was performed.

## Evidence To Validate

- `ProductEventOutboxPublisherService` replays only committed outbox rows and does not publish during product mutation transactions.
- Disabled mode is fail-closed and does not claim rows.
- Enabled mode transitions `pending`/retry-due `failed` rows through `publishing`.
- Successful publish writes `published`, clears retry state, and preserves envelope identifiers.
- Retryable failure writes `failed`, increments attempts, records `lastError`, and schedules `nextAttemptAt`.
- Max attempts or non-retryable contract errors write `dead_letter`.
- Broker adapter targets exchange `catalog.events`, topic type, persistent JSON messages, `messageId=eventId`, routing key equal to event type, and bounded headers.
- Health/readiness exposes publisher status while disabled mode does not fail service readiness.

## Gate Evidence

| Command | Result | Evidence |
|---|---|---|
| `npm test -- --runInBand src/product-events/product-event-outbox-publisher.service.spec.ts` | Pass | 1 suite, 6 tests passed. |
| `npm run build` | Pass | Nest build completed with exit 0. |
| `git diff --check` | Pending final run | `[UNKNOWN: final whitespace check not run yet]` |

## Remaining Blockers

- `[MISSING: catalog_product_event_outbox migration application]`
- `[MISSING: amqplib package in Catalog runtime image or approved equivalent broker client]`
- `[MISSING: Catalog deployment/env wiring for CATALOG_EVENT_PUBLISHER_ENABLED=true and CATALOG_EVENTS_RABBITMQ_URL or RABBITMQ_URL]`
- `[MISSING: catalog.events durable exchange/DLQ broker topology confirmation]`
- `[MISSING: integration owner deploy and live broker smoke approval]`

## Handoff Notes

Runtime activation order:

1. Apply `scripts/migrations/20260702_catalog_product_event_outbox.sql` in the target environment.
2. Add or approve the AMQP client dependency/runtime module for Catalog.
3. Configure broker URL without exposing credentials in docs.
4. Confirm `catalog.events` exchange and DLQ policy/topology.
5. Enable `CATALOG_EVENT_PUBLISHER_ENABLED=true` and deploy.
6. Run a live broker smoke that verifies one synthetic committed outbox row reaches RabbitMQ and is marked `published`.
