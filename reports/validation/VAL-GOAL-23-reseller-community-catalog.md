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

- `[MISSING: approved Auth tokens for two distinct synthetic seller users]`
- `[MISSING: authorized seller E2E smoke execution for provision settings, toggle Alfares/community sources, create owner product, enable resale, verify effective community visibility]`

## Prepared Authenticated E2E Harness

`scripts/catalog-source-e2e-smoke.js` is ready but intentionally token-gated and execute-gated. It does not mint Auth tokens and it does not mutate Catalog unless `CATALOG_SOURCE_E2E_EXECUTE=true` is set with two distinct approved human bearer tokens.

Expected run shape after approval:

```bash
CATALOG_SOURCE_E2E_EXECUTE=true \
CATALOG_SOURCE_E2E_EXPECT_FRESH_USERS=true \
CATALOG_SOURCE_E2E_OWNER_TOKEN='<owner human bearer>' \
CATALOG_SOURCE_E2E_VIEWER_TOKEN='<viewer human bearer>' \
npm run smoke:e2e:catalog-source
```

## Cross-Repo Validation

Catalog contract source validation has passed and channel source integrations were audited. First-wave runtime images are now aligned for Allegro, Aukro, Bazos, and Heureka; authenticated human-bearer E2E remains missing.

- `docs/orchestrator/2026-07-02-reseller-community-catalog-cross-repo-plan.md`

Source/runtime commits pushed after channel audit:

- `allegro` -> `2886b4b fix: add allegro event subscriber amqp dependency`, includes `9258129 feat: finalize catalog source controls for allegro`
- `aukro` -> `269f5d8 docs: record aukro catalog source validation`, includes `f237fda feat: finalize catalog source controls for aukro`
- `bazos` -> `9f8f2bb feat: finalize catalog source controls for bazos`
- `heureka` -> `61c5e82 docs: record heureka catalog source validation`, includes `bf467cd feat: finalize catalog source controls for heureka`
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

## Deployed Marker Evidence

Read-only deployed marker pass, 2026-07-02 15:14 UTC:

- Catalog frontend source checkboxes: `includeAlfaresCatalog`, `includeCommunityCatalog` in `/app/.next/server/chunks/ssr/_9cb9ee33._.js`; product resale checkbox marker `resaleEnabled` in `/app/.next/server/chunks/ssr/app_dashboard_products_[id]_page_tsx_e4021c16._.js`.
- Allegro gateway/service: `catalogProductsRoute`, `/api/products`, and `catalogScope: 'effective'` in deployed `dist` files.
- Aukro service: `data-catalog-source`, `catalogSources`, and `Komunitní resale` in `/app/services/aukro-service/dist/ui/ui.controller.js`.
- Bazos service: `resaleEnabled`, `catalogScope: 'effective'`, and `Katalog effective` in `/app/dist/ui/ui.assets.js`.
- Heureka service: `products-source-filter`, `Community resale`, and `Shared for resale` in `/app/dist/public/public.controller.js`.
- Marker evidence proves deployed assets contain expected UI/runtime hooks; authenticated seller E2E still remains required.

Current blockers:

- `[MISSING: approved Auth tokens for two distinct synthetic seller users]`
- `[MISSING: authorized Catalog source E2E smoke execution with `scripts/catalog-source-e2e-smoke.js`]`
- `[MISSING: authenticated channel picker/UI smoke for Allegro, Aukro, Bazos, and Heureka with a human bearer token]`
- `[MISSING: FlipFlop immutable image provenance for commit 30a5e6c after unrelated GOAL-12 dirty rollout is resolved]`
