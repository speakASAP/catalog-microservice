# VAL-GOAL-25 W4 Import Draft Gate And Channel Consumers

```yaml
id: VAL-GOAL-25-W4-IMPORT-CHANNEL-CONSUMERS
status: source-implemented-partial-cross-repo-handoff
created: 2026-07-02
last_updated: 2026-07-02
primary_repository: /home/ssf/Documents/Github/catalog-microservice
worker_role: W4 cross-repo integration owner
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
policy_contract: docs/contracts/catalog-product-quality-review.md
execution_plan: implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md
cross_repo_plan: docs/orchestrator/2026-07-02-product-quality-review-admin-cross-repo-plan.md
```

## Intent Preservation Chain

Vision: Catalog remains the Statex product truth service for product identity, sellable content, pricing, media references, lifecycle, and publication readiness.

Goal Impact: imported and manually created incomplete products stay draft/non-publishable, and marketplace/product-selection consumers fail closed when Catalog quality blockers remain.

System: Catalog owns product quality/readiness; Warehouse owns stock quantity; Auth owns identity/RBAC; channel services own channel policy, draft, queue, and publication behavior.

Feature: Product Quality Review Admin W4 importer/channel consumer adoption.

Task: inspect `catalog-microservice`, `warehouse-microservice`, `allegro`, `bazos`, `aukro`, `flipflop`, and `heureka`; implement only bounded safe gaps; avoid production data mutation, deploys, destructive DB operations, and Goal 24 product-relations files.

Execution Plan: W4 lane in `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`.

Coding Prompt: delegated W4 prompt from thread `019f2358-4c0c-7a42-b68d-7d96846a9eb9`.

Code: Bazos source-only changes listed below. No Catalog, Warehouse, Allegro, Aukro, FlipFlop, or Heureka source edits were made by this worker.

Validation: focused Bazos unit specs, shared build, and whitespace diff check passed. No deployment, production DB mutation, queue execution, marketplace publish, Warehouse mutation, or live smoke was run.

State Update: this report records W4 handoff evidence for W5; broad orchestrator status integration remains W5-owned because several related repos have concurrent dirty Goal 25 work.

## Changed Files

Repository: `/home/ssf/Documents/Github/bazos`

- `shared/clients/catalog-client.service.ts`
  - Added `getProductReadiness(productId, authorization?)` against Catalog `GET /api/products/:id/readiness`.
  - Added internal Catalog service headers from `CATALOG_INTERNAL_SERVICE_TOKEN` or `INTERNAL_SERVICE_TOKEN` when no human bearer is supplied.
- `shared/bazos/ad/bazos-ad.service.ts`
  - Manual `saveToCatalog` draft creation now writes Catalog products as `isActive=false`, `lifecycle='draft'`.
  - Similar-product lookup no longer filters only active products, so existing draft Catalog records can be reused instead of duplicated.
- `shared/bazos/ad/bazos-ad.service.spec.ts`
  - Added assertions for draft/non-active Catalog payload and draft-inclusive search.
- `shared/bazos/policy/publish-policy.types.ts`
  - Added `catalog_quality_blocked` policy gate.
- `shared/bazos/policy/publish-policy.service.ts`
  - Injects `CatalogClientService` and evaluates Catalog readiness after Warehouse stock evidence.
  - Blocks publish policy when Catalog readiness has blocking issues, `publishable=false`, missing Catalog product id, missing client, or readiness lookup failure.
- `shared/bazos/policy/publish-policy.service.spec.ts`
  - Added default clean Catalog readiness fixture.
  - Added tests for Catalog quality blockers and fail-closed readiness outage.

## Per-Repo Findings

### Catalog

Status at final inspection: `main...origin/main`, latest `e911738 merge: product quality review admin UI branch`; clean before this W4 report.

Evidence:

- `src/products/products.service.ts` defaults new products without explicit lifecycle to `draft`, has quality review queue/export/bulk/activate code, and blocks ordinary activation when quality blockers remain.
- `scripts/validate-product-quality.js` and `package.json` `validate:product-quality` exist.
- W3 frontend validation reports exist for admin review UI.

No W4 Catalog source edit was required.

### Warehouse

Status at final inspection: `main...origin/main`, latest `4d0fa85 chore: harden warehouse migration build output`; clean.

Evidence:

- `src/stock/stock.service.ts` creates a missing stock row with `quantity=0`, `reserved=0`, `available=0` before absolute set operations.
- `src/stock/dto/stock-mutation.dto.ts` accepts `quantity >= 0` for stock set.
- This preserves Warehouse stock ownership; no Catalog stock field was added.

No Warehouse source edit was required.

### Allegro

Initial inspection found clean `main`; final inspection showed concurrent dirty Goal 25 files owned outside this worker.

Evidence from source inspection:

- `shared/clients/catalog-client.service.ts` has `getProductQualityPreflight`.
- `services/allegro-service/src/allegro/catalog-sell-action/catalog-sell-action.service.ts` calls `assertCatalogQualityAllowsAllegro` before draft preparation and blocks status/edit/confirm when Catalog quality blocks remain.
- `scripts/migrate-products-to-catalog.ts` maps missing offer stock through `Number(offer.stockQuantity || 0)` and Warehouse `stock/set` uses finite quantity else `0`.

