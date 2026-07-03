# VAL-GOAL-24 Bundle Aggregate API

```yaml
id: VAL-GOAL-24-bundle-aggregate-api
date: 2026-07-03
repository: /home/ssf/Documents/Github/codex-worktrees/catalog-goal24-bundle-api
branch: goal24-catalog-bundle-api
deployment: deployed_44ce06d
runtime_db_mutation: additive_migration_applied_and_archived_canary_created
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Catalog can expose durable bundle identity without owning checkout, stock, payment, or marketplace publication.
- Goal Impact: source implementation resolves the Catalog-owned additive API/migration blocker after owner accepted `catalog.bundle.v1`.
- System: Catalog owns bundle aggregate metadata over existing product IDs only.
- Feature: protected `catalog.bundle.v1` create/read/list/update/activate/archive API.
- Task: implement source, migration, focused tests, and docs.
- Execution Plan: `implementation-goals/GOAL-24-bundle-aggregate-api-execution-plan.md`.
- Coding Prompt: no SKU, no final totals, no orders, no reservations, no payments, no marketplace publication.
- Code: `src/bundles/*`, `src/app.module.ts`, `scripts/migrations/20260703_catalog_bundle_aggregate.sql`, docs/status updates.
- Validation: focused tests/build/diff passed; script blockers recorded.
- State Update: source implementation complete; runtime migration/deploy remains owner-gated.

## Validation Evidence

```bash
# docs-rag retrieval from live docs-rag pod using JWT_TOKEN without printing token value
```

Result: HTTP 200; response keys `query,context,sources,estimatedTokens`; contextChars=9776; sources=15.

```bash
if test -f scripts/pre_coding_gate.py; then python3 scripts/pre_coding_gate.py --root .; else echo MISSING scripts/pre_coding_gate.py; fi
if test -f scripts/strict_doc_audit.py; then python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues; else echo MISSING scripts/strict_doc_audit.py; fi
```

Result: `MISSING scripts/pre_coding_gate.py`; `MISSING scripts/strict_doc_audit.py`.

```bash
npm test -- --runInBand src/bundles/bundles.service.spec.ts
```

Result: PASS; 1 suite, 7 tests.

```bash
npm run build
```

Result: PASS.

```bash
git diff --check
```

Result: PASS.

## Boundary Evidence

No migration was applied, no deployment was run, no runtime DB mutation was made, no Kubernetes/deploy/secret files were changed, and no Orders/Warehouse/Payments/FlipFlop/marketplace repository was edited.

## Resolved Blockers

- `[RESOLVED: owner accepted catalog.bundle.v1 source implementation gate in Codex thread on 2026-07-03]`
- `[RESOLVED: Catalog additive migration/API source implemented for catalog.bundle.v1 in branch goal24-catalog-bundle-api]`

## Remaining Blockers

- `[RESOLVED: Catalog bundle aggregate migration application/deploy/runtime smoke completed]`
- `[RESOLVED: Orders additive bundleEvidence metadata contract merged and validated]`
- `[RESOLVED: Warehouse component-line-only reservation sign-off merged and validated]`
- `[RESOLVED: Payments bounded bundle metadata allowlist merged and validated]`
- `[RESOLVED: FlipFlop catalog.bundle.v1 read/display adoption merged and validated]`
- `[RESOLVED: owner-approved Rung 1 non-mutating real checkout smoke passed against active catalog.bundle.v1 bundle e38ce03c-d18b-40a4-9898-f82a3f77dc0b]`
- `[MISSING: channel-specific external marketplace bundle publication policies]`

## Runtime Deployment Evidence

```bash
kubectl -n statex-apps exec -i deployment/db-server-postgres -- psql -U dbadmin -d catalog_db -v ON_ERROR_STOP=1 < scripts/migrations/20260703_catalog_bundle_aggregate.sql
```

Result: PASS. `catalog_bundles` and `catalog_bundle_items` were created additively. Immediate post-migration verification returned `bundle_rows=0`, `item_rows=0`.

```bash
./scripts/deploy.sh
```

Result: PASS. Image `localhost:5000/catalog-microservice:44ce06d` was built, pushed, rolled out, and in-pod health returned `status=healthy`.

```bash
curl -sk https://catalog.alfares.cz/health
kubectl -n statex-apps get deploy catalog-microservice
```

Result: external health HTTP 200; deployment image `localhost:5000/catalog-microservice:44ce06d`, ready=1 updated=1 available=1.

```bash
# protected in-pod runtime smoke with CATALOG_INTERNAL_SERVICE_TOKEN, token value not printed
```

Result: PASS. One synthetic internal canary bundle `257a0518-56eb-4dba-9428-4be5a25813df` was created as draft, activated, archived, and read back as archived with `contractVersion=catalog.bundle.v1`, `source=manual`, `itemCount=2`, and `validation.blockers=[bundle_archived]`.

```bash
select count(*) as bundle_rows, count(*) filter (where status='archived') as archived_rows from catalog_bundles;
select count(*) as item_rows from catalog_bundle_items;
```

Result: `bundle_rows=1`, `archived_rows=1`, `item_rows=2` for the archived synthetic runtime canary.

Boundary: no Orders rows, Warehouse reservations/stock movements, Payments/provider calls, FlipFlop checkout mutation, marketplace publication, product SKU creation, or secret output occurred.
