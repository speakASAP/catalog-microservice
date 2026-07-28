# Import from URL — Sbazar importer + Catalog UI

Date: 2026-07-28
Status: approved

## Goal

A user pastes a marketplace listing URL into the Catalog interface and gets a fully
imported product: title, description, price and all photos. Aukro and Sbazar work
from the start. Allegro and the remaining marketplaces come later, behind the same
interface.

## Background

`catalog-microservice` already exposes `POST /api/products/import-from-url` backed by
`ProductImportService` and a `MarketplaceImporter` interface. Only `AukroImporter` is
registered, and there is no UI — the endpoint is API-only today.

Two gaps close in this work:

1. No Sbazar importer.
2. No user-facing entry point, so the feature is invisible in the Catalog dashboard.

## Non-goals

- Publishing to marketplaces. Outbound listing lives in the `bazos`, `aukro`,
  `allegro` and `heureka` repos and is a separate task.
- Importers beyond Aukro and Sbazar.
- Creating `categories` tree records from the imported category path. The path is
  recorded as listing data only, matching current Aukro behaviour.

## Architecture

### 1. SbazarImporter

`src/product-import/importers/sbazar.importer.ts`, implementing `MarketplaceImporter`
alongside `AukroImporter`. No change to the controller or the public API surface —
`importFromUrl` already dispatches by `canHandle(url)`.

Sbazar has **no public JSON API**. Five candidate endpoints were probed
(`/api/v1/items/{id}/`, `/api/v2/offers/{id}`, `api.sbazar.cz`, …); all returned
404 or 301. The site is Astro server-rendered, so `fetch()` retrieves the listing
HTML and parses it in two layers:

**Primary — Astro island props.** The page embeds `<astro-island props="…">` whose
payload carries `ssrOffer`: the complete offer object including `name`,
`description`, `price`, `category` and the full `images` array. Astro serializes
props as `[type, value]` tuples, so a small decoder unwraps them.

**Fallback — JSON-LD.** `<script type="application/ld+json">` provides a `Product`
(name, description, price, priceCurrency, first image) and a `WebPage` whose
`breadcrumb` yields the category path. Used when the island payload is absent or
its shape changed, so an Astro version bump degrades photo coverage instead of
failing the import outright.

`canHandle` matches `*.sbazar.cz`. `externalId` is parsed from `/inzerat/<id>-<slug>`.

### 2. Image handling

Raw `sdn.cz` image URLs return **401**. Only the exact transform presets the page
itself references are accepted — arbitrary `fl` parameters return 400 (verified).
The highest-resolution preset available is:

```
?fl=exf|crr,1.33333,2|res,1536,1152,1|wrm,/watermark/sbazar.png,10,10|webp,75
```

which serves ~864×1152 WebP, ~89 KB, **with an Sbazar watermark burned in**. There
is no unwatermarked or higher-resolution path through Sbazar. This is acceptable for
the catalog record; original photos should be uploaded directly when a listing is
published to other marketplaces, since some reject competitor watermarks.

`allowedImageUrl` restricts downloads to `https:` on `*.sdn.cz`.

### 3. Price persistence

`ImportedListing` already declares `priceAmount` / `priceCurrency`, but
`ProductImportService` drops them. The service gains `PricingService` and, after
creating the product, upserts pricing whenever the importer supplied a price:

```ts
{ productId, basePrice, currency, priceType: 'regular', isActive: true }
```

This sits on the shared path, so any importer benefits. Aukro's `offerDetail`
response carries no price field today, so in practice only Sbazar populates it until
Aukro's mapping is extended.

### 4. Catalog UI

`services/frontend` (Next.js + Tailwind, `lib/api/*` clients, `useAuth`).

- `lib/api/products.ts` — add `importFromUrl(url)` calling
  `POST /products/import-from-url` through the existing `apiClient`.
- `components/ImportFromUrlDialog.tsx` — modal with a URL field, a submit button, an
  inline list of supported marketplaces, and three result states: success (links to
  the created product), duplicate (409 — links to the existing product), and error
  (surfaces the upstream message).
- `app/dashboard/products/page.tsx` — an "Import from URL" action beside the existing
  "New Product" button in the header, opening the dialog. On success the list
  refreshes.

Supported-marketplace hints are a single frontend constant so adding Allegro later
touches one line plus a new importer.

### 5. Error handling

Existing semantics are preserved and surfaced in the UI:

| Condition | Backend | UI |
|---|---|---|
| Unsupported host | 400 `Unsupported marketplace URL` | Inline error naming supported marketplaces |
| Listing already imported | 409 with `existingProductId` | Link to the existing product |
| Upstream fetch failure | 502 with `upstreamStatus` | Inline error, retry available |
| Individual image fails | logged warning, import continues | Product created with fewer photos |

Image downloads stay best-effort: a failed photo never fails the import.

## Testing

- `importers/sbazar.importer.spec.ts` against a saved HTML fixture
  (`__fixtures__/sbazar-listing.html`), asserting the exact mapping — title,
  description, price, currency, category path and all image URLs — plus URL
  recognition, id extraction, the JSON-LD fallback path, and `MarketplaceFetchError`
  on upstream failure.
- `product-import.service.spec.ts` — extended to cover price upsert when a listing
  carries a price, and no pricing write when it does not.
- Frontend: typecheck and build.

## Rollout

Typecheck and tests → deploy `catalog-microservice` (serialized, deploy lock) →
import the owner's listing
`https://www.sbazar.cz/inzerat/232280241-prodam-peugeot-boxer-2003-22-hdi`
via the UI → verify product, media rows and pricing row.

Expected result: SKU `SBAZAR-232280241`, "Prodám peugeot boxer 2003 2.2 hdi",
15 000 CZK, category path Auto-moto › Nákladní a užitkové vozy › Do 3,5 t,
9 photos in MinIO, tags `source:sbazar` and `source-id:232280241`.

## Risks

- HTML scraping is more brittle than Aukro's JSON API. Mitigated by the two-layer
  parse and a fixture test that fails loudly when the mapping breaks.
- Sbazar photos are watermarked and capped at ~864×1152.
