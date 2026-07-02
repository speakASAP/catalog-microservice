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

## Deploy Attempt And Runtime Block Evidence

Date: 2026-07-02

Approved action: deploy and continue validation after additive migrations.

Additional validation before deploy:

- `npm test -- --runInBand src/product-relations/product-relations.service.spec.ts src/marketplace-fields/marketplace-fields.service.spec.ts`: passed, 2 suites and 8 tests.
- `npm run build`: passed.
- `cd services/frontend && npm run build`: passed with the existing Next.js multiple-lockfile warning only.
- `git diff --check`: passed.

Additional migrations applied and verified:

- `scripts/migrations/20260702_marketplace_manual_overrides.sql`: `product_marketplace_profiles.manual_overrides` and `source_state` columns exist; GIN indexes exist.
- `scripts/migrations/20260702_catalog_product_event_outbox.sql`: `catalog_product_event_outbox` table exists with 9 indexes and 0 rows.

Deploy evidence:

- `./scripts/deploy.sh` built and pushed `localhost:5000/catalog-microservice:9f89315` and completed its initial rollout/health phase.
- `./scripts/deploy-frontend.sh` built and pushed `localhost:5000/catalog-frontend:a8b1675` and completed its initial rollout phase.
- A concurrent Catalog deploy later advanced the repository/runtime target to a newer intermediate commit; final runtime state could not be stabilized inside this session because the Kubernetes node became unavailable.

Runtime evidence before infrastructure failure:

- `https://catalog.alfares.cz/health`: initially returned HTTP 200.
- Anonymous `GET /api/products/00000000-0000-4000-8000-000000000001/related`: initially returned HTTP 401, preserving the protected endpoint boundary.

Current runtime blocker:

- `kubectl get nodes`: `alfares NotReady`.
- `kubectl -n statex-apps get deploy catalog-microservice catalog-frontend`: both report `0/1` available.
- External `https://catalog.alfares.cz/health`: HTTP 503 `no available server`.
- k3s journal repeatedly reports `Waiting for containerd startup` for `/run/k3s/containerd/containerd.sock`.
- `systemctl restart k3s` and `sudo -n systemctl restart k3s` are unavailable to the current SSH user because interactive admin authentication is required.

Boundary check update:

- No relation rows or outbox rows were inserted.
- No Orders/Payments/Warehouse mutation was run.
- No marketplace/channel publication was run.
- No secrets or token values were printed.
- No destructive process kill or forced k3s restart workaround was performed.

Remaining blockers:

- `[MISSING: operator-level k3s/containerd recovery]`
- `[MISSING: completed Catalog rollout after node readiness]`
- `[MISSING: protected non-mutating related-products runtime smoke after rollout]`

## Recovery Follow-up Evidence

Date: 2026-07-02

- k3s briefly returned `active` and node `alfares Ready`.
- Stuck `Terminating` application pod API records in `statex-apps` were force-deleted to free pod slots. DB, MinIO, Redis, PVCs, deployments, services, secrets, configmaps, and volumes were not deleted.
- Catalog pods moved from unschedulable `Too many pods` to scheduled `ContainerCreating`, but still have no pod IPs and no service endpoints.
- `kube-system` pods such as `coredns`, `metrics-server`, and `local-path-provisioner` are also stuck in `ContainerCreating`.
- External Catalog health currently returns Cloudflare HTTP 521.
- Remaining blocker is node runtime/CNI/containerd recovery requiring operator/root access, not Catalog source validation.
