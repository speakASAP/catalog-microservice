# User Catalogs And Alfares Resale Toggle - Cross-Repo Plan

```yaml
id: CROSS-REPO-USER-CATALOGS-2026-07-02
status: active
owner: Catalog integration owner
created: 2026-07-02
repositories:
  - catalog-microservice
  - auth-microservice
  - allegro
  - bazos
  - aukro
  - flipflop
  - heureka
```

## Vision

Every registered seller in the Alfares sales ecosystem starts with an isolated private product catalog. Alfares-owned shared products are available for resale/dropshipping only after an explicit user setting is enabled.

## Goal Impact

This prevents accidental immediate resale of Alfares inventory by new users while creating a governed opt-in path for sellers to expand their assortment with Alfares products. The model works uniformly across FlipFlop, Bazos, Allegro, Aukro, Heureka, and future sales points.

## System Boundary

- Auth owns registration, login, hosted callback, token validation, roles, and user profile identity.
- Catalog owns product truth, user catalog settings, product ownership scope, and publication eligibility by product source.
- Warehouse owns sellable quantity and fulfillment route evidence.
- Sales-point services own external marketplace accounts, identities, drafts, listing state, publishing, queueing, pacing, and marketplace compliance.
- Orders/Payments are out of first-wave scope.

## Current Evidence

- `catalog-microservice` has `Product.ownerUserId` mapped to `products.owner_user_id`.
- `ProductsService` already scopes ordinary JWT actors to `ownerUserId=actor.sub` for many read/mutation paths.
- `scripts/migrations/20260701_product_owner_scope.sql` already prepares `owner_user_id` and owner-aware SKU uniqueness.
- Shared Alfares products are represented by `owner_user_id IS NULL`.
- Hosted Auth is the standard consumer path; Catalog validates bearer tokens through Auth `/auth/validate`.
- Bazos and FlipFlop have recent hosted Auth/profile-sync work.
- Aukro still has local UI auth endpoints in `services/aukro-service/src/ui/ui.controller.ts`.
- Allegro, Bazos, and FlipFlop already have unrelated dirty catalog-event/proactive-consumer work in their working trees; private-catalog workers must not edit those files until the active catalog-event consumer lanes are integrated or explicitly handed off.
- Aukro and Heureka have unrelated dirty `reports/validation/ips-pre-coding-gate.json`; workers must not overwrite those files unless they own that validation debt.
- Bazos has a validation blocker: `services/api-gateway/package.json` currently fails JSON parsing with `Expected double-quoted property name`.

## Target Behavior

1. User registers through any sales point.
2. User returns to that service's dashboard through hosted Auth callback.
3. The service calls Catalog settings/provision with the user's bearer token.
4. Catalog creates an idempotent settings row with `includeAlfaresCatalog=false`.
5. Product picker shows only the user's private products by default, so a first-time user sees an empty product list.
6. User can create/import private products; Catalog stores them with `owner_user_id=<auth subject>`.
7. User can enable "include Alfares products" in settings.
8. Effective product pickers can then show private products plus Alfares shared products.
9. User can publish private and opted-in Alfares products only through their own channel accounts/identities.
10. User cannot edit/delete Alfares shared products.

## Architecture Decision

Use Catalog lazy provisioning as the first durable guarantee. Auth fanout after registration is optional later.

Reasoning:

- It covers first registration, first login, OAuth, contact-code, and users created before this rollout.
- It avoids distributed transactions between Auth and Catalog.
- It gives every sales point one simple contract: call Catalog settings/provision after hosted Auth callback or before showing product pickers.
- It fail-closes if a sales point forgets to call provision because product APIs still default to private-only scope.

## Data Model

Catalog:

- `products.owner_user_id IS NULL`: Alfares shared catalog product.
- `products.owner_user_id = <auth subject>`: private product.
- `catalog_user_settings.user_id`: Auth subject.
- `catalog_user_settings.include_alfares_catalog`: disabled by default.

Channel services:

- Keep user-scoped account/identity records.
- Link listings/drafts to Catalog product id.
- Store channel-specific listing/draft overrides locally where the channel already owns those drafts.
- Do not write shared Catalog product rows when importing a user's external products; create private Catalog rows.

## Rollout Phases

### Phase 0 - Contract And Planning

Status: active.

Outputs:

