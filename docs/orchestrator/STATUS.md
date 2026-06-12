# Catalog Orchestrator Status

## 2026-06-12

Current focus: Goal 1 - Catalog Contract And Auth Boundary.

Evidence gathered:

- Catalog production health endpoint returns healthy.
- Catalog production returns six seeded products with categories, placeholder media, and pricing rows.
- Catalog source builds with `npm run build`.
- Warehouse source builds with `npm run build`.
- FlipFlop production reads catalog products but currently shows price and stock as `0`.
- Warehouse stock endpoint requires auth.

Work started:

- Added catalog intent preservation/orchestrator pack.
- Started runtime auth boundary for catalog mutations.

Implementation evidence:

- Added `CatalogAuthGuard` and `RequireCatalogRoles`.
- Protected product, category, attribute, media, and pricing mutation endpoints with `CatalogAuthGuard`.
- Gated product hard delete to `global:superadmin` plus `x-owner-approval: explicit`.
- Fixed product route ordering so `GET /api/products/sku/:sku` is declared before `GET /api/products/:id`.
- Remote `npm run build` passed after these changes.

Next unfinished chunk:

- Goal 1.4: add audit-grade actor/source logging for writes.

Additional owner-selected work:

- Added authenticated product media upload support for the admin product detail page.
- Deployed catalog API and frontend after `npm run build` passed in both root and `services/frontend`.
- Runtime smoke: `POST /api/media/upload` returned `201` for product `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3`; cleanup `DELETE /api/media/:id` returned `200`.
- Verified uploaded MinIO object URL returned `HTTP 200` with `content-type: image/png`.
- Removed the smoke-test MinIO object after verification; object delete returned `204`.
- Verified deployed frontend bundle contains the media drop zone, folder picker, and `/media/upload` client call.
- Fixed admin product counts to read the deployed `/api/products` envelope where `data` contains the product array and `pagination` is a sibling field.
- Deployed frontend after `services/frontend npm run build` passed.
- Browser verification: `/admin/products` shows `Manage products (6 total)` and `/admin` shows the Products dashboard card as `6`; no browser console warnings/errors were reported.
