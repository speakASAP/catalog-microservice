# GOAL-22: User Catalog Access And Alfares Resale Toggle

```yaml
id: GOAL-22-USER-CATALOG-ACCESS
status: active
owner: Catalog integration owner
created: 2026-07-02
branch: main
```

## Vision

Every Alfares sales-point user gets an isolated private product catalog by default, and can opt in to reselling Alfares shared products only through an explicit disabled-by-default setting.

## Goal Impact

The platform can onboard sellers from FlipFlop, Bazos, Allegro, Aukro, Heureka, and future services without accidentally granting them immediate access to sell Alfares inventory. When a seller opts into Alfares resale, Alfares can expand distribution while preserving product truth, stock authority, and channel compliance boundaries.

## System Boundary

Catalog owns private/shared product access and the resale toggle. Auth owns registration/login and identity. Sales-point services own marketplace accounts and publication workflows. Warehouse remains the only stock authority.

## Feature

- Add user catalog settings with `includeAlfaresCatalog=false` by default.
- Provision a settings row idempotently for each authenticated user on first Catalog access.
- Scope product list/detail/publication eligibility to private products by default.
- Allow Alfares shared products in the effective catalog only when the user enables the setting.
- Keep shared Alfares products read-only for ordinary users.
- Make sales-point dashboards and publish flows consume the same Catalog contract.

## Non-Goals

- No production DB mutation until migration application and deployment are separately approved.
- No copy/backfill of Alfares products into user private catalogs.
- No change to Warehouse stock ownership or reservation logic.
- No channel publication/compliance ownership moved into Catalog.
- No Auth password/JWT/OAuth shape changes.
- No customer checkout or payment behavior changes.
- No destructive product deletion or mass price edits.

## Acceptance Criteria

- A newly registered/authenticated user sees an empty private product list unless they create products.
- User-created products store the Auth subject as `owner_user_id`.
- User A cannot list/read/update/delete User B products.
- Alfares shared products (`owner_user_id IS NULL`) are hidden and blocked from publication while `includeAlfaresCatalog=false`.
- The user can enable `includeAlfaresCatalog=true` through settings.
- After opt-in, shared products are visible in the effective catalog and can enter channel-owned publication flows under the user's channel account.
- Ordinary users still cannot update/delete shared Alfares products.
- Catalog APIs, tests, and docs record the behavior without exposing secrets or raw production data.
- Cross-repo sales-point workstreams are explicitly split with owners, allowed files, forbidden files, validation, blockers, and merge order.

## Boundary Checks

- CAT-INV-001: Catalog remains product truth for private and shared products.
- CAT-INV-002: Warehouse remains stock authority; no stock ownership moves into Catalog.
- CAT-INV-003: Auth remains identity owner; Catalog stores only Auth subject references and settings.
- CAT-INV-005: Bazos/Aukro/Allegro/Heureka/FlipFlop publication/compliance remains channel-owned.
- CAT-INV-006: hard delete approval gate remains unchanged.
- CAT-INV-009: public read contracts are additive only.
- CAT-INV-010: mutation endpoints remain protected and audited.

## Cross-Repo Dependencies

- `auth-microservice`: hosted Auth registration/callback remains identity source; future registration fanout is optional after Catalog lazy provisioning.
- `catalog-microservice`: central schema/API/scope enforcement.
- `allegro`, `bazos`, `aukro`, `flipflop`, `heureka`: dashboards/settings/publish flows must forward the human bearer token and use effective Catalog scope.
- `warehouse-microservice`: read-only stock/readiness checks remain unchanged.
- `orders-microservice`, `payments-microservice`: no first-wave changes.
