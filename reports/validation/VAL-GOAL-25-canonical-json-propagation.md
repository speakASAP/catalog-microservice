# VAL-GOAL-25: Canonical JSON Propagation And Manual Marketplace Overrides

```yaml
id: VAL-GOAL-25-CANONICAL-JSON-PROPAGATION
status: source-validation-passed-runtime-gated
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

Source validation only. Runtime migration, deploy, and authenticated endpoint smoke were not run in this pass.

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
- Additive migration only; production DB was not mutated.

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

- `[MISSING: owner approval to apply additive migration]`
- `[MISSING: owner approval to deploy Catalog]`
- `[MISSING: approved Auth token for protected API smoke]`
- `[MISSING: channel consumer implementation decision after Catalog source review]`

## Recommendation

Accept the source slice, review the additive migration, then run deploy/runtime validation only after approval and a valid Auth-backed operator token are available.