No Allegro edit was made by this worker. W5 must integrate with the concurrent Allegro dirty files before staging.

### Bazos

This worker implemented the bounded missing core described above.

Important boundary:

- The new publish policy gate uses Catalog readiness only; it does not publish, queue, mutate Warehouse, or alter Bazos identity/session/challenge controls.
- Runtime readiness depends on a configured Catalog internal token in Bazos runtime environment. This was not verified live because no deploy or secret inspection was in scope.

### Aukro

Initial inspection found clean `main`; final inspection showed concurrent dirty Goal 25 files owned outside this worker.

Evidence from source inspection:

- `shared/clients/catalog-client.service.ts` exposes Catalog quality/readiness support.
- `services/aukro-service/src/aukro/offers/offers.service.ts` builds a Catalog quality snapshot, fails closed when unavailable, and calls `assertCatalogQualityAllowsDraft`.
- UI status surfaces `catalogQualityCanActivate` and `blockingIssues`.

No Aukro edit was made by this worker. W5 must integrate with the concurrent Aukro dirty files before staging.

### FlipFlop

Initial inspection found dirty Goal 25 consumer work; final inspection showed `main...origin/main [ahead 1]` at `b1817e7 feat: consume catalog quality blockers`.

Evidence from source inspection:

- `services/product-service/src/products/catalog-product-quality.policy.ts` normalizes Catalog quality blockers.
- `services/product-service/src/products/products.service.ts` adds Catalog quality blockers to catalog selection, offer policy, publish status, and native publish lifecycle.
- `scripts/verify-catalog-product-quality-blockers.js` exists but must be executable validation before W5 accepts runtime readiness.

No FlipFlop edit was made by this worker.

### Heureka

Initial inspection found dirty `shared/clients/catalog-client.service.ts`; final inspection showed broader concurrent Goal 25 dirty files.

Evidence from source inspection:

- `shared/clients/catalog-client.service.ts` includes Catalog product quality review queue lookup helpers.
- `services/heureka-service/src/heureka/feed/feed.service.ts` blocks feed preview when Heureka readiness is not ready/warning.
- Current dirty feed/dashboard files likely extend quality-blocker propagation; W5 must validate the concurrent worker output before staging.

No Heureka edit was made by this worker.

## Validation Evidence

```bash
ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared test -- --runInBand shared/bazos/policy/publish-policy.service.spec.ts shared/bazos/ad/bazos-ad.service.spec.ts'
# PASS: 2 suites, 54 tests
```

```bash
ssh alfares 'cd /home/ssf/Documents/Github/bazos && npm --prefix shared run build'
# PASS: @bazos/shared tsc
```

```bash
ssh alfares 'cd /home/ssf/Documents/Github/bazos && git diff --check'
# PASS: no output
```

Read-only inspection commands were also run across all seven repos with `git status --short --branch`, targeted `rg`, and targeted `sed`/`nl` source reads.

## Dirty Worktree Caveats

Final observed dirty worktrees after concurrent work:

- `allegro`: dirty Goal 25 consumer files and `reports/validation/VAL-GOAL-25-allegro-catalog-quality-consumer.md`.
- `bazos`: this worker's six source/spec files plus concurrent docs/UI/catalog sell-action files.
- `aukro`: dirty Goal 25 blocker files and IPS artifacts.
- `flipflop`: ahead one commit `b1817e7 feat: consume catalog quality blockers`.
- `heureka`: dirty Goal 25 quality/feed/dashboard files and validation report.

W5 must not stage all dirty files blindly. Stage by owner/workstream after inspecting diffs.

## Remaining Blockers

- `[MISSING: W5 integration review of concurrent Allegro/Aukro/FlipFlop/Heureka/Bazos dirty worktrees]`
- `[MISSING: Bazos runtime verification that CATALOG_INTERNAL_SERVICE_TOKEN or INTERNAL_SERVICE_TOKEN is configured for protected Catalog readiness calls]`
- `[MISSING: full cross-service validation matrix after all W4 consumer changes are merged]`
- `[MISSING: deploy approval]`
- `[MISSING: authorized runtime smoke token for protected Catalog/channel checks]`
- `[MISSING: generated-description state contract]`

## Handoff For W5

Recommended merge/order:

1. Inspect and stage Bazos W4 source/spec files from this report separately from concurrent Bazos docs/UI/catalog sell-action files.
2. Integrate concurrent Allegro, Aukro, FlipFlop, and Heureka Goal 25 consumer outputs in repo-specific order, resolving only actual file overlaps.
3. Re-run per-repo focused tests/builds, then Catalog validation:
   - `npm test -- --runInBand src/products/products.service.spec.ts`
   - `npm run build`
   - `cd services/frontend && npm run build`
   - `npm run validate:product-quality -- --format json --out reports/validation/product-quality-audit.json`
4. Only after owner approval, run deployment/readiness gates and protected runtime smokes.
