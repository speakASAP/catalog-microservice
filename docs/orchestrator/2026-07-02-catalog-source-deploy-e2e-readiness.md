# Catalog Source Controls - Deploy And E2E Readiness Handoff

```yaml
id: CATALOG-SOURCE-CONTROLS-DEPLOY-E2E-READINESS-2026-07-02
status: runtime-e2e-verified
owner: Catalog integration/orchestration owner
created: 2026-07-02
last_verified: 2026-07-02T19:49:36Z
scope:
  - catalog-microservice
  - allegro
  - aukro
  - bazos
  - heureka
  - flipflop
```

## Intent Preservation Chain

- Vision: sellers can publish selected owned products for resale, and other sellers can opt in to company and community product sources from their personal dashboards.
- Goal Impact: larger sellable assortment without transferring product ownership or marketplace account ownership.
- System: Catalog owns product truth, ownership, source settings, resale visibility, and effective product scope. Auth owns human identity. Channel services own marketplace accounts, draft/listing policy, and external publication state.
- Feature: source settings checkboxes, owner resale checkbox, effective source product pickers, source/resale labels, and channel handoff links.
- Task: deploy already pushed channel source commits, run authenticated Catalog E2E, and smoke first-wave channel effective-picker routes.
- Execution Plan: no additional deploy during this verification pass; use the current deployed images and verify read-only where possible.
- Coding Prompt: no more source coding is required for first-wave channels unless a later channel-specific UI smoke finds a defect.
- Code: runtime images listed below contain the source-sharing implementation and supporting channel controls.
- Validation: Catalog authenticated E2E passed; Allegro, Aukro, Bazos, and Heureka effective-picker route smoke passed; fresh-user runtime defaults, full rendered channel UI smoke, and FlipFlop seller UI smoke remain follow-up evidence.

## Current Runtime Images And Alignment

Read-only refresh, 2026-07-02 19:49-20:00 UTC:

| Deployment | Current image | Runtime evidence |
|---|---|---|
| `auth-microservice` | `localhost:5000/auth-microservice:0d4282b-20260702102426` | `/health` returned 200; approved-user JWT signing secret was used by the E2E runner without printing tokens |
| `catalog-microservice` | `localhost:5000/catalog-microservice:8850e5e` | `/health` returned 200; approved-user Catalog source E2E passed |
| `catalog-frontend` | `localhost:5000/catalog-frontend:latest` | deployed source-checkbox and resale markers confirmed earlier |
| `allegro-api-gateway` | `localhost:5000/allegro-api-gateway:6c64a30` | authenticated effective-picker route returned 200 |
| `allegro-service` | `localhost:5000/allegro-service:6c64a30` | source-control service runtime aligned with gateway route smoke |
| `aukro-service` | `localhost:5000/aukro-service:ba61422` | authenticated effective-picker route returned 200 |
| `bazos-service` | `localhost:5000/bazos-service:cdcd739` | authenticated effective-picker route returned 200 |
| `heureka-api-gateway` | `localhost:5000/heureka-api-gateway:b80d8c4` | authenticated effective-picker route returned 200 |
| `heureka-service` | `localhost:5000/heureka-service:b80d8c4` | source-control service runtime aligned with gateway route smoke |
| `flipflop-product-service` | `localhost:5000/flipflop-product-service:latest` | public product route returned 200; dedicated authenticated seller UI smoke remains follow-up |
| `flipflop-frontend` | `localhost:5000/flipflop-frontend:latest` | ready 1/1 |
| `flipflop-service` | `localhost:5000/flipflop-service:latest` | ready 1/1 |

No deploy script, image update, rollout restart, or pod deletion was run during this verification pass.

## Source Validation Commands Already Passed

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice/services/frontend && npm run build'

ssh alfares 'cd /home/ssf/Documents/Github/allegro/services/allegro-service && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/allegro/services/frontend && npm run build'

ssh alfares 'cd /home/ssf/Documents/Github/aukro/services/aukro-service && npm run build'

ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared test'
ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared run build'
ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix services/aukro-service run build'

