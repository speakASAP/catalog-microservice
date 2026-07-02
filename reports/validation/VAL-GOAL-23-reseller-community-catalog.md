# VAL-GOAL-23: Reseller Community Catalog

```yaml
id: VAL-GOAL-23-RESELLER-COMMUNITY-CATALOG
status: runtime-catalog-verified-cross-channel-deploy-gated
source_goal: implementation-goals/GOAL-23-reseller-community-catalog.md
owner: Catalog integration owner
created: 2026-07-02
```

## Intent Compliance

- Vision preserved: sellers can share selected owned products for resale.
- Goal impact preserved: new sellers start fail-closed with Alfares source disabled and community source disabled; community visibility requires both owner product opt-in and viewer source opt-in.
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

- Settings default: Alfares false, community false.
- Seller product create: owner assigned, resale false.
- Seller product update: owner can enable resale.
- Shared/non-owned product mutation: forbidden for ordinary seller.
- Effective list scope: own + enabled source buckets.
- Dashboard source checkboxes compile and call settings API.
- Product create/edit resale checkbox compiles and sends `resaleEnabled`.

## Runtime Validation

```bash
2026-07-02 ssh alfares 'git -C /home/ssf/Documents/Github/catalog-microservice status --short --branch'
# ## main...origin/main

2026-07-02 ssh alfares 'git -C /home/ssf/Documents/Github/catalog-microservice log --oneline -3'
# 66c97e2 docs: plan dashboard catalog source options
# d2a2f66 docs: align catalog source defaults
# 2549389 fix: wait for catalog source settings before product load

2026-07-02 ssh alfares 'kubectl get deployment catalog-microservice -n statex-apps -o wide'
# catalog-microservice READY 1/1 image localhost:5000/catalog-microservice:d2a2f66

2026-07-02 ssh alfares 'kubectl get pods -n statex-apps -l app=catalog-microservice -o wide'
# catalog-microservice-6fcc9b459d-5zlzf READY 1/1 Running

2026-07-02 curl -fsS -m 8 https://catalog.alfares.cz/health
# HTTP 200 healthy, production, productEvents publisher disabled by runtime config

2026-07-02 curl -i -sS -m 8 https://catalog.alfares.cz/api/catalog/settings
# HTTP 401 Missing or invalid Authorization header

2026-07-02 curl -i -sS -m 8 https://catalog.alfares.cz/api/products
# HTTP 401 Missing or invalid Authorization header
```

Catalog runtime is deployed and healthy on image `d2a2f66`; top repository commit `66c97e2` is docs-only. Protected source/product APIs are reachable and reject unauthenticated requests as expected.

Blocked until:

- `[MISSING: approved Auth token for synthetic seller smoke]`
- `[MISSING: authorized seller E2E smoke for provision settings, toggle Alfares/community sources, create owner product, enable resale, verify effective community visibility]`

## Cross-Repo Validation

Catalog contract source validation has passed and channel source integrations were audited. Runtime deployment alignment remains incomplete for several channel services:

- `docs/orchestrator/2026-07-02-reseller-community-catalog-cross-repo-plan.md`

Source commits pushed after channel audit:

- `allegro` -> `9258129 feat: finalize catalog source controls for allegro`
- `aukro` -> `f237fda feat: finalize catalog source controls for aukro`
- `bazos` -> `9f8f2bb feat: finalize catalog source controls for bazos`
- `heureka` -> `bf467cd feat: finalize catalog source controls for heureka`
- `flipflop` -> `a463e5e feat: improve storefront product browsing`, includes `30a5e6c feat: integrate catalog user access for flipflop`

Channel source validation commands:

```bash
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/allegro/services/allegro-service && npm run build'
# PASS
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/allegro/services/frontend && npm run build'
# PASS

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/aukro/services/aukro-service && npm run build'
# PASS

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared test'
# PASS: 10 suites, 124 tests
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared run build'
# PASS
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix services/aukro-service run build'
# PASS

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/heureka/services/heureka-service && npm run build'
# PASS
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/heureka && npx ts-node services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts'
# PASS dashboard-list-products self-test
```

Current blockers:

- `[MISSING: Allegro live deployment aligned to source commit 9258129 or newer]`
- `[MISSING: Aukro live deployment aligned to source commit f237fda or newer]`
- `[MISSING: Bazos live deployment aligned to source commit 9f8f2bb or newer; current runtime is 33eaf4d with partial dirty markers]`
- `[MISSING: Heureka live deployment aligned to source commit bf467cd or newer]`
- `[MISSING: FlipFlop live deployment alignment for commit 30a5e6c after unrelated GOAL-12 dirty rollout is resolved]`
- `[MISSING: approved deploy gate before starting any new channel deploy loops]`
