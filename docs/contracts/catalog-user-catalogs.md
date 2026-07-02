# Catalog User Catalogs Contract

> 2026-07-02 status note: Goal 23 extends this Goal 22 draft with community resale, while preserving the source-default requirement. Newly provisioned seller settings default to `include_alfares_catalog=false` and `include_community_catalog=false`; existing explicit user settings remain respected. See `docs/contracts/catalog-reseller-community-products.md`.

```yaml
id: CONTRACT-CATALOG-USER-CATALOGS-V1
status: draft
owner: Catalog integration owner
created: 2026-07-02
source_goal: implementation-goals/GOAL-22-user-catalog-access.md
```

## Purpose

Every authenticated Alfares seller must start with an empty private Catalog view and must not be able to sell Alfares-owned shared products until they explicitly enable that option. The contract gives every sales point the same Catalog access model while preserving Catalog as product truth, Auth as identity truth, Warehouse as stock truth, and channel services as marketplace publication owners.

## Source Of Truth

- Auth owns user identity, hosted login/register, JWT validation, roles, and profile contact fields.
- Catalog owns product identity, private product rows, Alfares shared product rows, user catalog settings, product read scope, and publication eligibility by product source.
- Warehouse owns stock quantity, reservations, movements, and warehouse locations for every sellable product.
- Sales-point services own external marketplace accounts, channel-specific listing drafts, queueing, publication, compliance, pacing, and external API/OAuth state.

## Product Ownership Semantics

Catalog products have a source:

| Source | Storage | Visible To Ordinary User By Default | Mutable By Ordinary User | Sellable By Ordinary User |
|---|---|---:|---:|---:|
| Private user product | `products.owner_user_id = <auth user id>` | yes | yes | yes, if readiness and channel policy pass |
| Alfares shared product | `products.owner_user_id IS NULL` | no | no | only after `include_alfares_catalog = true` |
| Other user's product | `products.owner_user_id = <another auth user id>` | no | no | no |

Admin/service actors keep existing operational access, but user-facing product selection and channel publication must use the current human actor's effective catalog scope.

## User Catalog Settings

Add an idempotent settings record per Auth user.

