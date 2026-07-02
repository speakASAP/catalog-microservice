# VAL-GOAL-25 W5 Deploy Readiness

```yaml
id: VAL-GOAL-25-W5-DEPLOY-READINESS
status: deployed-and-smoked
created: 2026-07-03
repository: /home/ssf/Documents/Github/catalog-microservice
branch: main
deployed_commit: e292b11 docs: close goal 25 w4 validation report
image: localhost:5000/catalog-microservice:e292b11
deployment_url: https://catalog.alfares.cz
```

## Intent Preservation Chain

Vision: Catalog remains the Statex product truth service for product identity, sellable content, pricing, media, and publication readiness.

Goal Impact: Goal 25 import/new-product draft gates and channel readiness consumers are live behind Catalog's product-quality readiness contract.

System: Catalog owns product truth/readiness. Warehouse owns stock. Channel services consume Catalog readiness and own their own publish/feed/account behavior.

Feature: Goal 25 W5 final integration/deploy-readiness.

Task: deploy the approved Catalog W4 commit and run live read-only smoke validation.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`, W5.

Coding Prompt: owner approval in current Codex turn: "I approve. Go ahead".

Code: no source code changed in W5; W4 code was already pushed in `b681c95`.

Validation: exact command evidence below.

State Update: W5 deployment completed. Generated-description state contract is now resolved through `catalog.generated_description_state.v1` using `Product.descriptionRich`; cross-channel acceptance was refreshed on 2026-07-03.

## Preflight

```bash
cd /home/ssf/Documents/Github/catalog-microservice
git status --short --branch
git branch --show-current
git log -1 --oneline
```

Result:

- Worktree clean: `## main...origin/main`
- Branch: `main`
- Head: `e292b11 docs: close goal 25 w4 validation report`

## Fresh Deploy-Gate Validation

```bash
npm test -- --runInBand src/products/products.service.spec.ts src/import-reconciliation/import-reconciliation.service.spec.ts
# PASS: 2 suites, 48 tests

npm run build
# PASS: nest build

npm run validate:product-quality -- --format json
# PASS: synthetic read-only mode; products=3, blocked=2, readyForActivation=1
```

## Deployment

```bash
./scripts/deploy.sh
```

Result:

- Preflight: PASS
- Built and pushed image: `localhost:5000/catalog-microservice:e292b11`
- Applied Kubernetes manifests
- Set deployment image
- Rollout: PASS, `deployment "catalog-microservice" successfully rolled out`
- In-pod health: PASS, `{"status":"healthy","service":"catalog-microservice","environment":"production"}`
- Total deploy time: 56.99s

## Runtime Status

```bash
kubectl get pods -n statex-apps -l app=catalog-microservice -o wide
kubectl get deployment catalog-microservice -n statex-apps -o jsonpath='image={.spec.template.spec.containers[0].image} ready={.status.readyReplicas}/{.status.replicas}'
curl -fsS https://catalog.alfares.cz/health
```

Result:

- Pod: `catalog-microservice-6b668c4b55-r484q`, `1/1 Running`, restarts `0`
- Deployment image: `localhost:5000/catalog-microservice:e292b11`
- Ready replicas: `1/1`
- Public health: HTTP 200, `status=healthy`

## Smoke Validation

Unauthenticated smoke:

```bash
npm run smoke:e2e
```

Result: health and protection checks passed; product search returned `401`, which confirms the endpoint is protected without auth. Authorized smoke was required for product read checks.

Authorized smoke:

```bash
CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN=<from catalog-microservice-secret> npm run smoke:e2e:authorized
```

Result:

- PASS: 11
- SKIP: 4
- FAIL: 0
- Product search/detail: PASS
- Warehouse availability: PASS, `totalQuantity=0`, `totalReserved=0`, `totalAvailable=0`
- FlipFlop projection: PASS, `stockQuantity=0`, `warehouseSource=warehouse`

Read-only channel/status smoke:

```bash
CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN=<from catalog-microservice-secret> \
CATALOG_SMOKE_ENABLE_HEUREKA_READINESS=true \
CATALOG_SMOKE_ASSERT_STOCK=true \
npm run smoke:e2e:channel-status
```

Result:

- PASS: 19
- SKIP: 1
- FAIL: 0
- Warehouse stock consistency: PASS, Warehouse available `0`, FlipFlop stock `0`
- FlipFlop status: PASS, authority `flipflop`, blocked `true`, reason `auth_required`
- Allegro status: PASS, authority `allegro`, blocked `true`, reason `auth_required`
- Bazos status: PASS, authority `bazos`, blocked `true`, reason `auth_required`
- Aukro status: PASS, authority `aukro`, blocked `true`, reason `auth_required`
- Heureka readiness: PASS, readiness `blocked`, blockers included `catalog_quality_unavailable`, `PRODUCT_INACTIVE`, `MISSING_CATEGORY`, `MISSING_PRIMARY_IMAGE`, `PRICE_MISSING`, `ZERO_STOCK`
- Bazos draft smoke skipped intentionally because the repo marks it as side-effect-risk.

Live product-quality API validation:

```bash
CATALOG_PRODUCT_QUALITY_API_BASE=https://catalog.alfares.cz/api \
CATALOG_INTERNAL_SERVICE_TOKEN=<from catalog-microservice-secret> \
npm run validate:product-quality -- --format json --max-pages 3
```