- `docs/contracts/catalog-user-catalogs.md`
- `implementation-goals/GOAL-22-user-catalog-access.md`
- `implementation-goals/GOAL-22-execution-plan.md`
- `reports/validation/GOAL-22-pre-coding-gate.md`
- this cross-repo plan

Validation:

- `git diff --check`
- manual IPS pre-coding gate because repo-local pre-coding scripts are missing

### Phase 1 - Catalog Backend Contract

Status: ready now.

Owner role: Catalog backend worker.

Objective:

Implement the settings/provision API and enforce product access rules centrally.

Allowed files:

- `src/catalog-access/**`
- `src/products/**`
- `src/app.module.ts`
- `scripts/migrations/20260702_catalog_user_settings.sql`
- `reports/validation/VAL-GOAL-22-private-catalog-access.md`

Forbidden files:

- Auth repo
- channel repos
- Warehouse/Orders/Payments
- deploy scripts
- Kubernetes/Vault/secret files

Validation:

- focused Catalog access tests
- focused product service tests
- `npm run build`
- `git diff --check`

### Phase 2 - Catalog UI Toggle

Status: dependency-gated.

Owner role: Catalog frontend worker.

Objective:

Expose the user's private catalog status and the disabled-by-default Alfares resale toggle in Catalog dashboard/settings.

Allowed files:

- `services/frontend/**` settings/dashboard/product-picker files

Dependencies:

- Phase 1 endpoint response shape.

Validation:

- frontend typecheck/build
- static UI source check for default-off setting

### Phase 3 - Auth Consumer Provisioning Decision

Status: dependency-gated.

Owner role: Auth integration worker.

Objective:

Decide whether Auth needs a direct post-registration Catalog provision call. Prefer no Auth code unless lazy provisioning leaves a confirmed gap.

Allowed files if needed:

- Auth docs/tests/source around hosted register/callback provisioning adapter

Forbidden:

- JWT payload shape changes
- password/OAuth logic changes
- production DB mutation
- secrets

Validation:

- Auth contract tests/build if code changes
- otherwise no-code decision note

### Phase 4 - Sales-Point Product Picker And Settings Integration

Status: dependency-gated after Phase 1.

Run one worker per repo to avoid conflicts.

#### Allegro

Objective:

Make Allegro seller product selection use Catalog effective scope and the current user's token. Keep Allegro account/OAuth and publication lifecycle Allegro-owned.

Likely files:

- `shared/clients/catalog-client.service.ts`
- `services/allegro-service/src/allegro/catalog-sell-action/**`
- frontend/dashboard product picker files
- gateway/auth callback/session files only if needed

Validation:

- catalog sell-action spec
- Allegro service build
- frontend build if touched

Dirty worktree caveat:

- Do not touch the existing dirty catalog-event consumer files or `.env.example` changes unless the integration owner explicitly assigns that lane.

#### Bazos

Objective:

Make Bazos catalog-origin draft flow use the current user's effective Catalog scope and expose/consume the resale setting without weakening Bazos identity/compliance gates.

Likely files:

- shared Catalog client
- `shared/bazos/catalog/**`
- `services/aukro-service/src/ui/**` in this repo's current structure if it owns Bazos UI

Validation:

- focused Bazos catalog sell-action tests
- shared build
- service build/root tests as repo requires

Blockers:

- `[MISSING: valid services/api-gateway/package.json]` because the current file fails JSON parsing.
- Do not touch the existing dirty catalog-event subscriber files or `.env.example`/RabbitMQ module changes unless assigned by the integration owner.

#### Aukro

Objective:

Make Aukro dashboard catalog products use effective Catalog scope and remove or quarantine local `/ui/auth/login|register` behavior if hosted Auth is the current standard.

Likely files:

- `shared/clients/catalog-client.service.ts`
- `services/aukro-service/src/ui/ui.controller.ts`
- API gateway auth proxy only if the repo still needs compatibility

Dirty worktree caveat:

- Do not overwrite `reports/validation/ips-pre-coding-gate.json` unless this worker owns that file.

Security/account blocker:

- `[MISSING: Aukro account ownership hardening]` because inspected UI paths accept `accountId` without a confirmed user ownership check, and `AukroAccount` has no user ownership field in the explorer report.

Validation:

- service tests/build
- gateway route parity if touched
- diff check

#### Heureka

Objective:

