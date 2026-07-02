# EP-CATALOG-22: Private User Catalogs And Alfares Resale Toggle

```yaml
id: EP-CATALOG-22-PRIVATE-CATALOG-ACCESS
status: active
source_goal: implementation-goals/GOAL-22-private-catalog-access.md
owner: Catalog integration owner
created: 2026-07-02
last_updated: 2026-07-02
branch: main
```

## Metadata

Repository: `/home/ssf/Documents/Github/catalog-microservice`
Preflight: clean `main`, head `6f444f7 feat: add catalog product event outbox`
Docs-rag retrieval: `[MISSING: docs-rag JWT_TOKEN]`
Cross-repo plan: `docs/orchestrator/2026-07-02-private-catalog-cross-repo-plan.md`
Contract: `docs/contracts/catalog-user-catalogs.md`

## Upstream Traceability

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

- User prompt on 2026-07-02: every registered sales-point user must get their own empty catalog by default and must opt in before selling Alfares products.
- `AGENTS.md`: Catalog is product truth; Auth owns login/JWT/RBAC; channel services own publication/compliance.
- `docs/orchestrator/INTENT.md`: Catalog serves FlipFlop, Bazos, and future channels without letting channels redefine product truth.
- `docs/contracts/catalog-user-catalogs.md`: versioned draft contract for user catalog settings and product source scope.

## Goal Impact

Private catalog isolation prevents accidental resale of Alfares-owned stock by newly registered users while preserving an explicit opt-in dropshipping/resale path that can increase Alfares distribution through external marketplace accounts.

## Project Invariants

- CAT-INV-001: Catalog product identity and content remain Catalog-owned.
- CAT-INV-002: stock stays Warehouse-owned.
- CAT-INV-003: Auth remains identity owner; Catalog stores only subject references/settings.
- CAT-INV-005: channel publication/compliance stays channel-owned.
- CAT-INV-006: hard delete approval stays protected.
- CAT-INV-009: API changes are additive or fail-closed.
- CAT-INV-010: mutation auth/audit paths remain protected.

## Sensitive-Data Handling

Use synthetic user ids and product fixtures in tests. Do not print bearer tokens, passwords, OAuth credentials, raw production marketplace payloads, customer identifiers, payment data, or live private logs. Runtime validation requiring user tokens remains `[MISSING: approved safe Auth token]` until explicitly provided.

## Contract/Schema Impact

Additive Catalog schema:

- New `catalog_user_settings` table.
- Existing `products.owner_user_id` remains the product ownership marker.
- Existing shared rows with `owner_user_id IS NULL` remain Alfares shared catalog products.

API impact:

- New settings/provision endpoints.
- Optional product query scope.
- Product publication must enforce effective catalog access.

No destructive backfill. No product copy into private catalogs.

## Scope

First Catalog implementation wave:

1. Add user catalog settings migration/entity/service/module/controller.
2. Add idempotent provision/read/update settings endpoints.
3. Extend product read scope to distinguish own/effective/alfares product sources.
4. Enforce shared-product publication blocking unless `includeAlfaresCatalog=true`.
5. Preserve shared product read-only mutation behavior for ordinary users.
6. Add focused tests and validation docs.

## Non-Goals

- No Auth registration event fanout in this Catalog source lane.
- No channel repo edits in this Catalog source lane.
- No deployment, production migration application, Vault/Kubernetes secret changes, or runtime DB mutation.
- No product/pricing/media mass edits.
- No Warehouse/Orders/Payments changes.
- No local MacBook project code writes.

## Files To Inspect

- `src/products/product.entity.ts`
- `src/products/products.service.ts`
- `src/products/products.controller.ts`
- `src/products/products.service.spec.ts`
- `src/auth/catalog-auth.guard.ts`
- `src/logger/logger.service.ts`
- `scripts/migrations/20260701_product_owner_scope.sql`
- `docs/contracts/catalog-user-catalogs.md`
- Sales-point read-only references from the cross-repo plan.

## Files To Create

- `src/catalog-access/catalog-user-settings.entity.ts`
- `src/catalog-access/catalog-access.service.ts`
- `src/catalog-access/catalog-access.controller.ts`
- `src/catalog-access/catalog-access.module.ts`
- `src/catalog-access/catalog-access.service.spec.ts`
- `scripts/migrations/20260702_catalog_user_settings.sql`
- `reports/validation/VAL-GOAL-22-private-catalog-access.md`

## Files To Modify