```text
catalog_user_settings
  user_id varchar(200) primary key
  include_alfares_catalog boolean not null default false
  source_application varchar(100) null
  first_seen_at timestamptz not null default now()
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Default behavior is fail-closed:

- Missing settings row is treated as `includeAlfaresCatalog=false`.
- Provisioning is idempotent and must not copy Alfares products into the user's private catalog.
- Enabling Alfares products changes the effective read/publish scope; it does not transfer ownership or grant edit/delete rights over Alfares product rows.

## API Contract

All human endpoints require Auth-backed bearer validation through the existing `CatalogAuthGuard`.

### `POST /api/catalog/access/provision`

Creates or refreshes the current user's settings row.

Request body:

```json
{
  "sourceApplication": "flipflop"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "userId": "auth-user-id",
    "includeAlfaresCatalog": false,
    "sourceApplication": "flipflop",
    "created": true
  }
}
```

Rules:

- Idempotent for the same user.
- Must not create products.
- Must not read or expose token values.
- Service actors may provision only when an explicit user id is supplied by a future approved machine contract; not in the first implementation lane.

### `GET /api/catalog/settings`

Returns the current user's effective catalog settings.

Response:

```json
{
  "success": true,
  "data": {
    "userId": "auth-user-id",
    "includeAlfaresCatalog": false,
    "privateCatalogProductCount": 0,
    "alfaresCatalogProductCount": 0
  }
}
```

The count fields are optional in the first source implementation if they add risk; if omitted, the response must still return the boolean setting.

### `PATCH /api/catalog/settings`

Updates only user-owned settings.

Request body:

```json
{
  "includeAlfaresCatalog": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "userId": "auth-user-id",
    "includeAlfaresCatalog": true
  }
}
```

Rules:

- Only the authenticated user can change their own setting.
- Admin override is out of scope for first implementation.
- Changing the setting must be audited through existing write logging.

### `GET /api/products`

Add an optional `catalogScope` query parameter:

| Query | Meaning |
|---|---|
| omitted or `own` | User's private products only. New users see an empty list. |
| `effective` | Private products plus Alfares shared products only when `includeAlfaresCatalog=true`. |
| `alfares` | Alfares shared products only when `includeAlfaresCatalog=true`; otherwise empty or forbidden by final API decision. |

Recommended first implementation: default to `own` so existing new-user expectation is unambiguous. Sales-point product pickers should request `effective` only when they intentionally want the user's resale-enabled offer surface.

Each returned product should include a non-breaking source marker when practical:

```json
{
  "id": "catalog-product-id",
  "ownerUserId": null,
  "catalogSource": "alfares"
}
```

If adding `catalogSource` to every envelope is risky for first lane, product source may be derived from `ownerUserId` until the frontend lane adds labels.

### Product Detail And Mutations

- `GET /api/products/:id` must allow:
  - private owned product;
  - Alfares product only when `includeAlfaresCatalog=true`;
  - admin/service operational access through existing admin/service rules.
- `POST /api/products` always creates a private product for the human actor.
- `PUT /api/products/:id`, soft delete, hard delete, media/pricing/category mutations must reject Alfares shared products for ordinary users even when shared products are included for resale.
- Other users' private products remain invisible and inaccessible.

### Publication Eligibility

Catalog-owned publication entry points, including `POST /api/products/publications/bulk` and per-channel sell-action routes, must use effective catalog access:

- Private product: allowed if readiness, stock, and channel policy pass.
- Alfares shared product: allowed only when `includeAlfaresCatalog=true`, and still read-only from Catalog's perspective.
- Other user's product: forbidden/not found.

Channel services must bind resulting drafts/listings to the user's channel account/identity, not to a global Alfares account unless the specific channel already has an approved service-owned publication path.

## Registration And Provisioning Semantics

The first durable guarantee should be Catalog-side lazy provisioning:

1. User registers or logs in through hosted Auth on any sales point.
2. Sales point callback stores the Auth token/session using its existing hosted Auth pattern.
3. The dashboard calls `POST /api/catalog/access/provision` or `GET /api/catalog/settings`.
4. Catalog creates a settings row if missing and returns `includeAlfaresCatalog=false`.
5. Product selection calls `GET /api/products?catalogScope=own` or `effective`.

Auth-side post-registration fanout can be added later, but Catalog lazy provisioning avoids a distributed transaction between Auth and Catalog and covers OAuth/contact-code/login users as well as first-time email/password registrations.

## Cross-Service Consumer Rules

- User-facing sales-point product pickers must forward the human bearer token to Catalog.
- Background service tokens may fetch shared Alfares products only for operational projections, public storefronts, or admin jobs that are already service-owned.
- Any marketplace account/identity record must remain user-scoped in the channel service.
- Channel services must not duplicate Alfares product rows into private Catalog rows merely because resale is enabled.
- Import flows that create new products for a user must create `owner_user_id=<auth user id>`, not shared rows.

## Security And Data Protection

- No secrets, bearer tokens, OAuth tokens, passwords, raw marketplace payloads, or customer data may appear in docs, tests, logs, validation reports, or agent prompts.
- Tests should use synthetic user ids such as `user-private-1`, `user-private-2`, and `service-admin`.
- Runtime verification must use approved tokens only and must report token presence by env/key name, never value.

## Validation Matrix

| Case | Expected Result |
|---|---|
| New user settings | `includeAlfaresCatalog=false`; product list default is empty. |
| User creates product | Product has `owner_user_id=<user id>` and is visible to that user. |
| Second user reads product | Not found or excluded from list. |
| Shared Alfares product, setting false | Hidden from list/detail and blocked from publication. |
| Shared Alfares product, setting true | Visible in effective scope and eligible for channel draft/publish if stock/readiness/channel policy pass. |
| Ordinary user edits shared product | Forbidden. |
| Admin/service reads shared product | Existing operational access preserved. |
| Bulk publication mixed private/shared, setting false | Private may proceed; shared returns blocked/forbidden item result. |
| Bulk publication mixed private/shared, setting true | Both may proceed through channel-owned workflows if other gates pass. |

## Open Items

- `[MISSING: owner decision whether product list default should be strictly own or effective with default-false setting]`
- `[MISSING: final UI wording for the Alfares resale toggle in each language]`
- `[MISSING: approved runtime token for authorized production smoke across every sales point]`
- `[UNKNOWN: whether Auth should add a future event/outbox registration hook after Catalog lazy provisioning is deployed]`