Result:

- PASS: live API mode
- Products scanned: 60
- Blocked: 45
- Ready for activation: 15
- Safety: read-only, no Catalog/Warehouse/Marketplace mutation
- Generated-description contract: RESOLVED through `catalog.generated_description_state.v1`; refreshed synthetic audit now has only the live API base/token marker when run without live credentials.

## Boundaries

- No database mutation was performed manually.
- No marketplace publish/confirm/queue action was run.
- No Bazos authorized draft smoke was run.
- No source code changed in W5.
- The internal service token was used only as an environment variable for smoke commands and was not printed.

## Blockers And Follow-Up

- No Goal 25 product-quality contract blocker remains after generated-description state resolution.
- Channel statuses block on marketplace/account auth where expected; this is not a Catalog deploy failure.
- Heureka feed readiness self-test passed in the 2026-07-03 cross-channel acceptance refresh. Live sampled-product readiness can still show ordinary product/account blockers, which are channel readiness outcomes rather than Catalog contract failures.

## Next Action

Goal 25 W5 can be treated as accepted for Catalog/Aukro/Bazos/Allegro/FlipFlop/Heureka source and runtime-health evidence. Next cross-service work should use live authorized smoke tokens only when owner-approved and keep marketplace/account blockers channel-owned.

## 2026-07-03 Cross-Channel Acceptance Refresh

Additional remote-only validation was run after the Aukro consumer deployment and generated-description contract resolution:

| Scope | Evidence |
|---|---|
| Catalog focused tests | `npm test -- --runInBand src/products/products.service.spec.ts src/import-reconciliation/import-reconciliation.service.spec.ts` passed: 2 suites, 49 tests. |
| Catalog build/report | `npm run build` passed; `npm run validate:product-quality -- --format json --out reports/validation/product-quality-audit.json` passed in synthetic read-only mode, products=3, blocked=2, readyForActivation=1. |
| Allegro consumer | `LOGGING_SERVICE_URL=http://logging-microservice:3367 npx ts-node services/allegro-service/src/allegro/catalog-sell-action/catalog-sell-action.spec.ts` passed. |
| Bazos consumer | `npm --prefix shared test -- bazos-catalog-sell-action.service.spec.ts publish-policy.service.spec.ts bazos-ad.service.spec.ts` passed: 3 suites, 67 tests. |
| Aukro consumer | `npm --prefix services/aukro-service test -- --runInBand src/aukro/offers/offers.service.spec.ts` passed; deployed Aukro health returned HTTP 200 `status=ok` on image `localhost:5000/aukro-service:4cdd671`. |
| Heureka consumer | `feed-readiness.self-test.ts` passed; shared build and Heureka service build passed after the active Goal 25 lookup broadening was reconciled on `main`. |
| FlipFlop consumer | `node scripts/verify-catalog-product-quality-blockers.js` passed; shared build and product-service build passed after the active client syntax repair was reconciled on `main`. |
| Runtime health | Catalog, Allegro, Bazos, Aukro, and Heureka public health endpoints returned HTTP 200; FlipFlop product-quality verification passed through its repo script rather than `/health`, which is not its public health route. |

All listed checks preserved the boundary that Catalog owns product quality/readiness, Warehouse owns stock quantities, and channel services own marketplace publication/feed/account behavior.

## 2026-07-03 Live Authorized Smoke Refresh

Owner-approved protected smoke validation was rerun after aligning Allegro runtime with its Goal 25 source commit.

| Scope | Evidence |
|---|---|
| Allegro deploy alignment | Allegro `main` at `5d189ee Guard Allegro mutations on Catalog quality` was validated and deployed; `allegro-service`, `allegro-api-gateway`, `allegro-settings`, `allegro-imports`, and `allegro-frontend` rolled out successfully on image tag `5d189ee`. |
| Allegro source validation | `git diff --check`, `catalog-sell-action.spec.ts`, `offers.catalog-quality.spec.ts`, `policy-engine.spec.ts`, `publish-lifecycle.update-terminal.spec.ts`, `npm --prefix shared run build`, and `npm --prefix services/allegro-service run build` passed. |
| Authorized Catalog smoke | `CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN=<secret> CATALOG_SMOKE_SERVICE_NAME=catalog-microservice npm run smoke:e2e:authorized` passed with 11 pass, 4 skip, 0 fail. |
| Read-only channel status smoke | `CATALOG_SMOKE_ENABLE_HEUREKA_READINESS=true CATALOG_SMOKE_ASSERT_STOCK=true npm run smoke:e2e:channel-status` passed with 19 pass, 1 skip, 0 fail. Channel statuses remained channel-owned and blocked on expected auth/account requirements. |
| Live product-quality API validation | `CATALOG_PRODUCT_QUALITY_API_BASE=https://catalog.alfares.cz/api CATALOG_INTERNAL_SERVICE_TOKEN=<secret> npm run validate:product-quality -- --format json --max-pages 3` passed in API/read-only mode: products=60, blocked=45, readyForActivation=15, blockers=[]. |

The Bazos authorized draft smoke remained intentionally skipped because the script marks it as side-effect-risk. No token value was intentionally printed by the smoke commands, and no marketplace publish/confirm/queue action, Warehouse mutation, production data mutation, or Auth/RBAC change was performed.