- `src/app.module.ts`
- `src/products/products.service.ts`
- `src/products/products.controller.ts`
- `src/products/products.service.spec.ts`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`

## Files That Must Not Be Modified

Auth repo, channel repos, Warehouse, Orders, Payments, Kubernetes manifests, deploy scripts, Vault/secret files, protected baseline intent files, and production data.

## Implementation Steps

1. Confirm the pre-existing owner scope migration and `Product.ownerUserId` behavior.
2. Add the `catalog_user_settings` migration and entity with default `include_alfares_catalog=false`.
3. Implement `CatalogAccessService`:
   - `ensureSettings(actor, sourceApplication?)`
   - `getSettings(actor)`
   - `updateSettings(actor, dto)`
   - `canIncludeAlfaresCatalog(actor)`
   - `resolveProductAccessMode(actor, requestedScope)`
4. Add `CatalogAccessController` endpoints under `/api/catalog`.
5. Inject `CatalogAccessService` into `ProductsService`.
6. Update product list/detail/SKU scoping:
   - default user scope: own products only;
   - `catalogScope=effective`: own plus Alfares shared only when setting is true;
   - `catalogScope=alfares`: shared only when setting is true or admin/service.
7. Keep create assigning `ownerUserId=actor.sub`.
8. Block ordinary user update/delete of shared products even when resale setting is true.
9. Enforce effective access in bulk/per-channel publication paths before dispatching to channel services.
10. Add tests for new user empty catalog, own product isolation, shared-product default block, opt-in visibility, mutation forbid, and publication gating.
11. Run focused tests, build, and diff check.
12. Record validation evidence and remaining blockers.

## Test Plan

- Unit tests for settings creation and default false.
- Product service tests for:
  - empty list for new user;
  - User A/User B isolation;
  - service/admin access compatibility;
  - shared Alfares hidden by default;
  - shared Alfares visible under effective scope after opt-in;
  - shared product mutation forbidden for ordinary user;
  - publication blocked for shared product when setting false.

## Validation Plan

```bash
npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts src/products/products.service.spec.ts
npm run build
git diff --check
```

If the focused test runner cannot resolve multiple paths, run the two Jest targets separately and record exact output.

## Gate Commands

```bash
npm test -- --runInBand src/catalog-access/catalog-access.service.spec.ts
npm test -- --runInBand src/products/products.service.spec.ts
npm run build
git diff --check
```

## Parallel Execution Strategy

The Catalog schema/API lane is the shared contract owner and must merge before sales-point code changes. Sales-point explorers may run now, but code workers in channel repos are dependency-gated until the Catalog API contract and tests are stable.

| Workstream | Status | Owner Role | Scope | Dependencies | Validation | Handoff |
|---|---|---|---|---|---|---|
| W0 Orchestration and contract | active | integration owner | Contract, Goal 22 docs, cross-repo plan, merge order | user prompt, repo preflight | diff check, doc review | dispatch bounded workers |
| W1 Catalog settings/API/source | ready now | Catalog backend worker | `src/catalog-access`, `src/products`, migration, tests | W0 contract | focused Jest, build, diff check | source patch and validation report |
| W2 Catalog frontend settings surface | dependency-gated | Catalog frontend worker | dashboard/settings UI for toggle | W1 API response contract | frontend tsc/build | user-visible toggle |
| W3 Auth registration/provisioning adapter | dependency-gated | Auth integration worker | optional hosted Auth callback/provision helper/docs | W1 provision endpoint | Auth contract tests/build | no JWT shape change |
| W4 Allegro/Bazos/Aukro/Heureka channel dashboards | dependency-gated | channel workers | product pickers/settings use Catalog effective scope and forward human bearer | W1 API, per-repo dirty review | repo-specific builds/tests | one repo per worker |
| W5 FlipFlop seller/private catalog lane | dependency-gated | FlipFlop integration worker | preserve public storefront; add seller/dashboard private catalog access only | W1 API and product-service route decision | product-service/frontend build and smoke | no checkout/payment breakage |
| W6 Runtime migration/deploy | blocked | deploy operator | apply additive migration, deploy Catalog, smoke | source validation, owner deploy approval | health, authorized smoke | no secret printing |
| W7 Cross-repo final validation | final integration | validation owner | prove new-user empty catalog and opt-in resale across selected services | W1-W6 complete | runtime route matrix | close Goal 22 |

Shared files/contracts: `docs/contracts/catalog-user-catalogs.md`, `ProductAccessScope`, product list/detail/publication APIs, user settings endpoint.

Integration owner: original Catalog orchestrator.
Validation owner: original Catalog orchestrator.
Merge order:

1. W0 docs/contract.
2. W1 Catalog backend.
3. W2 Catalog UI if needed.
4. W3 Auth optional adapter.
5. W4/W5 channel repo updates in parallel by repository after W1.
6. W6 Catalog deploy/migration.
7. W7 cross-repo smoke and status close.

## Parallel Dispatch List

### W1 Catalog Backend Worker

Objective: implement private catalog settings and effective product scope in `catalog-microservice`.
Allowed files: `src/catalog-access/**`, `src/products/**`, `src/app.module.ts`, `scripts/migrations/20260702_catalog_user_settings.sql`, Goal 22 validation docs.
Forbidden files: channel repos, Auth repo, Warehouse, Orders, Payments, deploy scripts, secrets, Kubernetes manifests.
Required inputs: this execution plan and `docs/contracts/catalog-user-catalogs.md`.
Blockers: none for source implementation.
Expected output: source patch, focused tests, build/diff evidence, deviations.

### W2 Catalog Frontend Worker

Objective: expose the disabled-by-default Alfares resale setting in the Catalog dashboard/settings UX.
Allowed files: `services/frontend/**` settings/dashboard components and API helper files.
Forbidden files: backend schema/source unless W1 hands off a mismatch; channel repos; Auth; secrets.
Required inputs: W1 endpoint response shape.
Blockers: dependency-gated on W1.
Expected output: toggle UI with default off, no visible instructional wall of text, typecheck/build evidence.

### W3 Auth Worker

Objective: decide and implement the smallest Auth-side provisioning support only if Catalog lazy provisioning is insufficient.
Allowed files: Auth docs/tests/source for registration/callback provisioning adapter.
Forbidden files: Auth JWT payload shape, password/OAuth behavior, production DB mutation, secrets.
Required inputs: W1 `POST /api/catalog/access/provision` contract.
Blockers: dependency-gated on W1 and owner decision whether Auth fanout is required.
Expected output: either no-code contract decision or source patch with Auth tests.

### W4 Channel Workers

Objective: per sales-point dashboard/publish flows use human-token Catalog effective scope and expose the resale toggle where that service owns seller settings.
Allowed files: one repo per worker: `allegro`, `bazos`, `aukro`, `heureka`.
Forbidden files: shared Catalog schema, unrelated channel publication policies, secrets, external marketplace mutations.
Required inputs: W1 API.
Blockers: dependency-gated on W1; dirty worktree review for Aukro/Heureka validation JSON.
Expected output: repo-specific patch and validation evidence.

Additional blockers/caveats: Allegro, Bazos, and FlipFlop currently have unrelated dirty catalog-event/proactive-consumer changes; do not edit those files without integration-owner assignment. Aukro needs account ownership hardening before trusting supplied `accountId`. Bazos gateway validation is blocked until `services/api-gateway/package.json` is valid JSON.

### W5 FlipFlop Worker

Objective: preserve public buyer storefront behavior while adding seller/private catalog access only to authenticated seller/admin surfaces.
Allowed files: FlipFlop product-service/frontend/user-service files identified by the worker.
Forbidden files: checkout/payment/order behavior unless directly required and approved; Catalog schema; Auth secrets.
Required inputs: W1 API and decision on buyer vs seller surface.
Blockers: dependency-gated on W1 and route ownership decision.
Expected output: no regression to public `/api/products`; seller flow uses private catalog settings.

Dirty worktree caveat: FlipFlop currently has unrelated proactive Catalog consumer changes in `.env.example`, RabbitMQ shared files, docs, and scripts. Do not overwrite them unless assigned.

## Documentation Updates

Update contract, goal, execution plan, cross-repo plan, pre-coding gate, validation report, implementation state, and orchestrator status.

## Rollback Plan

Before migration/deploy: revert source/docs/migration files. After migration application: disable new endpoints or revert code first; keep additive `catalog_user_settings` table in place unless owner approves drop after confirming no settings rows are needed. The default-false setting is fail-closed, so runtime rollback should prefer code rollback over destructive table removal.

## Agent Handoff Prompt

Implement only the assigned workstream from EP-CATALOG-22. Preserve Catalog/Auth/Warehouse/channel ownership boundaries. Do not deploy, apply migrations, read secrets, mutate production data, or touch forbidden files. Use synthetic tests and report exact validation evidence plus `[MISSING: ...]` blockers.

## Completion Checklist

- [ ] W0 contract and plan complete
- [ ] W1 backend implementation complete
- [ ] W2 UI implementation complete or explicitly deferred
- [ ] W3 Auth decision complete
- [ ] W4 channel workers complete
- [ ] W5 FlipFlop seller/public boundary complete
- [ ] W6 migration/deploy approved and complete
- [ ] W7 runtime validation complete
- [ ] Remaining blockers documented
