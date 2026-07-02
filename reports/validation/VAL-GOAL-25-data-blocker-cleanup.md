# VAL-GOAL-25 Data Blocker Cleanup

Date: 2026-07-03
Repository: `/home/ssf/Documents/Github/catalog-microservice`
Branch: `main`
Runtime image observed: `localhost:5000/catalog-microservice:221ef59`
Related consumer images observed: `localhost:5000/heureka-service:da07f7a`, `localhost:5000/heureka-api-gateway:da07f7a`

## IPS Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Catalog remains the global product truth for publishability and readiness.
- Goal Impact: Goal 25 prevents incomplete imported/new products from active marketplace publication.
- System: Catalog product quality policy plus channel consumers.
- Feature: Import draft gate, generated description state, and channel readiness blockers.
- Task: Clean up the remaining live active Catalog blocker that had no source-backed media/price.
- Execution Plan: Use only existing Catalog API paths; no SQL mutation, no fake media/price/category/stock data, no deploy.
- Coding Prompt: Demote incomplete active product to owner review/non-sellable state and validate consumers.
- Code: No source code change in this cleanup; API mutation used existing `POST /api/products/review/bulk-update`.
- Validation: Commands and results below.
- State Update: Active Catalog quality blockers are clear; remaining active Heureka blockers are stock-only.

## Preflight

Remote workflow only was used with `ssh alfares`; no project code was saved under `/Users/Sergej.Stasok/Documents`.

Catalog repo state before report update:

```text
## main...origin/main
6fa5e9a docs: record bundle candidate pricing evidence
29bdf64 docs: record goal 25 generated description validation
9299def docs: accept goal 25 cross-channel validation
01cb703 fix: update event ID in test for process paused state
73adeb7 fix: simplify event application logic by removing duplicate check
```

Runtime readiness:

```text
NAME                   READY   DESIRED   IMAGE
catalog-microservice   1       1         localhost:5000/catalog-microservice:221ef59
heureka-service        1       1         localhost:5000/heureka-service:da07f7a
heureka-api-gateway    1       1         localhost:5000/heureka-api-gateway:da07f7a
```

## Live Quality Finding Before Cleanup

Command:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && CATALOG_PRODUCT_QUALITY_API_BASE=https://catalog.alfares.cz/api CATALOG_INTERNAL_SERVICE_TOKEN=$(kubectl get secret catalog-microservice-secret -n statex-apps -o jsonpath="{.data.CATALOG_INTERNAL_SERVICE_TOKEN}" | base64 -d) npm run validate:product-quality -- --format json --max-pages 10 --out /tmp/catalog-goal25-live-quality.json'
```

Summary result:

```json
{
  "blockers": [],
  "totals": {
    "products": 60,
    "blocked": 45,
    "readyForActivation": 15,
    "byLifecycle": { "active": 16, "archived": 44 },
    "byBlockingField": { "description": 1, "image": 5, "lifecycle": 44, "price": 3 }
  },
  "activeBlocked": [
    {
      "productId": "8edc51f2-bed2-433f-8a3c-5738b49a02e1",
      "sku": "EAN4893575894",
      "title": "Cvetki gorshki",
      "lifecycle": "active",
      "isActive": true,
      "fields": ["image", "price"]
    }
  ]
}
```

Source evidence search found no approved image, price, category, or stock source in Catalog, Warehouse, Allegro, Bazos, Aukro, FlipFlop, or Heureka code/docs that could safely populate this product. Heureka Task 010 docs already identify this product as missing public image URL/file, public category text, VAT-inclusive price, and stock/exclusion decision. Therefore no media/price/category/stock data was fabricated.

## Bounded Cleanup Mutation

Command:

```bash
ssh alfares 'TOKEN=$(kubectl get secret catalog-microservice-secret -n statex-apps -o jsonpath="{.data.CATALOG_INTERNAL_SERVICE_TOKEN}" | base64 -d); curl -sS -X POST "https://catalog.alfares.cz/api/products/review/bulk-update" -H "Content-Type: application/json" -H "x-internal-service-token: $TOKEN" -H "x-service-name: goal-25-data-blocker-cleanup" --data "{\"productIds\":[\"8edc51f2-bed2-433f-8a3c-5738b49a02e1\"],\"expectedMissingField\":\"image\",\"patch\":{\"lifecycle\":\"needs_review\",\"isActive\":false},\"humanReview\":\"explicit\"}"'
```

Result:

```json
{
  "success": true,
  "policyId": "catalog.product_quality.v1",
  "requestedProductIds": ["8edc51f2-bed2-433f-8a3c-5738b49a02e1"],
  "totals": { "requested": 1, "updated": 1, "blocked": 0, "skipped": 0 },
  "quality": {
    "sku": "EAN4893575894",
    "lifecycle": "needs_review",
    "isActive": false,
    "publishable": false,
    "canActivate": false,
    "blockingMissingFields": ["image", "price"],
    "nextAction": "resolve_blockers:image,price"
  }
}
```

No source code, migrations, Kubernetes manifests, deployment scripts, marketplace publish queues, or database SQL were changed.

## Catalog Validation After Cleanup

Command:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && CATALOG_PRODUCT_QUALITY_API_BASE=https://catalog.alfares.cz/api CATALOG_INTERNAL_SERVICE_TOKEN=$(kubectl get secret catalog-microservice-secret -n statex-apps -o jsonpath="{.data.CATALOG_INTERNAL_SERVICE_TOKEN}" | base64 -d) npm run validate:product-quality -- --format json --max-pages 10 --out /tmp/catalog-goal25-after-cleanup-quality.json'
```

