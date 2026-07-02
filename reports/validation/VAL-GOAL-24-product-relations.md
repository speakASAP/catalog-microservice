# VAL-GOAL-24 Product Relations

```yaml
id: VAL-GOAL-24-product-relations
date: 2026-07-02
repository: /home/ssf/Documents/Github/catalog-microservice
role: catalog worker and validation owner
deployment: not run
database_mutation: additive migration applied
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog remains the product truth service while exposing bounded relation metadata.
- Goal Impact: product-detail/operator consumers can later read deterministic relation scores after migration/deploy approval.
- System: Catalog owns `product_relations`; Orders and checkout systems remain out of scope.
- Feature: protected related-product read and admin/manual upsert.
- Task: additive TypeORM module, migration, docs, and focused tests.
- Execution Plan: `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md`.
- Coding Prompt: Catalog-only relation foundation; no Orders ingestion, bundle checkout, live DB mutation, or deployment.
- Code: `src/product-relations/*`, `src/app.module.ts`, `scripts/migrations/20260702_product_relation_scores.sql`.
- Validation: commands below.

## Commands

```bash
npm test -- --runInBand src/product-relations/product-relations.service.spec.ts
```

Result: passed. Jest reported 1 suite passed, 4 tests passed.

```bash
npm run build
```

Result: passed. Nest build completed successfully.

```bash
git diff --check
```

Result: passed. No whitespace errors were reported for the tracked dirty diff.

## Manual Gate Evidence

- `scripts/pre_coding_gate.py`: `[MISSING: scripts/pre_coding_gate.py]`
- `scripts/strict_doc_audit.py`: `[MISSING: scripts/strict_doc_audit.py]`
- docs-rag retrieval: `[MISSING: docs-rag JWT_TOKEN]`
- Source scope: allowed files only for this task, except concurrent unrelated dirty files already present or appearing during the session were not touched.
- Sensitive data: no secrets, tokens, raw production data, live DB rows, or private logs read or printed.
- Runtime/database: additive migration `scripts/migrations/20260702_product_relation_scores.sql` was applied to `catalog_db` after owner approval. Schema verification confirmed `product_relations`, 7 indexes, 9 constraints, and 0 rows. No deployment or runtime API smoke was run.

## Boundary Check

- No Orders ingestion or consumer was added.
- No bundle checkout, discounts, payments, stock reservations, or storefront UX were added.
- No Warehouse, Orders, Payments, channel repo, deployment, Kubernetes, Dockerfile, `.env`, generated output, deletion, or pricing flow was changed by this task.
- Existing product read envelopes remain unchanged; relation endpoints are additive.
- Relation writes are protected by `CatalogAuthGuard`, restricted to admin/internal roles, and audited through `LoggerService.auditCatalogWrite`.

## Blockers

- `[MISSING: Orders-owned affinity producer/event contract]`
- `[MISSING: owner-approved migration application and deployment window]`
- `[MISSING: bundle checkout contract owned by FlipFlop/Orders/Payments]`
- `[MISSING: runtime backfill source for historical order-affinity scores]`
- `[MISSING: approved runtime token and non-mutating smoke plan for deployed relation endpoint]`


## Runtime Migration Evidence

Date: 2026-07-02

Approved action: apply additive Catalog product relation migration only.

Commands:

```bash
kubectl -n statex-apps exec -i deployment/db-server-postgres -- psql -U dbadmin -d catalog_db -v ON_ERROR_STOP=1 < scripts/migrations/20260702_product_relation_scores.sql
kubectl -n statex-apps exec deployment/db-server-postgres -- psql -U dbadmin -d catalog_db -v ON_ERROR_STOP=1 -c "select to_regclass($$public.product_relations$$) as relation_table;"
kubectl -n statex-apps exec deployment/db-server-postgres -- psql -U dbadmin -d catalog_db -v ON_ERROR_STOP=1 -c "select indexname from pg_indexes where schemaname=$$public$$ and tablename=$$product_relations$$ order by indexname;"
kubectl -n statex-apps exec deployment/db-server-postgres -- psql -U dbadmin -d catalog_db -v ON_ERROR_STOP=1 -c "select conname, contype from pg_constraint where conrelid=$$public.product_relations$$::regclass order by conname;"
kubectl -n statex-apps exec deployment/db-server-postgres -- psql -U dbadmin -d catalog_db -v ON_ERROR_STOP=1 -c "select count(*) as product_relation_rows from product_relations;"
```

Result:

- Migration completed with `CREATE TABLE` and `CREATE INDEX` notices.
- `public.product_relations` exists.
- Verified indexes: `product_relations_pkey`, `uq_product_relations_source_target_type_source`, `idx_product_relations_source_order`, `idx_product_relations_source_product`, `idx_product_relations_target_product`, `idx_product_relations_type_source`, `idx_product_relations_evidence_gin`.
- Verified constraints: primary key, source/target foreign keys, no-self check, score check, confidence check, relation type check, source check, and evidence-object check.
- Row count after migration: `0`.
- Deployment: not run.
- Runtime API smoke: not run because the application code is not deployed.