ssh alfares 'cd /home/ssf/Documents/Github/heureka/services/heureka-service && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/heureka && npx ts-node services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts'
```

## Authenticated E2E Smoke Result

Approved-user runner:

```bash
2026-07-02 ssh alfares 'bash /tmp/run-catalog-source-e2e-approved-users.sh'
# [ssfskype-owner-test-viewer] exit=0 owner=ssfskype@gmail.com viewer=stashokmisha@gmail.com
# [test-owner-stashokmisha-viewer] exit=0 owner=test@example.com viewer=stashokmisha@gmail.com
# result_file=/tmp/catalog-source-e2e-approved-users-20260702T194936Z.jsonl
```

The runner used only owner-approved existing users:

- `ssfskype@gmail.com`
- `test@example.com`
- `stashokmisha@gmail.com`

The first admin-viewer attempt with `test@example.com` as viewer was not used as product-scope evidence because that user has admin/global superadmin roles. Final visibility assertions used `stashokmisha@gmail.com`, an ordinary active `end_user` with no roles.

Catalog E2E assertions passed:

- Owner/viewer provision and settings update paths worked.
- Owner-created product started with `resaleEnabled=false`.
- Owner own scope contained the created product.
- Ordinary viewer did not see the product before resale sharing.
- Ordinary viewer still did not see the product after owner resale opt-in while viewer community source was disabled.
- Ordinary viewer saw the product only after enabling `includeCommunityCatalog=true`.
- Non-owner mutation was hidden/forbidden with status `404`.
- Cleanup archived products `2d6e4b4c-02a4-4b1c-98c8-afa4ad46a32e` and `ebbdd4fa-5c73-481a-9d07-dbab3d20a150`, then restored owner/viewer settings.

The `catalog-fresh-user-defaults` assertion remained skipped because the approved accounts are existing real users, not fresh synthetic identities. Fail-closed defaults remain covered by source tests and the E2E runner explicitly resets settings before each visibility assertion.

## Authenticated Channel Route Smoke

The E2E runner also checked first-wave channel effective-picker routes with the approved viewer context:

- Allegro: `https://allegro.alfares.cz/api/products?catalogScope=effective&limit=1` -> HTTP 200.
- Aukro: `https://aukro.alfares.cz/aukro/ui/catalog/products?limit=1` -> HTTP 200.
- Bazos: `https://bazos.alfares.cz/ui/catalog/products?limit=1` -> HTTP 200.
- Heureka: `https://heureka.alfares.cz/api/heureka/dashboard/catalog-products?limit=1&source=effective` -> HTTP 200.

## Deployed UI/Runtime Marker Evidence

Earlier marker evidence remains supporting evidence that deployed assets contain the expected controls/routes:

- Catalog frontend contains `includeAlfaresCatalog`, `includeCommunityCatalog`, and product edit `resaleEnabled`.
- Allegro gateway contains `catalogProductsRoute` and `/api/products`; Allegro service contains `catalogScope: 'effective'`.
- Aukro service contains `data-catalog-source`, `catalogSources`, and `Komunitni resale`.
- Bazos service contains `resaleEnabled`, `catalogScope: 'effective'`, and `Katalog effective`.
- Heureka service contains `products-source-filter`, `Community resale`, and `Shared for resale`.

## Deploy Gate

No Catalog-source deploy is required from this handoff. Do not run deploy scripts, image changes, rollout restarts, or pod deletion unless the owner explicitly asks for a new deployment.

If a future channel-specific smoke finds a defect, use normal preflight first:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/<repo> && git status --short --branch && git log --oneline -3'
ssh alfares 'kubectl get deployment <deployments> -n statex-apps -o wide'
ssh alfares 'ps -axo pid,ppid,stat,etime,command | grep -E "deploy.sh|kubectl rollout|docker build|docker push" | grep -v grep || true'
```

## Remaining Follow-Up

No first-wave Catalog-source API/route-contract blocker remains for Catalog plus Allegro/Aukro/Bazos/Heureka evidence. Remaining evidence gaps are follow-ups, not contradictions of the passed E2E run:

- Fresh-user runtime defaults were not asserted because the owner-approved accounts already existed; source tests and E2E reset paths cover fail-closed behavior, and a fresh-account smoke can be added if strict runtime proof is required.
- Full rendered cabinet/browser smoke for channel labels, checkboxes, and draft/listing account binding was not captured by this route harness.
- FlipFlop source hooks and public product routes are present, but a dedicated authenticated FlipFlop seller UI flow remains a channel-specific follow-up if the owner wants full FlipFlop cabinet proof beyond the Catalog E2E harness.
