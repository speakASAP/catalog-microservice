# EP-CATALOG-21: Catalog Product Events Outbox

```yaml
id: EP-CATALOG-21-CATALOG-PRODUCT-EVENTS
status: active
source_goal: implementation-goals/GOAL-21-catalog-product-events.md
owner: W0 Catalog Events worker
created: 2026-07-02
last_updated: 2026-07-02
branch: main
```

## Metadata

Repository: `/home/ssf/Documents/Github/catalog-microservice`
Preflight: clean `main`, head `5bac303 feat: show catalog stock availability`
Docs-rag retrieval: `[MISSING: docs-rag JWT_TOKEN]`

## Upstream Traceability

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

- BUSINESS.md: Catalog is the single source of truth for product data across sales channels.
- SYSTEM.md: Catalog is a NestJS/PostgreSQL product data service.
- docs/orchestrator/INTENT.md: Catalog owns product truth; Warehouse owns stock; channel services own adapters/publishing.
- implementation-goals/GOAL-21-catalog-product-events.md: owner-selected product events outbox lane.
- Warehouse reference: `warehouse-microservice` stock outbox records durable event intents and replays them at least once.

## Goal Impact

Dependent services can refresh product read models from durable Catalog events while the source-of-truth product mutation remains in Catalog and stock/event ownership remains in Warehouse.

## Project Invariants

- CAT-INV-001: product-truth events originate from Catalog product mutations.
- CAT-INV-002: events contain product metadata only and no stock truth.
- CAT-INV-003: actor metadata is sanitized; Catalog does not issue identity.
- CAT-INV-005: no channel publication or compliance logic is added.
- CAT-INV-006: hard delete approval gate remains unchanged.
- CAT-INV-009: no public read contract shape changes.
- CAT-INV-010: existing mutation auth/audit path remains in controllers.

## Sensitive-Data Handling

Synthetic tests only. Event actor metadata excludes tokens, emails, raw request headers, customer data, payment data, and private marketplace payloads. Docs must not include secrets.

## Contract/Schema Impact

Additive event contract doc and additive `catalog_product_event_outbox` table. Runtime RabbitMQ publication is intentionally not wired in this lane and remains `[MISSING: owner-approved Catalog event publisher runtime wiring and broker deployment contract]`.

## Scope

Implement the durable outbox and producer foundation for product lifecycle/update propagation from `ProductsService`.

## Non-Goals

No deploy, no broker publish worker, no channel repo edits, no Warehouse edits, no Orders/Payments/deploy/secrets edits, no production product mutation.

## Files To Inspect

- `src/products/products.service.ts`
- `src/products/products.module.ts`
- `src/products/products.service.spec.ts`
- `src/products/product.entity.ts`
- `scripts/migrations/*`
- `warehouse-microservice/src/stock/stock-event-outbox.entity.ts` and stock outbox docs as read-only reference

## Files To Create

- `docs/contracts/catalog-events.md`
- `implementation-goals/GOAL-21-catalog-product-events.md`
- `implementation-goals/GOAL-21-execution-plan.md`
- `reports/validation/GOAL-21-pre-coding-gate.md`
- `reports/validation/VAL-GOAL-21-catalog-product-events.md`
- `scripts/migrations/20260702_catalog_product_event_outbox.sql`
- `src/product-events/product-event-outbox.entity.ts`
- `src/product-events/product-event.types.ts`
- `src/product-events/product-event-publisher.service.ts`
- `src/product-events/product-events.module.ts`

## Files To Modify

- `implementation-goals/README.md`
- `src/products/products.service.ts`
- `src/products/products.module.ts`
- `src/products/products.service.spec.ts`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`

## Files That Must Not Be Modified

Channel repos, Warehouse, Orders, Payments, deploy scripts, Kubernetes manifests, Vault/secret files, protected baseline intent files, frontend files unrelated to event status.

## Implementation Steps

1. Define the versioned event contract and outbox schema.
2. Add the event outbox entity/module/service with a documented record-only publisher interface.
3. Import the event module into `ProductsModule`.
4. Wrap product create/update/archive/delete writes in the existing TypeORM transaction manager when available and record outbox rows in the same transaction.
5. Emit update-derived `archived`, `category_changed`, and `sellability_changed` events only when observable before/after state changes.
6. Add focused Jest coverage for outbox recording.
7. Run focused product tests, build, and diff check.
8. Record validation and state evidence.

## Test Plan

- Focused product service tests for create/upserted event.
- Focused product service tests for update plus archived/sellability transitions.
- Focused product service tests for soft delete archived event.
- Focused product service tests for hard delete deleted event.

## Validation Plan

- `npm test -- --runInBand src/products/products.service.spec.ts`
- `npm run build`
- `git diff --check`

## Gate Commands

```bash
npm test -- --runInBand src/products/products.service.spec.ts
npm run build
git diff --check
```

## Parallel Execution

| Workstream | Status | Owner | Scope | Dependencies | Validation | Handoff |
|---|---|---|---|---|---|---|
| Contract and IPS docs | ready now | W0 | docs/contracts, GOAL-21 docs, validation docs | owner prompt | doc review, diff check | feeds source implementation |
| Product outbox source | ready now | W0 | `src/product-events`, `src/products` | contract doc | focused Jest, build | final integration here |
| RabbitMQ publisher runtime | blocked | future worker | publisher worker, health/readiness, broker/DLQ config | `[MISSING: owner-approved runtime wiring]` | future integration tests | not part of W0 |
| Final integration | final integration | W0 | combine docs/source/tests/status | source validation | focused test, build, diff check | no deploy |

Shared files/contracts: `ProductsService`, product event contract, outbox migration.
Integration owner: W0.
Validation owner: W0.
Merge order: contract docs -> outbox source -> tests -> status/validation report.

## Documentation Updates

Update contract, goal, execution plan, pre-coding gate, validation report, implementation state, and orchestrator status.

## Rollback Plan

Before migration/deploy, revert source/docs/tests/migration. After migration application, rollback requires dropping `catalog_product_event_outbox` only after confirming no operator needs retained product event evidence.

## Agent Handoff Prompt

Implement the Catalog-side product event outbox foundation exactly within this plan. Keep RabbitMQ publication as an explicit runtime wiring blocker if it cannot be safely completed without deploy/secret/broker changes. Do not touch channel repos, Warehouse, Orders, Payments, deploy scripts, or secrets.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented
