# Reseller Community Catalog - Cross-Repo Plan

```yaml
id: CROSS-REPO-RESELLER-COMMUNITY-CATALOG-2026-07-02
status: source-implementation
owner: Catalog integration owner
created: 2026-07-02
repositories:
  - catalog-microservice
  - auth-microservice
  - allegro
  - aukro
  - bazos
  - flipflop
  - heureka
```

## Vision

Sellers can publish selected owned products into a community resale catalog, and other sellers can opt in to using those products in their own marketplace publishing flows.

## Goal Impact

This creates a marketplace-like supply layer inside the Alfares platform. Alfares products remain visible by default for newly registered sellers. Products from other users require two opt-ins: the owner enables resale on the product, and the viewer enables products from other sellers.

## System Boundary

- Catalog: ownership, source settings, resale visibility, product read scope, publication eligibility.
- Auth: user identity, hosted login/register, token validation.
- Warehouse: stock and logistics.
- Allegro/Aukro/Bazos/FlipFlop/Heureka: marketplace-specific accounts, drafts, publication, policy, external state.
- Orders/Payments: no first-wave changes.

## Repository Impact

### `catalog-microservice`

Status: active.

Responsibilities:

- Add `resale_enabled` to products.
- Add `catalog_user_settings`.
- Add source settings/provision API.
- Apply effective read scope and owner-only mutation scope.
- Add Catalog dashboard source checkboxes and product resale checkbox.

Validation:

- backend focused tests;
- backend build;
- frontend build;
- diff check.

### `allegro`

Status: ready after Catalog contract validation.

Responsibilities:

- Product picker/dashboard should request Catalog `catalogScope=effective`.
- Human token must be forwarded to Catalog.
- Keep Allegro OAuth/account/draft/publish lifecycle Allegro-owned.

Safe candidate files:

- `services/frontend/src/pages/ProductsPage.tsx`
- `services/frontend/src/services/api.ts`

Forbidden dirty files:

- `.env.example`
- `docs/orchestrator/STATUS.md`
- `services/allegro-service/src/allegro/allegro.module.ts`
- `shared/rabbitmq/stock-events.subscriber.ts`
- `services/allegro-service/src/allegro/catalog-events/**`
- `shared/rabbitmq/stock-events.subscriber.spec.ts`

Validation:

```bash
git diff --check
npm run ips:audit
npm run ips:pre-coding
npx ts-node services/allegro-service/src/allegro/catalog-sell-action/catalog-sell-action.spec.ts
cd services/allegro-service && npm run build
cd ../frontend && npm run build
```

### `aukro`

Status: ready after Catalog contract validation.

Responsibilities:

- UI product picker should consume effective Catalog scope.
- Publish flow must keep Aukro account ownership and policy Aukro-owned.

Safe candidate files:

- `services/aukro-service/src/ui/ui.controller.ts`

Forbidden dirty files:

- `.env.example`
- `reports/validation/ips-pre-coding-gate.json`
- `shared/index.ts`
- `shared/rabbitmq/**`

Validation:

```bash
git diff --check
cd services/aukro-service && npm test -- --runInBand && npm run build
```

### `bazos`

Status: dependency-gated after Catalog contract validation and package JSON repair.

Responsibilities:

- UI catalog products should consume effective Catalog scope.
- Bazos identity/compliance stays Bazos-owned.

Safe candidate files:

- `services/aukro-service/src/ui/ui.controller.ts`
- `services/aukro-service/src/ui/ui.assets.ts`

Forbidden dirty files:

- `.env.example`
- `shared/index.ts`
- `shared/rabbitmq/**`
- existing catalog-event validation report

Blocker:

- `[MISSING: valid services/api-gateway/package.json]`

Validation:

```bash
git diff --check
npm --prefix shared test
npm --prefix services/bazos-service run build
```

### `flipflop`

Status: ready after Catalog contract validation.

Responsibilities:

- Seller/admin product surfaces should consume effective Catalog scope.
- Public storefront `/products` must not become a seller source picker.
- Checkout/payment behavior remains untouched.

Safe candidate files:

- `services/frontend/app/admin/products/page.tsx`
- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`

Forbidden dirty files:

- `.env.example`
- `shared/index.ts`
- `shared/rabbitmq/**`
- `docs/orchestrator/W4A_FLIPFLOP_PROACTIVE_CONSUMERS.md`
- `scripts/verify-flipflop-proactive-consumers.js`

Validation:

```bash
git diff --check
npm run verify:flipflop-offer-gate
npm --prefix services/product-service run build
npm --prefix services/frontend run build
```

### `heureka`

Status: dependency-gated.

Responsibilities:

- Product/feed inclusion picker should consume effective Catalog scope if the UI route is active.
- Feed compliance and inclusion remain Heureka-owned.

Blocker:

- `[UNKNOWN: active Heureka seller dashboard route/file ownership]`

### `auth-microservice`

Status: no-code first wave.

Responsibilities:

- Hosted Auth remains identity source.
- Catalog lazy provisioning covers first login/register callback.
- Add Auth fanout only if runtime validation proves a provisioning gap.

Forbidden:

- JWT shape changes.
- password/OAuth flow changes.
- production user DB mutation.

## Parallel Execution Section

| Workstream | Status | Owner | Allowed Files | Forbidden Files | Blockers | Validation Owner | Merge Order |
|---|---|---|---|---|---|---|---|
| Catalog backend/UI | active | main thread | listed in Goal 23 EP | channel repos, secrets, deploy scripts | none for source | main thread | 1 |
| Allegro UI | ready after W1 | Allegro worker | safe candidate files | dirty event/RabbitMQ files | Catalog API validation | Allegro worker | 2 |
| Aukro UI | ready after W1 | Aukro worker | safe candidate files | dirty validation/RabbitMQ files | Catalog API validation | Aukro worker | 2 |
| Bazos UI | blocked | Bazos worker | safe candidate files | dirty event/RabbitMQ files | package JSON blocker | Bazos worker | 3 |
| FlipFlop admin/seller | ready after W1 | FlipFlop worker | safe candidate files | dirty proactive consumer files | Catalog API validation | FlipFlop worker | 2 |
| Heureka picker | dependency-gated | Heureka worker | `[UNKNOWN]` | feed/account unrelated files | route discovery | Heureka worker | 3 |
| Runtime deploy | active | deploy operator | migration/deploy only | destructive DB ops | source validation | integration owner | final |

Shared files/contracts: Catalog source settings API, `products.resale_enabled`, `catalogScope=effective`.
Integration owner: original Catalog thread.
Validation owner: original Catalog thread for cross-repo smoke.
Merge order: Catalog contract -> Catalog frontend -> independent channel pickers -> deploy/migration -> runtime smoke.

## Runtime Smoke Plan

Requires approved Auth token and deploy approval:

1. Create/read settings for synthetic seller.
2. Verify defaults: Alfares false, community false.
3. Create synthetic seller product with resale false.
4. Verify another seller cannot see it under community scope.
5. Owner enables resale.
6. Other seller enables community source and sees product.
7. Other seller cannot update/delete it.
8. Other seller can start channel-owned publish draft if stock/channel gates pass.

## Open Items

- `[MISSING: approved Auth token for runtime smoke]`
- `[MISSING: Bazos package JSON repair owner]`
- `[UNKNOWN: active Heureka dashboard route]`
