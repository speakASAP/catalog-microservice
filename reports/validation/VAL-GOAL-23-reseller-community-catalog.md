# VAL-GOAL-23: Reseller Community Catalog

```yaml
id: VAL-GOAL-23-RESELLER-COMMUNITY-CATALOG
status: runtime-e2e-verified
source_goal: implementation-goals/GOAL-23-reseller-community-catalog.md
owner: Catalog integration owner
created: 2026-07-02
last_verified: 2026-07-02T19:49:36Z
```

## Intent Compliance

- Vision preserved: sellers can share selected owned products for resale.
- Goal impact preserved: sellers start fail-closed for community source visibility; community visibility requires both owner product opt-in and viewer source opt-in.
- System boundary preserved: Catalog owns product/source access, Auth owns identity, Warehouse owns stock, marketplace services own publication/compliance.
- Sensitive data preserved: validation used owner-approved existing Auth users and did not print bearer tokens or generated JWT values.

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

## Runtime Deployment State

Read-only runtime refresh, 2026-07-02 19:49-20:00 UTC. No deploy script, image update, rollout restart, or pod deletion was run during this verification pass; the earlier infrastructure blocker recovered before E2E execution.

```bash
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && git status --short --branch && git log --oneline -5'
# ## main...origin/main
# 8850e5e docs: close goal 25 runtime validation
# 311030d docs: record order affinity batch deployment
# 618dccb fix: import product relation validators
# 6b4ff33 feat: extend product relation management
# 0f948a7 docs: record orders lifecycle statistics source contract

2026-07-02 ssh alfares 'kubectl get deployment auth-microservice catalog-microservice catalog-frontend allegro-api-gateway allegro-service aukro-service bazos-service heureka-api-gateway heureka-service flipflop-product-service flipflop-frontend flipflop-service -n statex-apps -o custom-columns=NAME:.metadata.name,READY:.status.readyReplicas,IMAGE:.spec.template.spec.containers[0].image --no-headers'
# auth-microservice          1     localhost:5000/auth-microservice:0d4282b-20260702102426
# catalog-microservice       1     localhost:5000/catalog-microservice:8850e5e
# catalog-frontend           1     localhost:5000/catalog-frontend:latest
# allegro-api-gateway        1     localhost:5000/allegro-api-gateway:6c64a30
# allegro-service            1     localhost:5000/allegro-service:6c64a30
# aukro-service              1     localhost:5000/aukro-service:ba61422
# bazos-service              1     localhost:5000/bazos-service:cdcd739
# heureka-api-gateway        1     localhost:5000/heureka-api-gateway:b80d8c4
# heureka-service            1     localhost:5000/heureka-service:b80d8c4
# flipflop-product-service   1     localhost:5000/flipflop-product-service:latest
# flipflop-frontend          1     localhost:5000/flipflop-frontend:latest
# flipflop-service           1     localhost:5000/flipflop-service:latest
```

Health checks observed during the same pass:

- `https://auth.alfares.cz/health` -> HTTP 200.
- `https://catalog.alfares.cz/health` -> HTTP 200.
- `https://allegro.alfares.cz/` -> HTTP 200.
- `https://flipflop.alfares.cz/` -> HTTP 200.
- `https://flipflop.alfares.cz/api/products?limit=1` -> HTTP 200.

## Authenticated E2E Validation

Approved-user runner:

```bash
2026-07-02 ssh alfares 'bash /tmp/run-catalog-source-e2e-approved-users.sh'
# [ssfskype-owner-test-viewer] exit=0 owner=ssfskype@gmail.com viewer=stashokmisha@gmail.com
# [test-owner-stashokmisha-viewer] exit=0 owner=test@example.com viewer=stashokmisha@gmail.com
# result_file=/tmp/catalog-source-e2e-approved-users-20260702T194936Z.jsonl
```

Validated scenarios:

- `ssfskype@gmail.com` owner -> `stashokmisha@gmail.com` viewer: pass.
- `test@example.com` owner -> `stashokmisha@gmail.com` viewer: pass.

The earlier `test@example.com` viewer attempt was discarded as a role-selection false positive, not a Catalog effective-scope defect: `test@example.com` has admin/global superadmin roles and can see more than an ordinary seller. The corrected viewer, `stashokmisha@gmail.com`, is an active `end_user` with no roles.

