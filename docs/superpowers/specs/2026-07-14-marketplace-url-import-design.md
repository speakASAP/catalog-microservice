# Design: Import Photos from an Aukro Listing Link

## Problem

When creating a product, sellers often relist an item they already listed on
Aukro.cz. They currently copy each photo URL by hand from the Aukro gallery.
We want: paste the Aukro listing link into the New Product form, click
Import, and have all gallery photos (best available quality) appended to the
form's photo link fields.

## Scope (explicitly decided)

- **Aukro only.** No generic/pluggable marketplace-importer abstraction —
  build a focused Aukro-specific import path. A second marketplace, if it
  ever comes up, gets its own equally-focused addition rather than an
  up-front abstraction.
- **Photos only.** No title/description import, no video import (the Aukro
  API used here has no video field for this listing type).
- **Fills existing UI, not a new creation path.** This augments the New
  Product form's existing "Photo links" fields (added earlier this session).
  It does **not** create the product — the seller still reviews/edits links
  and clicks "Create Product" themselves.

Note: existing "sell-on-aukro"/"sell-on-bazos" code in this repo
(`products.controller.ts`) is the *opposite* direction — publishing an
existing Catalog product out to those marketplaces. This feature is strictly
inbound (Aukro listing → photo URLs) and shares no code with that flow.

## How Aukro listing photos are obtained

Aukro's Angular SSR frontend is backed by a plain JSON REST endpoint:

```
GET https://aukro.cz/backend-web/api/offers/{itemId}/offerDetail?pageType=DETAIL&requestedFor=DETAIL&itemDetailModsEnabled=true&itemModVisitType=DIRECT&itemModDeviceType=DESKTOP
```

Verified via direct `curl` (with a browser `User-Agent`; no auth, no JS
rendering required) against the URL the user provided
(`https://aukro.cz/rarita-nuz-dyka-cccp-sovetsky-bodak-armada-valka-dustojnik-znacen-nkvd-7124914683`).
The `itemId` (`7124914683`) is the trailing numeric segment of the listing
slug. The response's `images` field has five resolution variants (`small`,
`medium_preview`, `medium`, `large`, `original`) of the same files, each an
array of `{ position, url }` ordered to match the gallery. `images.original`
has no resize-path segment inserted into the URL — it is the unscaled
best-quality file. The raw HTML `<img>` tags on the page are not used because
the page also embeds "related items" thumbnails that are indistinguishable
from the listing's own gallery by markup alone; the JSON API has no such
pollution.

Because this is a plain HTTP JSON API, no headless browser is needed.

## Security: SSRF guard

This endpoint makes the server fetch a user-supplied URL. Without a
restriction, an authenticated user could point it at internal/arbitrary
hosts. Mitigation: reject any URL whose hostname is not exactly `aukro.cz` or
`www.aukro.cz` before making any outbound request, and only ever construct
the outbound request URL ourselves (from the extracted numeric item ID)
rather than forwarding the user's URL verbatim.

## Architecture

Extend the existing `media` module (this is fundamentally about fetching
media, and doesn't need a product to exist yet, so it doesn't belong on
`ProductsController`):

```
src/media/
  media.controller.ts       (+ new route)
  media.service.ts           (+ new method)
  aukro-import.ts             (new: URL validation + fetch + mapping, kept
                               separate from media.service.ts's DB-facing
                               methods since it has no repository dependency)
```

### `aukro-import.ts`

```ts
export function extractAukroItemId(url: string): string {
  // throws BadRequestException if hostname isn't aukro.cz/www.aukro.cz
  // or no trailing -<digits> segment found
}

export async function fetchAukroPhotoUrls(url: string): Promise<string[]> {
  const itemId = extractAukroItemId(url);
  // axios.get the offerDetail endpoint with a browser User-Agent
  // throws BadGatewayException (with upstream status) on non-2xx or
  // malformed response
  // returns images.original sorted by position, mapped to .url
}
```

### `MediaController`

```
POST /media/import/aukro
  @UseGuards(CatalogAuthGuard)   // same pattern as create/upload
  body: { url: string }
  -> { success: true, data: { photoUrls: string[] } }
```

Delegates straight to `fetchAukroPhotoUrls`. No `MediaService`/DB involvement
— this only returns URLs for the frontend to hold in form state, the same as
if the seller had typed them in by hand. Errors surface as
`{ success: false, error: { code, message } }` via the existing global
exception shape (matching how other controllers already respond), not a
raw 500.

## Frontend

`services/frontend/lib/api/media.ts`: add
`mediaApi.importAukroPhotos(url): Promise<ApiResponse<{ photoUrls: string[] }>>`
calling `apiClient.post('/media/import/aukro', { url })`.

`services/frontend/app/dashboard/products/new/page.tsx`: above the existing
"Photo links" field list, add:
- A URL input (labelled "Import photos from Aukro link") + "Import" button.
- On click: call `mediaApi.importAukroPhotos(url)`, show a small loading
  state on the button.
- On success: merge returned URLs into `photoUrls` state — fill existing
  empty slots first (left to right), then append new rows for the
  remainder. Manually-typed links already present are preserved, never
  overwritten.
- On failure: an inline error message next to the import field (not a
  blocking `alert()`), so a bad link doesn't derail the rest of the form the
  seller may have already filled in.
- No change to the Title/SKU/description fields — this box only ever writes
  to `photoUrls`.

## Error handling summary

| Condition | Response |
|---|---|
| URL hostname isn't aukro.cz/www.aukro.cz, or no numeric item ID found | 400, inline form error |
| Upstream Aukro fetch fails (deleted listing, network error, unexpected shape) | 502, inline form error with the upstream message |

## Testing

- Unit test for `extractAukroItemId`: valid listing URL, wrong host, no
  trailing digits.
- Unit test for `fetchAukroPhotoUrls` against a saved fixture of the real
  `offerDetail` JSON response (captured from the URL used during design,
  10 photos) — asserts the returned array is sorted by `position` and uses
  the `original` variant.
- No live e2e test against Aukro's production API in CI (fixture-based
  only).
