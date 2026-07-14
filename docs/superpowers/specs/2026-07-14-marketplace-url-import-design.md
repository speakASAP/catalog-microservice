# Design: Create Draft Product from a Marketplace Listing URL

## Problem

Sellers currently create products manually, copy-pasting title/description/photo
URLs from a marketplace listing (e.g. Aukro.cz) they're relisting. This is slow
and error-prone. We want: paste a listing URL, get a draft `Product` with
title, description, and photos already populated.

## Scope

First adapter: **Aukro.cz**. Built as a pluggable importer registry so future
marketplaces (Bazos.cz, eBay, ...) can be added as new adapters without
touching the core import flow. Note: the existing "bazos"/"aukro" code in this
repo (`products.controller.ts` sell-on-aukro/sell-on-bazos endpoints) is the
*opposite* direction — publishing an existing Catalog product out to those
marketplaces. This feature is strictly inbound (marketplace → draft product)
and shares no code with that outbound flow.

## How Aukro listing data is obtained

Aukro's Angular SSR frontend is itself backed by a plain JSON REST endpoint:

```
GET https://aukro.cz/backend-web/api/offers/{itemId}/offerDetail
```

Verified via direct `curl` (no auth, no special headers, no JS rendering
required) against the URL the user provided
(`https://aukro.cz/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-7124914683`).
The `itemId` (`7124914683`) is the trailing numeric segment of the listing
slug. The response includes: `name`, `descriptionStripped` (plain text),
`descriptionInHtml`, `category` (breadcrumb array), `price`/`buyNowPrice`, and
`images.original` — an ordered array of full-resolution photo URLs specific to
this listing (the raw HTML `<img>` tags on the page are polluted with
unrelated "related items" thumbnails, so the API response is used instead of
HTML scraping).

Because this is a plain HTTP JSON API, no headless browser (Playwright) is
needed for the Aukro adapter. The importer interface stays adapter-agnostic
so a future marketplace that *does* require JS rendering could still use
Playwright internally without changing the surrounding design.

## Architecture

New module: `src/product-import/`

```
product-import/
  product-import.module.ts
  product-import.service.ts
  product-import.controller.ts
  importers/
    marketplace-importer.interface.ts
    aukro.importer.ts
```

### `MarketplaceImporter` interface

```ts
interface ImportedListing {
  title: string;
  descriptionText: string;
  priceAmount?: number;
  priceCurrency?: string;
  categoryPath?: string[];
  images: string[]; // ordered, best resolution available
  sourceUrl: string;
  sourceMarketplace: string; // e.g. 'aukro'
  externalId: string;
}

interface MarketplaceImporter {
  readonly key: string; // e.g. 'aukro'
  canHandle(url: string): boolean;
  fetch(url: string): Promise<ImportedListing>;
}
```

### `AukroImporter`

- `canHandle`: hostname is `aukro.cz` or `www.aukro.cz`.
- `fetch`: extract `itemId` via regex on the URL path (trailing `-(\d+)`
  before any query string/fragment); `axios.get` the `offerDetail` endpoint;
  map fields into `ImportedListing` using `images.original`; throw a typed
  `MarketplaceFetchError` (carrying the upstream HTTP status) on failure.

### `ProductImportService.importFromUrl(url, scope)`

1. Find the first importer whose `canHandle(url)` is true; if none, throw
   `BadRequestException('Unsupported marketplace URL')`.
2. Call `importer.fetch(url)`. On `MarketplaceFetchError`, rethrow as a
   `BadGatewayException` carrying the upstream status/message.
3. Compute `sku = \`${importer.key.toUpperCase()}-${listing.externalId}\`` (e.g.
   `AUKRO-7124914683`). Look up an existing product with this SKU; if found,
   throw `ConflictException` with the existing product's `id` in the response
   body so the frontend can link to it instead of creating a duplicate.
4. Build a `CreateProductDto`:
   - `sku`, `title: listing.title`
   - `description: listing.descriptionText`
   - `descriptionRich: descriptionDocumentFromText(listing.descriptionText)`
   - `tags: ['source:' + importer.key, 'source-id:' + listing.externalId]`
   - lifecycle stays at the existing default-to-draft behavior used by manual
     product creation (no change needed there).
5. Call `ProductsService.create(dto, scope)` (existing method, unchanged).
6. For each of up to the first 12 `listing.images`, `axios.get` with
   `responseType: 'arraybuffer'`, then call the existing
   `MediaService.upload({ productId, file: { buffer, originalname, mimetype,
   size }, position: index, isPrimary: index === 0 })`. If an individual
   image download fails, log and skip it — do not fail the whole import.
7. Return the created product (same shape as `POST /api/products`).

### Controller endpoint

`POST /api/products/import-from-url` on the existing `ProductsController`,
guarded by `CatalogAuthGuard` (same as other write endpoints), body
`{ url: string }`, delegates to `ProductImportService.importFromUrl`.

## Frontend

`services/frontend/app/dashboard/products/new/page.tsx` gets a new box above
the existing manual form: a URL input + "Create draft from link" button,
calling a new `productsApi.importFromUrl(url)`. On success, redirect to
`/dashboard/products/{productId}` exactly like the manual-entry success path
already does. On 409 (duplicate), show a message linking to the existing
product. The manual form below is unchanged, still usable directly or to
edit/complete the imported draft afterward.

## Error handling summary

| Condition | Response |
|---|---|
| URL doesn't match any importer | 400 |
| Upstream marketplace fetch fails (e.g. listing deleted) | 502, upstream status/message included |
| SKU already imported | 409, includes existing product id |
| One or more images fail to download | Import still succeeds; failed images are skipped and logged |

## Testing

- `AukroImporter.fetch()` unit test against a saved fixture of the real
  `offerDetail` JSON response (captured from the URL used during design).
- `ProductImportService.importFromUrl()` unit tests: happy path, unsupported
  URL, duplicate SKU, partial image-download failure.
- No live e2e test against Aukro's production API in CI (fixture-based only).
