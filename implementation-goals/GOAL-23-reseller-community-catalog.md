# GOAL-23: Reseller Community Catalog

```yaml
id: GOAL-23-RESELLER-COMMUNITY-CATALOG
status: source-implementation
owner: Catalog integration owner
created: 2026-07-02
branch: main
```

## Vision

A registered seller can add products to the Alfares Catalog under their own identity and explicitly publish selected products as available for resale by other sellers.

## Goal Impact

Product owners can increase sales reach, and other sellers can expand their assortment without sourcing every product manually. Alfares products are available by default, other sellers' products are hidden unless the viewer enables that source, and a seller's product is hidden from other sellers unless the owner enables resale.

## System

- Catalog owns product truth, ownership, resale visibility, source settings, and publication eligibility by product source.
- Auth owns identity and token validation.
- Warehouse owns stock and fulfillment evidence.
- Marketplace services own seller accounts, external drafts, listing publication, pacing, and compliance.

## Feature

- Add `products.resale_enabled=false` by default.
- Add `catalog_user_settings.include_alfares_catalog=true` and `include_community_catalog=false`.
- Add Catalog settings/provision endpoints.
- Extend product reads with `catalogScope=own|effective|alfares|community|all`.
- Let owners mark a product as available for resale.
- Let sellers choose source checkboxes in the Catalog dashboard.
- Keep non-owned products read-only in Catalog.
- Preserve channel-owned publication flows.

## Non-Goals

- No production migration application in source implementation.
- No product copying between sellers.
- No Warehouse, Orders, or Payments changes.
- No marketplace policy ownership moves into Catalog.
- No secret or token printing.
- No destructive cleanup of existing dirty worktree files.

## Acceptance Criteria

- New settings default to Alfares enabled and community disabled.
- Seller-created products get `owner_user_id=<Auth subject>` and `resale_enabled=false`.
- Product owner can set `resale_enabled=true`.
- Other sellers can see only resale-enabled seller products when their community source checkbox is enabled.
- Other sellers cannot update/delete shared Alfares or community products.
- Product list can show source labels and source checkboxes.
- Product create/edit exposes a resale checkbox.
- Bulk/channel publication uses effective Catalog access and then delegates to channel-owned workflows.
- Detailed cross-repo execution plan lists every affected repo, safe parallel lanes, blockers, validation owner, and merge order.

## Affected Repositories

- `catalog-microservice`: contract owner, schema/API, Catalog dashboard settings/product forms.
- `allegro`: seller product picker/dashboard must consume effective Catalog scope and human token.
- `aukro`: UI catalog picker/publish flow must consume effective Catalog scope and human token.
- `bazos`: catalog-origin draft UI must consume effective Catalog scope and human token.
- `flipflop`: seller/admin product surfaces must consume effective Catalog scope while public storefront remains stable.
- `heureka`: planned product/feed inclusion picker should consume effective Catalog scope when present.
- `auth-microservice`: no first-wave code unless lazy provisioning leaves a proven gap.

## Validation

Source validation:

```bash
npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts
npm run build
cd services/frontend && npm run build
git diff --check
```

Runtime validation remains blocked until migration/deploy approval and approved Auth smoke token.
