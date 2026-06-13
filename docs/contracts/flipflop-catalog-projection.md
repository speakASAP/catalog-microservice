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
| `availability.warehouses[]` | Warehouse per-location availability rows with `warehouseId`, `warehouseCode`, `warehouseName`, `warehouseType`, `supplierId`, quantity, reserved, and available | Warehouse owns stock origin classification; Catalog only forwards it. |
| `availability.logistics` | Warehouse product logistics plan with preferredRoute, route options, and ordered route legs for local fulfillment, supplier replenishment, and supplier dropship/direct routes | Warehouse owns logistics route interpretation and leg semantics; Catalog only forwards it. FlipFlop `stockQuantity` is calculated from traceable reservable route availability, while raw Warehouse totals remain visible inside `availability` for diagnostics. |
| `stockQuantity` | Sum of traceable reservable Warehouse logistics route availability | Compatibility alias for FlipFlop sellable stock only; raw Warehouse totals remain in `availability`. |
| `readiness` | Catalog channel readiness for `flipflop` | FlipFlop remains authority for storefront and checkout behavior. |


## Stock Origin Visibility

`availability.warehouses[]` lets consumers distinguish Alfares-owned physical stock from supplier or dropship stock without making Catalog an inventory authority. `warehouseType` values come from Warehouse, for example `own`, `supplier`, or `dropship`. `supplierId` is a Warehouse reference for supplier/dropship warehouses and does not expose supplier credentials.

## Availability Filtering

By default, products are returned only when the FlipFlop readiness entry is ready and Warehouse-sourced `totalAvailable` is greater than zero. Set `includeUnavailable: true` to include unavailable or blocked products with explicit readiness and availability fields.

Unknown product IDs are reported in `invalidProductIds` and no projections are emitted for that request.

## Warehouse Stock Coverage Read Model

Catalog also exposes a protected stock coverage audit endpoint for operators and channel checks that need to confirm Catalog goods have Warehouse-backed stock and a reservable Warehouse logistics route with route legs before treating them as sellable.

```http
POST /api/products/availability/coverage
Authorization: Bearer <catalog-approved caller token>
Content-Type: application/json
```

Request:

```json
{
  "productIds": ["catalog-product-id"],
  "warehouseIds": ["optional-warehouse-filter"]
}
```

Each response item includes `coverageStatus`, `stockOrigin`, `sellableWithWarehouse`, available totals by local/supplier/dropship origin, `preferredRoute`, `blockingReasons`, forwarded Warehouse rows, and the Warehouse-owned `logistics` plan. The forwarded logistics plan must preserve Warehouse route legs, including local warehouse-to-customer, supplier-to-Alfares handoff plus Alfares-to-customer, or direct supplier-to-customer dropship paths. Catalog only attaches a Warehouse logistics plan when its product ID and total quantity/reserved/available values match the Warehouse availability row for the same Catalog product; stale, duplicate, or unrequested route plans are ignored and the product remains blocked as `missing_route` when stock exists without consistent logistics evidence. `covered` requires positive Warehouse availability and at least one reservable Warehouse logistics route with route-leg evidence. Supplier replenishment and dropship routes must also carry the Warehouse-owned `supplierId` before Catalog or FlipFlop can treat them as sellable. `missing_stock` and `missing_route` are blocking diagnostics; Catalog does not fabricate stock or logistics fallbacks.

For operator audits across Catalog goods, use the paginated protected endpoint below. It defaults to active products and returns Catalog pagination plus the same coverage totals and per-product diagnostics for the current page.

```http
GET /api/products/availability/coverage/audit?page=1&limit=20&isActive=true
Authorization: Bearer <catalog-approved caller token>
```

## Boundary Constraints

- Catalog does not implement FlipFlop storefront UX, cart, checkout, order, or payment behavior.
- Catalog does not persist stock quantities, reservations, movements, or warehouse locations.
- Existing `GET /api/products` and `GET /api/products/:id` response envelopes remain unchanged.
- The projection endpoint is additive and protected by Catalog auth.
