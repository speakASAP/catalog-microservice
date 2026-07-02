# Catalog Reseller Community Products Contract

```yaml
id: CONTRACT-CATALOG-RESELLER-COMMUNITY-PRODUCTS-V1
status: source-implementation
owner: Catalog integration owner
created: 2026-07-02
source_goal: implementation-goals/GOAL-23-reseller-community-catalog.md
```

## Vision

Sellers can bring their own products into the Alfares Catalog and explicitly mark selected products as available for resale by other sellers. Other sellers can then opt in to seeing those community products alongside Alfares products and can publish them through their own marketplace accounts.

## Goal Impact

The platform gains a governed product-distribution network: product owners get more sales reach, and sellers get a broader assortment without manually sourcing every item. The default stays conservative: Alfares products are included, products from other sellers are hidden until the seller opts in, and each product owner must opt in before their product joins the community catalog.

## Source Of Truth

- Auth owns user identity, hosted login/register, token validation, and profile data.
- Catalog owns product identity, owner assignment, source selection settings, product resale visibility, and product read/publication eligibility.
- Warehouse owns physical stock, reservations, and logistics routes.
- Channel services own marketplace accounts, external listing drafts, publication, pacing, challenges, and compliance decisions.
- Orders/Payments are out of this first implementation wave.

## Product Source Semantics

| Source | Storage | Visible By Default | Seller Can Publish | Seller Can Edit |
|---|---|---:|---:|---:|
| Seller private product | `products.owner_user_id = current user` and `resale_enabled=false` | yes, to owner | yes, by owner | yes, by owner |
| Seller community product | `products.owner_user_id != current user` and `resale_enabled=true` | no | only if `include_community_catalog=true` | no |
| Alfares product | `products.owner_user_id IS NULL` | yes | yes, if channel/stock gates pass | no for ordinary sellers |
| Other private product | `products.owner_user_id != current user` and `resale_enabled=false` | no | no | no |

Admin/service actors keep operational access. User-facing dashboards and publication flows must use human-token scope.

## User Source Settings

```text
catalog_user_settings
  user_id varchar(200) primary key
  include_alfares_catalog boolean not null default false
  include_community_catalog boolean not null default false
  source_application varchar(100) null
  first_seen_at timestamp not null default now()
  created_at timestamp not null default now()
  updated_at timestamp not null default now()
```

Defaults:

- `include_alfares_catalog=false`
- `include_community_catalog=false`
- own products are always included

## Product Resale Flag

```text
products.resale_enabled boolean not null default false
```

Rules:

- Only the owner or admin/service can change `resale_enabled`.
- `resale_enabled=true` does not transfer product ownership.
- Other sellers can read/publish the product only through effective source scope and only when their own `include_community_catalog=true`.
- Other sellers cannot mutate canonical product, media, pricing, or marketplace field rows.

## API Contract

### `POST /api/catalog/access/provision`

Idempotently creates settings for the current human actor.

### `GET /api/catalog/settings`

Returns:

```json
{
  "success": true,
  "data": {
    "userId": "auth-user-id",
    "includeAlfaresCatalog": true,
    "includeCommunityCatalog": false,
    "sourceApplication": "catalog"
  }
}
```

### `PUT /api/catalog/settings`

Updates source checkboxes. `PATCH` is also accepted.

### `GET /api/products?catalogScope=effective`

Returns own products plus enabled source buckets:

- own products always;
- Alfares products when `includeAlfaresCatalog=true`;
- other sellers' `resaleEnabled=true` products when `includeCommunityCatalog=true`.

Supported scopes: `own`, `effective`, `alfares`, `community`, `all` for admin/service.

### Product Mutations

`POST /api/products` creates seller-owned products. `PUT/DELETE` require product ownership or admin/service access. Visible shared/community products are read/publish candidates, not editable records.

### Publication Eligibility

Catalog publish entry points must resolve products through effective read scope. Channel services still own final marketplace publication and account binding.

## Cross-Service Consumer Rules

- Product pickers in Allegro, Aukro, Bazos, FlipFlop, Heureka, and Catalog must expose source checkboxes or consume Catalog settings.
- Product publish destination checkboxes remain service-specific marketplace choices.
- Every user-facing source/publish flow must forward the human bearer token to Catalog.
- Background service tokens may use broad scope only for approved operational projections, not user-facing seller choices.

## Validation Matrix

| Case | Expected Result |
|---|---|
| New seller settings | Alfares false, community false. |
| Seller creates product | Product owner is Auth subject and resale is false. |
| Seller enables resale on own product | Product becomes community-visible to opted-in sellers. |
| Other seller community disabled | Community product hidden. |
| Other seller community enabled | Community product visible and publishable through channel gates. |
| Other seller edits community product | Forbidden. |
| Seller disables Alfares source | Alfares products hidden from effective product picker. |
| Admin/service reads all | Operational access preserved. |

## Open Items

- `[MISSING: final localized copy for all service dashboards]`
- `[MISSING: approved runtime Auth token for end-to-end smoke]`
- `[UNKNOWN: whether channel services need persisted local source preferences after Catalog settings are deployed]`