Make Heureka dashboard/feed inclusion product picker use effective Catalog scope and preserve feed/account ownership.

Likely files:

- `shared/clients/catalog-client.service.ts`
- `services/heureka-service/src/heureka/dashboard/**`
- `services/heureka-service/src/heureka/feed/**` only if product inclusion checks need the new source marker

Dirty worktree caveat:

- Do not overwrite `reports/validation/ips-pre-coding-gate.json` unless this worker owns that file.

Validation:

- `npm run verify:task-010-source-parity` if still current
- Heureka service build
- route parity self-test if gateway touched

#### FlipFlop

Objective:

Preserve buyer storefront behavior while adding private-catalog/seller settings only to authenticated seller/admin/product publication surfaces.

Likely files:

- product-service Catalog client and protected publish/admin routes
- frontend admin/seller dashboard files
- user-service profile sync only if settings call needs first-login hook

Forbidden:

- checkout/payment/order behavior unless separately approved
- public storefront regression that hides Alfares products for buyers
- existing dirty proactive Catalog consumer files unless assigned by the integration owner

Validation:

- product-service build
- frontend build
- public `/api/products` smoke after deployment phase

### Phase 5 - Runtime Migration And Deploy

Status: blocked until source validation and owner deploy approval.

Steps:

1. Apply `owner_user_id` migration only if not already applied.
2. Apply `catalog_user_settings` migration.
3. Deploy Catalog.
4. Run health and safe smoke.
5. Deploy sales-point repos only after their source lanes are validated.

Blocked by:

- `[MISSING: owner approval to apply Catalog migration]`
- `[MISSING: owner approval to deploy Catalog]`
- `[MISSING: approved safe Auth token for authorized runtime smoke]`

### Phase 6 - Cross-Repo Validation

Status: final integration.

Required evidence:

- New Auth user or approved synthetic user sees empty private Catalog list.
- Private product creation is visible only to that user.
- Shared Alfares product hidden with setting false.
- Shared Alfares product visible/elegible after setting true.
- At least one sales-point product picker uses effective scope.
- A publication request for a shared product is blocked when setting false.
- No ordinary user mutation of shared product succeeds.
- Public FlipFlop buyer storefront remains healthy.

## Sub-Agent Execution Plan

Completed read-only agents:

- Catalog explorer: product ownership/schema/API candidate files.
- Auth explorer: hosted Auth registration/provisioning contract.
- Sales-point explorer: Allegro/Bazos/Aukro/FlipFlop/Heureka catalog/auth touchpoints.

Next worker wave after Phase 0:

1. W1 Catalog backend worker starts immediately.
2. W2/W3/W4/W5 wait for W1 API contract to land.
3. One worker per sales-point repo, with dirty worktree caveats for Aukro and Heureka.
4. Original thread stays integration owner and validation owner.

## Blockers And Unknowns

- `[MISSING: docs-rag JWT_TOKEN]`
- `[MISSING: owner decision whether product list default is own or effective with default false]`
- `[MISSING: final UI wording for the resale toggle]`
- `[MISSING: approved safe Auth token for runtime smoke]`
- `[UNKNOWN: whether Auth should fan out registration events after Catalog lazy provisioning]`
- `[UNKNOWN: exact seller/buyer boundary for FlipFlop beyond current storefront/admin flows]`
- `[MISSING: Aukro hosted Auth standardization and account ownership check]`
- `[MISSING: Bazos api-gateway package.json repair before full gateway validation]`
- `[MISSING: integration decision for existing dirty catalog-event consumer work in Allegro/Bazos/FlipFlop]`

## Validation Ownership

- Phase 1 source validation: Catalog backend worker.
- Cross-repo runtime validation: original integration owner.
- Deploy validation: deploy operator under owner approval.
- Dirty worktree conflict checks: each repo worker before edits.

## Merge Order

1. Catalog contract/docs.
2. Catalog backend source and tests.
3. Catalog frontend settings if needed.
4. Auth no-code decision or adapter.
5. Channel repo patches in parallel by repository.
6. Catalog migration/deploy.
7. Channel deploys.
8. Cross-repo runtime smoke.

## Rollback Strategy

Because settings default false and schema changes are additive, rollback should first revert service code and redeploy previous images. Do not drop settings tables unless explicitly approved after confirming no live settings must be retained.
