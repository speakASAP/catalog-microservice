# Catalog Source Controls - Deploy And E2E Readiness Handoff

```yaml
id: CATALOG-SOURCE-CONTROLS-DEPLOY-E2E-READINESS-2026-07-02
status: deploy-and-auth-gated
owner: Catalog integration/orchestration owner
created: 2026-07-02
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
- Task: deploy already pushed channel source commits, then run authenticated E2E smoke.
- Execution Plan: deploy only with explicit owner gate, one repo at a time, using immutable commit tags, and verify runtime image before moving to the next channel.
- Coding Prompt: no more source coding is required for first-wave channels unless runtime smoke finds a defect.
- Code: source commits listed below are pushed to origin.
- Validation: source validation passed; runtime channel deployment and authenticated E2E remain missing.

## Current Source Commits

| Repo | Required commit | Status |
|---|---:|---|
| `catalog-microservice` | `fdb7df4` | pushed; runtime backend image is `d2a2f66`; `10c48de` fail-closed code is an ancestor of `d2a2f66`, and later top commits are docs-only |
| `allegro` | `9258129` | pushed |
| `aukro` | `269f5d8` | pushed; runtime feature code is in `f237fda`, validation docs in `269f5d8` |
| `bazos` | `9f8f2bb` | pushed and deployed |
| `heureka` | `61c5e82` | pushed and deployed; runtime feature code is in `bf467cd`, validation docs in `61c5e82` |
| `flipflop` | `a463e5e` | pushed; includes `30a5e6c` Catalog effective-scope commit |

## Current Runtime Images And Alignment

| Deployment | Current image | Required alignment |
|---|---|---|
| `allegro-api-gateway` | `localhost:5000/allegro-api-gateway:2886b4b` | aligned; `/api/products?catalogScope=effective&limit=1` returns protected `401` without token |
| `allegro-frontend` | `localhost:5000/allegro-frontend:salespoint-20260702170737` | fresh salespoint image; authenticated UI smoke still required |
| `allegro-service` | `localhost:5000/allegro-service:2886b4b` | aligned to source history |
| `aukro-service` | `localhost:5000/aukro-service:269f5d8` | aligned |
| `bazos-service` | `localhost:5000/bazos-service:9f8f2bb` | aligned |
| `heureka-api-gateway` | `localhost:5000/heureka-api-gateway:61c5e82` | aligned |
| `heureka-service` | `localhost:5000/heureka-service:61c5e82` | aligned |
| `flipflop-product-service` | `localhost:5000/flipflop-product-service:goal12-upsell-20260702163830` | immutable provenance proving `30a5e6c` and active GOAL-12 work |

## Deploy Gate

Do not run these commands until the owner explicitly approves channel deployment alignment.

Run one repo at a time. Before each deploy:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/<repo> && git status --short --branch && git log --oneline -3'
ssh alfares 'kubectl get deployment <deployments> -n statex-apps -o wide'
ssh alfares 'ps -axo pid,ppid,stat,etime,command | grep -E "deploy.sh|kubectl rollout|docker build|docker push" | grep -v grep || true'
```

Expected source preflight:

- `allegro`: only unrelated `docs/orchestrator/2026-07-02-related-products-order-affinity-plan.md` may remain untracked.
- `aukro`: unrelated dirty `reports/validation/ips-pre-coding-gate.json` and related-products artifacts may remain; do not stage them.
- `bazos`: only unrelated related-products plan may remain untracked.
- `heureka`: expected clean after `61c5e82`.
- `flipflop`: dirty GOAL-12 upsell work remains active; do not deploy Catalog source work there unless the GOAL-12 owner confirms the desired image/provenance.

## Source Validation Commands Already Passed

```bash
ssh alfares 'cd /home/ssf/Documents/Github/allegro/services/allegro-service && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/allegro/services/frontend && npm run build'

ssh alfares 'cd /home/ssf/Documents/Github/aukro/services/aukro-service && npm run build'

ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared test'
ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared run build'
ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix services/aukro-service run build'

ssh alfares 'cd /home/ssf/Documents/Github/heureka/services/heureka-service && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/heureka && npx ts-node services/heureka-service/src/heureka/dashboard/dashboard-list-products.self-test.ts'
```

## Candidate Deploy Commands

No Catalog-source channel deploy command is currently recommended from this handoff. Allegro, Aukro, Bazos, and Heureka are image-aligned for the first-wave source-control work. Deploy again only if authenticated smoke finds a channel-specific defect and the owner explicitly approves that repair.

```bash
# none at this gate
```

FlipFlop is excluded from this deploy set until the active GOAL-12 work owner provides immutable-image guidance.

## Read-Only Runtime Refresh 2026-07-02 15:10 UTC