E2E assertions passed in both approved-user runs:

- Owner and viewer Catalog access provision/update paths returned successful settings responses.
- Owner created a product with `resaleEnabled=false`.
- Owner own-scope search returned the created product.
- Ordinary viewer effective-scope search returned `total=0` before resale sharing.
- Ordinary viewer effective-scope search still returned `total=0` after owner enabled resale while viewer community source was disabled.
- Viewer setting update enabled `includeCommunityCatalog=true`.
- Ordinary viewer effective-scope search then returned `total=1` and matched the created product.
- Non-owner product mutation was hidden/forbidden with status `404`.
- Cleanup archived the created products and restored owner/viewer settings.

Archived E2E products:

- `2d6e4b4c-02a4-4b1c-98c8-afa4ad46a32e`
- `ebbdd4fa-5c73-481a-9d07-dbab3d20a150`

The harness skipped `catalog-fresh-user-defaults` because the authorized accounts are existing real users, not fresh synthetic identities. Fail-closed defaults remain covered by source tests and by explicit E2E settings reset before each visibility assertion.

## Channel Route Smoke

The same authenticated runner also verified first-wave channel effective-picker routes with the approved viewer context:

- Allegro: `https://allegro.alfares.cz/api/products?catalogScope=effective&limit=1` -> HTTP 200.
- Aukro: `https://aukro.alfares.cz/aukro/ui/catalog/products?limit=1` -> HTTP 200.
- Bazos: `https://bazos.alfares.cz/ui/catalog/products?limit=1` -> HTTP 200.
- Heureka: `https://heureka.alfares.cz/api/heureka/dashboard/catalog-products?limit=1&source=effective` -> HTTP 200.

## Cross-Repo Coverage

Catalog contract source validation passed, Catalog runtime E2E passed, and first-wave channel effective-picker route smoke passed for Allegro, Aukro, Bazos, and Heureka.

- `docs/orchestrator/2026-07-02-reseller-community-catalog-cross-repo-plan.md`
- `docs/orchestrator/2026-07-02-catalog-source-deploy-e2e-readiness.md`

Runtime image refresh at E2E time:

- `auth-microservice` -> `localhost:5000/auth-microservice:0d4282b-20260702102426`
- `catalog-microservice` -> `localhost:5000/catalog-microservice:8850e5e`
- `catalog-frontend` -> `localhost:5000/catalog-frontend:latest`
- `allegro-api-gateway` and `allegro-service` -> `localhost:5000/allegro-*:6c64a30`
- `aukro-service` -> `localhost:5000/aukro-service:ba61422`
- `bazos-service` -> `localhost:5000/bazos-service:cdcd739`
- `heureka-api-gateway` and `heureka-service` -> `localhost:5000/heureka-*:b80d8c4`
- `flipflop-product-service`, `flipflop-frontend`, and `flipflop-service` -> `localhost:5000/flipflop-*:latest`

## Deployed Marker Evidence

Earlier deployed marker pass, retained as supporting evidence:

- Catalog frontend source checkboxes: `includeAlfaresCatalog`, `includeCommunityCatalog`; product resale marker: `resaleEnabled`.
- Allegro gateway/service: `catalogProductsRoute`, `/api/products`, and `catalogScope: 'effective'`.
- Aukro service: `data-catalog-source`, `catalogSources`, and `Komunitni resale`.
- Bazos service: `resaleEnabled`, `catalogScope: 'effective'`, and `Katalog effective`.
- Heureka service: `products-source-filter`, `Community resale`, and `Shared for resale`.

## Residual Follow-Up

No Catalog API/source-scope blocker remains for the first-wave Catalog plus Allegro/Aukro/Bazos/Heureka route-contract evidence. Remaining evidence gaps are follow-ups, not contradictions of the passed E2E run:

- Fresh-user runtime defaults were not asserted because the owner-approved accounts already existed; source tests and E2E reset paths cover fail-closed behavior, and a fresh-account smoke can be added if strict runtime proof is required.
- Full rendered cabinet/browser smoke for channel labels, checkboxes, and draft/listing account binding was not captured by this route harness.
- FlipFlop source hooks and public product routes are present, but a dedicated authenticated FlipFlop seller UI flow is outside this Catalog E2E harness and remains a channel-specific follow-up if the owner wants full FlipFlop cabinet evidence.