Result:

```json
{
  "status": "completed",
  "policyId": "catalog.product_quality.v1",
  "contract": "catalog.product_quality.validation_report.v1",
  "source": { "mode": "api", "label": "catalog.alfares.cz/api", "synthetic": false },
  "totals": {
    "products": 60,
    "blocked": 45,
    "readyForActivation": 15,
    "byLifecycle": { "active": 15, "archived": 44, "needs_review": 1 },
    "byBlockingField": { "description": 1, "image": 5, "lifecycle": 44, "price": 3 }
  },
  "blockers": [],
  "activeProducts": 15,
  "activeBlocked": []
}
```

Focused quality lookup:

```json
{
  "sku": "EAN4893575894",
  "lifecycle": "needs_review",
  "isActive": false,
  "publishable": false,
  "canActivate": false,
  "blockingMissingFields": ["image", "price"],
  "nextAction": "resolve_blockers:image,price",
  "descriptionState": {
    "contract": "catalog.generated_description_state.v1",
    "source": "descriptionRich",
    "status": "generated",
    "coversMissingDescription": true
  }
}
```

## Heureka Consumer Validation After Cleanup

Live focused readiness:

```bash
ssh alfares 'curl -sS "https://heureka.alfares.cz/heureka/feed/readiness/products/8edc51f2-bed2-433f-8a3c-5738b49a02e1?feedType=PRODUCT"'
```

Result excerpt:

```json
{
  "success": true,
  "contractVersion": "catalog-feed-readiness.v1",
  "summary": { "total": 1, "ready": 0, "blocked": 1, "warning": 0, "unknown": 0 },
  "items": [
    {
      "productId": "8edc51f2-bed2-433f-8a3c-5738b49a02e1",
      "readiness": "blocked",
      "availableStock": 0,
      "blockers": [
        { "code": "missing_image", "ownerService": "catalog-media-service" },
        { "code": "missing_current_price", "ownerService": "catalog-pricing-service" },
        { "code": "PRODUCT_INACTIVE", "ownerService": "catalog-service" },
        { "code": "MISSING_CATEGORY", "ownerService": "catalog-service" },
        { "code": "MISSING_PRIMARY_IMAGE", "ownerService": "catalog-media-service" },
        { "code": "PRICE_MISSING", "ownerService": "catalog-pricing-service" },
        { "code": "ZERO_STOCK", "ownerService": "warehouse-service" },
        { "code": "SETTINGS_INACTIVE", "ownerService": "heureka-service" }
      ],
      "catalogQuality": {
        "policyId": "catalog.product_quality.v1",
        "unavailable": false,
        "canActivate": false,
        "blockingMissingFields": ["image", "price"],
        "nextAction": "resolve_blockers:image,price"
      },
      "feedEligibility": {
        "includedInDryRun": false,
        "willMutateCatalog": false,
        "willPublishFeed": false
      }
    }
  ]
}
```

Read-only lane verifier:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/heureka && CATALOG_INTERNAL_SERVICE_TOKEN=$(kubectl get secret catalog-microservice-secret -n statex-apps -o jsonpath="{.data.CATALOG_INTERNAL_SERVICE_TOKEN}" | base64 -d) WAREHOUSE_SERVICE_TOKEN=$(kubectl get secret warehouse-microservice-secret -n statex-apps -o jsonpath="{.data.CLIPLOT_WAREHOUSE_SERVICE_TOKEN}" | base64 -d) HEUREKA_VERIFY_BASE_URL=https://heureka.alfares.cz CATALOG_SERVICE_URL=https://catalog.alfares.cz WAREHOUSE_SERVICE_URL=https://warehouse.alfares.cz npm --silent run verify:heureka-blocked-product-lanes >/tmp/heureka-blocked-lanes-after-goal25-cleanup.json'
```

Summary result:

```json
{
  "contractVersion": "heureka-blocked-product-lanes.v1",
  "activeCatalogProductsReturned": 15,
  "readiness": { "total": 15, "ready": 9, "warning": 0, "blocked": 6, "unknown": 0 },
  "blockerCounts": { "ZERO_STOCK": 6 },
  "lanes": { "stock": "blocked", "media": "ready", "catalogContent": "ready" },
  "nextActions": [
    "Stock owner: provide authoritative current stock or exclusion decisions for zero-stock products."
  ]
}
```

## Blockers And Residual Work

- `[MISSING: owner-approved public image and active positive price for SKU EAN4893575894]` remains. The product is now non-active and non-publishable until owner data exists.
- `[MISSING: Warehouse stock or explicit exclusion decisions for six active Heureka products]` remains. Heureka shows Catalog content/media lanes ready for active products, but stock lane blocked by `ZERO_STOCK`.
- Archived rows still appear in quality totals with lifecycle blockers by design; they are non-publishable and were not mutated.

## Commit And Push Status

This report is documentation-only evidence. No deploy is required because no source code changed.
