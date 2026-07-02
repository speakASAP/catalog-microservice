# VAL-GOAL-25: Canonical JSON Propagation And Manual Marketplace Overrides

```yaml
id: VAL-GOAL-25-CANONICAL-JSON-PROPAGATION
status: runtime-deployed-protected-route-verified-auth-positive-gated
validated_artifact: implementation-goals/GOAL-25-canonical-json-propagation.md
owner: Catalog integration owner
created: 2026-07-02
last_updated: 2026-07-02
```

## Artifact Validated

- `implementation-goals/GOAL-25-canonical-json-propagation.md`
- `implementation-goals/GOAL-25-execution-plan.md`
- `docs/orchestrator/2026-07-02-canonical-json-propagation-plan.md`
- `docs/contracts/marketplace-description-connectors.md`
- `src/marketplace-fields/marketplace-profile.entity.ts`
- `src/marketplace-fields/marketplace-fields.service.ts`
- `src/marketplace-fields/marketplace-fields.service.spec.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/components/MarketplaceFieldsPanel.tsx`
- `scripts/migrations/20260702_marketplace_manual_overrides.sql`

## Validation Scope

Source validation plus post-deploy runtime guard validation. Authenticated positive marketplace-fields smoke remains gated by an approved operator/Auth token.

## Commands

```bash
2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm test -- --runInBand src/marketplace-fields/marketplace-fields.service.spec.ts'
# PASS: 1 suite, 4 tests

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm run build'
# PASS: nest build

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice/services/frontend && npm run build'
# PASS: Next.js build; warning only: multiple lockfiles/workspace-root inference

2026-07-02 ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && git diff --check'
# PASS: no whitespace errors
```

## Runtime Evidence

- Additive migration `scripts/migrations/20260702_marketplace_manual_overrides.sql` was applied after owner approval; `product_marketplace_profiles.manual_overrides` and `source_state` plus their GIN indexes are present in `catalog_db`.
- Catalog backend deployment is available `1/1` on image `localhost:5000/catalog-microservice:1135914`; Catalog frontend deployment is available `1/1` on `localhost:5000/catalog-frontend:latest`.
- `https://catalog.alfares.cz/health` returned HTTP 200 with `status=healthy`; product event outbox health is `up` with zero pending/publishing/failed/dead_letter rows.
- `https://catalog.alfares.cz/` returned HTTP 200 from the Next.js frontend.
- Anonymous `GET /api/products/00000000-0000-4000-8000-000000000001/marketplace-fields/bazos` returned protected HTTP 401 `Missing or invalid Authorization header`, confirming the deployed route is reachable and guarded.
- Backend logs checked over the post-recovery window showed no fresh `relation ... does not exist` errors for the Goal 25 tables/columns.

## Gate Evidence

- Manual override writes populate `manualOverrides` and `sourceState`.
- Later canonical product updates surface stale manual fields through `propagation.status=manual_review_required`.
- API fields expose `manualOverride`, `stale`, and `requiresManualReview`.
- UI renders `Manual` and `Source changed` markers and a marketplace-level review warning.
- Contract docs preserve canonical JSON as source of truth and describe manual override review semantics.

## Invariant Evidence

- Catalog remains product truth; marketplace overrides are profile metadata.
- Marketplace services still own external account, draft, compliance, publication, and platform mutation.
- No channel draft, publish, queue, confirmation, Warehouse mutation, Orders mutation, or external marketplace mutation was run.
- Additive migration only; no product rows, marketplace listings, orders, warehouse rows, or external marketplace state were mutated.

## Sensitive-Data Evidence

Tests and docs use synthetic product/listing values only. No secrets, bearer tokens, passwords, raw private marketplace payloads, or customer data were printed or stored.

## Passed Criteria

- Source implementation compiles.
- Focused marketplace profile tests pass.
- Frontend marker UI compiles.
- Contract and execution plan are saved.

## Failed Criteria

None in source validation.

## Deviations

Staleness uses the stored `Product.updatedAt` timestamp at manual override time. A future stricter implementation may compare renderer `sourceHash` values per marketplace once channel consumers are ready.

## Blockers

- `[DONE: owner approval to apply additive migration]`
- `[DONE: owner approval to deploy Catalog/backend/frontend runtime]`
- `[MISSING: approved Auth token for authenticated positive marketplace-fields API smoke]`
- `[MISSING: channel consumer implementation decision after Catalog source review]`

## Recommendation

Keep Goal 25 deployed. Complete the remaining authenticated positive marketplace-fields smoke only when an approved operator/Auth token is available; do not mint or print secrets solely for documentation closure.