- `catalog-microservice` is ready on `localhost:5000/catalog-microservice:d2a2f66`; `/health` returned `200`; `/api/catalog/settings` returned `401` without a bearer token.
- `catalog-frontend` is ready on `localhost:5000/catalog-frontend:latest`; `/` returned `200`.
- `allegro-api-gateway` and `allegro-service` are ready on `localhost:5000/allegro-*:2886b4b`; `allegro-frontend` is ready on `localhost:5000/allegro-frontend:salespoint-20260702170737`; `/api/products?catalogScope=effective&limit=1` returned `401` without a bearer token.
- `aukro-service` is ready on `localhost:5000/aukro-service:269f5d8`; `/aukro/ui/catalog/products?limit=1` returned protected `403` without a bearer token.
- `bazos-service` is ready on `localhost:5000/bazos-service:9f8f2bb`; `/ui/catalog/products?limit=1` returned `401` without a bearer token.
- `heureka-api-gateway` and `heureka-service` are ready on `localhost:5000/heureka-*:61c5e82`; `/api/heureka/dashboard/catalog-products?limit=1&source=effective` returned `401` without a bearer token.

## Post-Deploy Runtime Checks

```bash
ssh alfares 'kubectl get deployment allegro-api-gateway allegro-frontend allegro-service aukro-service bazos-service heureka-api-gateway heureka-service -n statex-apps -o wide'
ssh alfares 'kubectl get pods -n statex-apps -l app=allegro-service -o wide'
ssh alfares 'kubectl get pods -n statex-apps -l app=aukro-service -o wide'
ssh alfares 'kubectl get pods -n statex-apps -l app=bazos-service -o wide'
ssh alfares 'kubectl get pods -n statex-apps -l app=heureka-service -o wide'
```

Protected-route shape checks without a token:

```bash
curl -i -sS -m 8 'https://catalog.alfares.cz/api/catalog/settings'
curl -i -sS -m 8 'https://heureka.alfares.cz/api/heureka/dashboard/catalog-products?limit=1&source=effective'
curl -i -sS -m 8 'https://aukro.alfares.cz/aukro/ui/catalog/products?limit=1'
curl -i -sS -m 8 'https://bazos.alfares.cz/ui/catalog/products?limit=1'
curl -i -sS -m 8 'https://allegro.alfares.cz/api/products?catalogScope=effective&limit=1'
```

Expected unauthenticated results:

- Catalog settings: `401`.
- Heureka dashboard products: `401`.
- Bazos UI catalog products: `401`.
- Aukro UI catalog products: protected `403` or authenticated route behavior.
- Allegro `/api/products`: `401`.

## Authenticated E2E Smoke Requirements

Requires an owner-approved human Auth bearer token. Do not mint Auth JWTs locally.

Minimum Catalog smoke:

1. `POST /api/catalog/access/provision` returns settings with `includeAlfaresCatalog=false` and `includeCommunityCatalog=false` for a new/synthetic seller.
2. `PUT /api/catalog/settings` toggles Alfares and community source booleans for the current Auth subject.
3. `POST /api/products` creates an owner-scoped product with `resaleEnabled=false`.
4. Owner update sets `resaleEnabled=true`.
5. A different seller with community disabled does not see the product in `catalogScope=effective`.
6. The same different seller with community enabled sees the product in `catalogScope=effective`.
7. Non-owner update/delete is forbidden or hidden by UI.

Minimum channel smoke:

1. Allegro picker requests Catalog effective scope with human bearer and shows source/resale labels.
2. Aukro dashboard picker requests effective scope and honors source checkboxes.
3. Bazos client catalog flow uses effective scope and can save owner product with optional `resaleEnabled`.
4. Heureka dashboard source filter works for `effective`, `own`, `alfares`, and `community`.
5. Channel draft/listing operations remain bound to the current user's channel account/identity.

Prepared Catalog E2E harness:

```bash
CATALOG_SOURCE_E2E_EXECUTE=true \
CATALOG_SOURCE_E2E_EXPECT_FRESH_USERS=true \
CATALOG_SOURCE_E2E_OWNER_TOKEN='<owner human bearer>' \
CATALOG_SOURCE_E2E_VIEWER_TOKEN='<viewer human bearer>' \
npm run smoke:e2e:catalog-source
```

Optional read-only channel picker route smoke:

```bash
CATALOG_SOURCE_E2E_EXECUTE=true CATALOG_SOURCE_E2E_CHANNEL_ROUTES=true ...
```

## Remaining Blockers

- `[MISSING: approved human Auth bearer tokens for two distinct sellers to run Catalog source E2E smoke]`
- `[MISSING: authenticated channel picker/UI smoke with human bearer after image alignment]`
- `[MISSING: FlipFlop immutable image provenance after GOAL-12 dirty rollout]`
