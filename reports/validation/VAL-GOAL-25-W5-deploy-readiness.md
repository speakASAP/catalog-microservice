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

State Update: W5 deployment completed. Remaining blocker is generated-description state contract.

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
- Remaining blocker: `[MISSING: generated-description state contract]`

## Boundaries

- No database mutation was performed manually.
- No marketplace publish/confirm/queue action was run.
- No Bazos authorized draft smoke was run.
- No source code changed in W5.
- The internal service token was used only as an environment variable for smoke commands and was not printed.

## Blockers And Follow-Up

- `[MISSING: generated-description state contract]` remains.
- Channel statuses block on marketplace/account auth where expected; this is not a Catalog deploy failure.
- Heureka reports `catalog_quality_unavailable` for the sampled product alongside normal product blockers; investigate if this remains after the generated-description contract is defined.

## Next Action

Define the generated-description state contract, then rerun live product-quality and Heureka readiness validation.
