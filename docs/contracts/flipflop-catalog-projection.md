# FlipFlop Catalog Projection Contract

```yaml
id: CONTRACT-CATALOG-FLIPFLOP-PROJECTION
status: implemented-source
owner: catalog
created: 2026-06-13
last_updated: 2026-06-13
source_goal: implementation-goals/GOAL-06-flipflop-catalog-projection.md
```

## Purpose

Catalog exposes a bounded projection contract for FlipFlop product consumption. The contract lets FlipFlop consume Catalog product truth, deterministic current pricing, channel readiness, and Warehouse-sourced availability without moving storefront, cart, checkout, or UX ownership into Catalog.

## Endpoint

```http
POST /api/products/projections/flipflop/batch
Authorization: Bearer <catalog-approved caller token>
Content-Type: application/json
```

Request:

```json
{
  "productIds": ["catalog-product-id"],
  "includeUnavailable": false
}
```

Response envelope:

```json
{
  "success": true,
  "data": {
    "requestedProductIds": ["catalog-product-id"],
    "invalidProductIds": [],
    "items": []
  }
}
```

## Field Mapping

| Projection field | Source | Ownership note |
|---|---|---|
| `id`, `productId`, `sku`, `title`, `description`, `brand`, `manufacturer`, `lifecycle`, `isActive`, `seoData`, `tags`, timestamps | Catalog product truth | Catalog remains product truth authority. |
| `name` | Catalog `title` | Compatibility alias for FlipFlop only. |
| `categories` | Catalog category relations | Catalog owns category truth. |
| `media`, `mainImageUrl`, `imageUrls` | Catalog external media references | Media remains external URL/object references; no inline blobs. |
| `price.amount` | Catalog deterministic current price, sale price first, otherwise base price | Marked with `source: "catalog_pricing"`. |
| `availability.totalQuantity`, `availability.totalReserved`, `availability.totalAvailable` | Warehouse availability contract through Catalog bridge | Marked with `source: "warehouse"`; Catalog does not store or own stock. |
| `stockQuantity` | Warehouse `totalAvailable` | Compatibility alias for FlipFlop only. |
| `readiness` | Catalog channel readiness for `flipflop` | FlipFlop remains authority for storefront and checkout behavior. |

## Availability Filtering

By default, products are returned only when the FlipFlop readiness entry is ready and Warehouse-sourced `totalAvailable` is greater than zero. Set `includeUnavailable: true` to include unavailable or blocked products with explicit readiness and availability fields.

Unknown product IDs are reported in `invalidProductIds` and no projections are emitted for that request.

## Boundary Constraints

- Catalog does not implement FlipFlop storefront UX, cart, checkout, order, or payment behavior.
- Catalog does not persist stock quantities, reservations, movements, or warehouse locations.
- Existing `GET /api/products` and `GET /api/products/:id` response envelopes remain unchanged.
- The projection endpoint is additive and protected by Catalog auth.
