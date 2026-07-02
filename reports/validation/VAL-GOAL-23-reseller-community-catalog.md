# VAL-GOAL-23: Reseller Community Catalog

```yaml
id: VAL-GOAL-23-RESELLER-COMMUNITY-CATALOG
status: source-validation-passed
source_goal: implementation-goals/GOAL-23-reseller-community-catalog.md
owner: Catalog integration owner
created: 2026-07-02
```

## Intent Compliance

- Vision preserved: sellers can share selected owned products for resale.
- Goal impact preserved: Alfares source default remains enabled; community source requires viewer opt-in and owner product opt-in.
- System boundary preserved: Catalog owns product/source access, Auth owns identity, Warehouse owns stock, marketplace services own publication/compliance.
- Sensitive data preserved: tests and docs use synthetic user/product ids only.

## Source Validation Commands

```bash
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts'
# PASS src/products/products.service.spec.ts
# PASS src/catalog-access/catalog-access.service.spec.ts
# Test Suites: 2 passed, 2 total
# Tests: 35 passed, 35 total

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm run build'
# PASS nest build

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice/services/frontend && npm run build'
# PASS Next.js build; warning only: multiple lockfiles/workspace-root inference

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && git diff --check'
# PASS no whitespace errors
```

## Expected Assertions

- Settings default: Alfares true, community false.
- Seller product create: owner assigned, resale false.
- Seller product update: owner can enable resale.
- Shared/non-owned product mutation: forbidden for ordinary seller.
- Effective list scope: own + enabled source buckets.
- Dashboard source checkboxes compile and call settings API.
- Product create/edit resale checkbox compiles and sends `resaleEnabled`.

## Runtime Validation

Blocked until:

- `[MISSING: approved Auth token for synthetic seller smoke]`

## Cross-Repo Validation

Blocked until Catalog contract source validation passes, then run one channel worker per repo according to:

- `docs/orchestrator/2026-07-02-reseller-community-catalog-cross-repo-plan.md`
