# VAL-GOAL-25 Generated Description State Contract

```yaml
id: VAL-GOAL-25-GENERATED-DESCRIPTION-STATE
status: deployed-and-smoked
created: 2026-07-03
catalog_repository: /home/ssf/Documents/Github/catalog-microservice
heureka_repository: /home/ssf/Documents/Github/heureka
catalog_commit: 221ef59 feat: define generated description quality state
heureka_commit: da07f7a fix: include inactive products in catalog quality lookup
catalog_image: localhost:5000/catalog-microservice:221ef59
heureka_image: localhost:5000/heureka-service:da07f7a
heureka_gateway_image: localhost:5000/heureka-api-gateway:da07f7a
```

## Intent Preservation Chain

Vision: Catalog remains the Statex product truth service for product identity, canonical sellable content, media, pricing, lifecycle, and publication readiness.

Goal Impact: generated/reviewed canonical content stored in `Product.descriptionRich` now satisfies the Goal 25 description coverage contract without leaving a global missing-contract blocker in product-quality reports.

System: Catalog owns product quality and generated-description state. Heureka consumes Catalog quality and keeps Heureka-specific feed blockers separate.

Feature: Goal 25 generated-description state contract closure.

Task: define the generated-description state source, deploy Catalog, rerun live product-quality validation, fix the Heureka quality lookup that hid inactive products from Catalog review results, deploy Heureka, and rerun Heureka readiness validation.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`, W5 follow-up.

Coding Prompt: owner approval in Codex turn: `go ahead`.

Code: Catalog `src/products/products.service.ts`, `src/products/products.service.spec.ts`, `scripts/validate-product-quality.js`, Goal 25 contract docs; Heureka `shared/clients/catalog-client.service.ts`, `shared/clients/catalog-client.service.self-test.ts`.

Validation: exact commands and results below.

State Update: generated-description blocker resolved; Heureka readiness now receives Catalog quality blockers instead of `catalog_quality_unavailable` for the sampled inactive product.

## Catalog Contract

`catalog.generated_description_state.v1` is the generated-description state contract.

State source:

- `Product.descriptionRich` with non-empty normalized plain text is `source=descriptionRich`, `status=generated`, `coversMissingDescription=true`.
- Plain `Product.description` remains `source=description`, `status=present`.
- Missing plain and rich content remains `source=missing`, `status=missing`, and still emits `missing_description`.
- Pending generation without stored canonical content remains a blocker until a separate pending-state source is added.

## Catalog Source Validation

```bash
npm test -- --runInBand src/products/products.service.spec.ts
# PASS: 1 suite, 43 tests

npm run validate:product-quality -- --format json
# PASS: synthetic read-only mode; generated-description contract blocker removed

npm run build
# PASS

git diff --check
# PASS
```

## Catalog Deployment

Deployed from clean worktree `/tmp/catalog-goal25-generated-deploy-221ef59`.

```bash
./scripts/deploy.sh
```

Result:

- Image built/pushed: `localhost:5000/catalog-microservice:221ef59`
- Rollout: PASS
- In-pod health: PASS
- Total deployment time: 33.70s

Runtime status:

```bash
kubectl get deployment catalog-microservice -n statex-apps
curl -fsS https://catalog.alfares.cz/health
```

Result:

- Deployment image: `localhost:5000/catalog-microservice:221ef59`
- Ready replicas: `1/1`
- Pod: `catalog-microservice-8747dfc89-zj9lc`, `1/1 Running`, restarts `0`
- Public health: `status=healthy`, `productEvents=up`, `bpcp=up`

## Live Product Quality Validation

```bash
CATALOG_PRODUCT_QUALITY_API_BASE=https://catalog.alfares.cz/api \
CATALOG_INTERNAL_SERVICE_TOKEN=<from catalog-microservice-secret> \
npm run validate:product-quality -- --format json --max-pages 3
```

Result:

- Source: live API, `catalog.alfares.cz/api`
- Safety: read-only, no Catalog/Warehouse/Marketplace mutation
- Blockers: `[]`
- Products scanned: 60
- Blocked: 45
- Ready for activation: 15
- Blocking fields: description 1, image 5, lifecycle 44, price 3

## Heureka Consumer Fix

The Heureka shared Catalog client previously looked up product quality with `isActive=true`. For inactive or archived products this could hide the Catalog quality item and make Heureka report `catalog_quality_unavailable` even when Catalog quality was available. The lookup now searches the review queue without the active-only filter; Heureka still applies its own `PRODUCT_INACTIVE` blocker.

Source validation:

```bash
LOGGING_SERVICE_URL=http://logging-microservice:3367 \
npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' shared/clients/catalog-client.service.self-test.ts
# PASS: catalog-client auth self-test

LOGGING_SERVICE_URL=http://logging-microservice:3367 \
services/heureka-service/node_modules/.bin/ts-node --skip-ignore --compiler-options '{"experimentalDecorators":true,"emitDecoratorMetadata":true,"types":["node"]}' services/heureka-service/src/heureka/feed/feed-readiness.self-test.ts
# PASS: feed-readiness self-test

npm --prefix shared run build
# PASS

LOGGING_SERVICE_URL=http://logging-microservice:3367 npm --prefix services/heureka-service run build
# PASS
```

Deployment:

```bash
./scripts/deploy.sh
```

Result:

- Images built/pushed: `localhost:5000/heureka-service:da07f7a`, `localhost:5000/heureka-api-gateway:da07f7a`
- Service and gateway rollouts: PASS
- Total deployment time: 136.30s

Runtime status:

- `heureka-service`: image `localhost:5000/heureka-service:da07f7a`, ready `1/1`
- `heureka-api-gateway`: image `localhost:5000/heureka-api-gateway:da07f7a`, ready `1/1`
- Public health: `https://heureka.alfares.cz/health` returned `status=ok`

## Final Cross-Service Smoke

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
- Warehouse available: 0
- FlipFlop stock quantity: 0
- Heureka readiness for `ebbdd4fa-5c73-481a-9d07-dbab3d20a150`: `blocked`
- Heureka blocker codes: `archived_product`, `missing_image`, `PRODUCT_INACTIVE`, `MISSING_CATEGORY`, `MISSING_PRIMARY_IMAGE`, `ZERO_STOCK`
- `catalog_quality_unavailable` no longer appears for the sampled product.

## Boundaries

- No database migration was added or run.
- No manual production data mutation was performed.
- No marketplace publish, Bazos draft, queue confirm, or channel publication side effect was run.
- Internal service tokens were used only as environment variables and were not printed.
- Existing unrelated dirty Catalog docs from concurrent Bazos/status orchestration were left unstaged.

## Next Action

Review remaining active product-quality blockers for real product data cleanup: missing image, missing price, archived lifecycle, and the one remaining missing description row.
