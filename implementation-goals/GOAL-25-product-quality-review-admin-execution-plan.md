# EP-CATALOG-25-PRODUCT-QUALITY-REVIEW-ADMIN

```yaml
id: EP-CATALOG-25-PRODUCT-QUALITY-REVIEW-ADMIN
status: w1-w3-source-validated-w4-active
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
policy_contract: docs/contracts/catalog-product-quality-review.md
cross_repo_plan: docs/orchestrator/2026-07-02-product-quality-review-admin-cross-repo-plan.md
owner: catalog orchestrator
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: backend-validation-frontend-source-validation
```

## Metadata

Branch: `main` currently has existing dirty work. Implementation should use an isolated branch or worktree after W0 is accepted and current Goal 24/source changes are isolated.

Lifecycle state: W1 backend policy/API, W2 validation/reporting, and W3 admin frontend are source-validated on `main`. W4 import/channel consumer work is active in Codex thread `019f24ba-0695-7bc2-aff7-27d9df27ea9a`. Runtime smoke and deployment remain owner/deploy-gated.

Filename note: this plan intentionally uses a product-quality-specific filename because `implementation-goals/GOAL-25-execution-plan.md` is already occupied by a concurrent dirty Goal 25 canonical-json propagation lane.

## Upstream Traceability

- `BUSINESS.md`: Catalog is the single source of truth for SKU, descriptions, categories, pricing, and media; hard delete, mass pricing, and inline media constraints apply.
- `SYSTEM.md`: NestJS/PostgreSQL/Next.js Catalog service and API surface.
- `docs/orchestrator/MASTER_PROMPT.md`: Catalog owns product truth/readiness and must preserve service boundaries.
- `docs/orchestrator/INTENT.md`: readiness and missing sellable data are Catalog responsibilities; stock/auth/channel ownership stays external.
- `docs/governance/PROJECT_INVARIANTS.md`: applicable invariant IDs are listed below.
- `implementation-goals/GOAL-25-product-quality-review-admin.md`: owner goal and acceptance criteria.
- `docs/orchestrator/2026-07-02-product-quality-review-admin-cross-repo-plan.md`: parallel workstream split and cross-repo handoff prompts.
- `docs/contracts/catalog-product-quality-review.md`: policy contract for workers.

## Goal Impact

Goal 25 makes Catalog safer as the product truth service by preventing incomplete products from accidentally becoming active or publishable, preserving incomplete imports as drafts, and giving operators a bulk review workflow that separates mandatory blockers from optional completeness opportunities.

## Project Invariants

- `CAT-INV-001`: preserved by centralizing global product quality/readiness in Catalog.
- `CAT-INV-002`: preserved by treating quantity as Warehouse-owned and optional for Catalog activation.
- `CAT-INV-003`: preserved by requiring existing Auth/RBAC guard conventions for review mutations.
- `CAT-INV-005`: preserved by exposing Catalog blockers without publishing to Bazos or other channels.
- `CAT-INV-006`: preserved because product deletion is out of scope.
- `CAT-INV-007`: preserved by delegating bulk pricing to the existing guarded pricing path.
- `CAT-INV-008`: preserved by requiring media URLs/object references only.
- `CAT-INV-009`: preserved by additive endpoints and no breaking read response changes.
- `CAT-INV-010`: preserved by actor/source traceability on mutations.

## Sensitive-Data Handling

Classification: internal product operations metadata. Shared reports must not include secrets, tokens, private logs, raw customer data, or production screenshots.

Owner/user identifiers in validation artifacts must be masked unless an explicit owner-facing run approves unmasked identifiers. Runtime credentials for authorized smoke tests must be supplied through approved environment/secret mechanisms and never printed.

## Contract/Schema Impact

Contract impact: additive API endpoints and report outputs under Goal 25.

Schema impact: no schema change is required for W0. W1 must inspect whether generated-description state already exists. If not, W1 must either fail closed and document `[MISSING: generated description state source]` or propose an additive state field/table in a separate reviewed schema step.

Replay/determinism impact: policy evaluation must be deterministic for the same product, media, pricing, lifecycle, and generated-description state inputs.

## Scope

- Add or refine the product quality policy contract.
- Define the execution plan and worker gates before coding.
- After W0 acceptance, implement a shared backend evaluator by extending existing Goal 02 readiness diagnostics.
- Add review/export/bulk-update/activation API surfaces.
- Add validation script and owner-readable reports.
- Add admin product review UI under the existing dashboard/admin shell.
- Add import/create/update gates so incomplete records remain draft/non-publishable.
- Coordinate channel consumers only after Catalog contract/API shape stabilizes.

## Non-Goals

- Do not delete products.
- Do not add Catalog stock quantity ownership.
- Do not implement Auth identity, local login, or local RBAC ownership in Catalog.
- Do not publish to marketplaces from Catalog.
- Do not bypass mass-pricing human review.
- Do not require optional completeness fields as global mandatory defects.
- Do not edit deployment scripts or Kubernetes manifests for W0-W4.
- Do not mutate production data during planning.

## Files To Inspect

Before coding, W1-W5 must inspect the narrow relevant set after reading repository instructions:

- `src/products/*`
- existing product readiness diagnostics from Goal 02
- `src/pricing/*` for current price and mass-pricing guard reuse
- `src/media/*` for media/placeholder classification
- `src/auth/*` or existing Catalog guard/decorator conventions
- `services/frontend/app/dashboard/**`
- `services/frontend/components/**`
- `services/frontend/lib/api/products.ts`
- package scripts and existing validation/smoke scripts

## Files To Create

Expected Goal 25 files:

- `docs/contracts/catalog-product-quality-review.md`
- `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`
- `reports/validation/GOAL-25-pre-coding-gate.md`
- `scripts/validate-product-quality.js` or equivalent after W2 starts
- `reports/validation/product-quality-audit.json` after validation script exists
- `reports/validation/product-quality-owner-report.md` after validation script exists
- `reports/validation/VAL-GOAL-25-product-quality-review-admin.md` after implementation validation

## Files To Modify

Allowed after W0 acceptance and with worker ownership:

- `src/products/*`
- `src/pricing/*` only for guarded pricing reuse
- `src/media/*` only for image/placeholder classification
- focused backend tests
- `services/frontend/app/dashboard/**`
- `services/frontend/components/**`
- `services/frontend/lib/api/products.ts`
- `package.json` only for `validate:product-quality` script if needed
- Goal 25 validation/status docs

## Files That Must Not Be Modified

- existing dirty Goal 24 files unless the integration owner explicitly reassigns ownership
- concurrent `implementation-goals/GOAL-25-execution-plan.md` canonical-json propagation artifact
- `src/product-relations/*`
- deployment scripts
- Kubernetes manifests
- destructive migrations
- unrelated channel repo source during Catalog W1-W3 work
- protected intent/business/invariant files unless the owner explicitly requests a governance update

## Implementation Steps

1. W0 contract/gate: accept this policy contract and execution plan, run the pre-coding/doc gates, and record evidence.
2. W1 backend evaluator/API: extend existing readiness into `catalog.product_quality.v1`, add review/export/bulk activation endpoints, and add focused tests.
3. W2 validation/reporting: add `validate:product-quality` with JSON and owner Markdown/CSV outputs, masking sensitive identifiers by default.
4. W3 frontend admin: add the dedicated dashboard review route/menu, filters, queue table, export action, selection state, and guarded bulk editor.
5. W4 import/channel consumers: verify importer draft defaults, Warehouse missing quantity zero behavior, and channel blocker consumption without moving ownership.
6. W5 integration: resolve conflicts, run the selected validation matrix, update implementation state/status, and prepare deployment-readiness evidence.

## Test Plan

Focused tests should cover mandatory policy classification, generated-description exemption or fail-closed missing marker, draft-on-incomplete behavior, activation blockers, bulk update auth/allowlist, pricing guard delegation, report shape and masking, and frontend blocker rendering where test infrastructure supports it.

## Validation Plan

Minimum source validation after implementation:

```bash
git diff --check
npm test -- --runInBand src/products/products.service.spec.ts
npm run build
cd services/frontend && npm run build
npm run validate:product-quality -- --format json --out reports/validation/product-quality-audit.json
```

Completed source validation:

- W1 backend/API: `reports/validation/VAL-GOAL-25-product-quality-review-admin.md`.
- W2 validation/reporting: `reports/validation/VAL-GOAL-25-product-quality-validation-script.md`.
- W3 admin UI: `reports/validation/VAL-GOAL-25-product-quality-review-admin-ui.md`.
- Latest orchestrator verification after W3 commit: `npm test -- --runInBand src/products/products.service.spec.ts` passed, 1 suite / 41 tests; `cd services/frontend && npm run build` passed with `/dashboard/admin/product-review`; `git diff --check` passed.

Deferred validation:

- `[MISSING: W4 import/channel consumer validation]`
- `[MISSING: runtime smoke/deploy approval]`

Runtime validation after explicit deploy approval only:

```bash
curl -sk https://catalog.alfares.cz/health
CATALOG_SMOKE_AUTHORIZED=true npm run smoke:e2e:authorized
```

## Gate Commands

W0 gate:

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
```

If a script is missing or not applicable, record the exact result in `reports/validation/GOAL-25-pre-coding-gate.md` and use the manual pre-coding checklist from `docs/process/OPERATIONAL_GATES.md`.

## Documentation Updates

- Keep W0 docs limited to Goal 25 contract, execution plan, and pre-coding report.
- Update `docs/IMPLEMENTATION_STATE.md` and `docs/orchestrator/STATUS.md` only after implementation/validation evidence exists or when the orchestrator accepts W0 as the active baseline.
- Keep validation reports under `reports/validation/` and avoid raw production identifiers.

## Rollback Plan

Planning rollback: revert the W0 documentation files only.

Source rollback after implementation: revert the Goal 25 branch or merge commit before deploy. If deployed, roll back to the previous Catalog image and disable review routes through normal deployment rollback; no destructive data fix should be required because Goal 25 is additive and should not hard-delete products.

## Parallel Execution

Integration owner: Catalog orchestrator in the original thread.

Validation owner: Product quality validation worker.

Merge order: W0 policy contract -> W1 backend evaluator/API -> W2 validation script/report -> W3 frontend admin review -> W4 import/channel consumers -> W5 final integration/deploy readiness.

Workstreams:

- W0 policy contract and IPS baseline: ready now; documentation only; allowed files are the Goal 25 contract, execution plan, and pre-coding validation report.
- W1 backend evaluator/API: dependency-gated on W0 acceptance; source ownership limited to backend products/media/pricing/auth conventions and focused tests.
- W2 validation/reporting: source-validated; owns validation script and report artifacts.
- W3 frontend admin: source-validated; owns dashboard route/components/API client only.
- W4 import/channel consumers: active in Codex thread `019f24ba-0695-7bc2-aff7-27d9df27ea9a`; read-only cross-repo discovery first, implementation only when safe and bounded.
- W5 final integration: active in the orchestrator thread; owns conflict resolution, status updates, full validation, and deploy-readiness evidence.

## Agent Handoff Prompt

You are implementing Catalog Goal 25 Product Quality Review Admin. Work only on remote `alfares` under `/home/ssf/Documents/Github/catalog-microservice` unless your assigned workstream explicitly names another remote repo. Read `AGENTS.md`, mandatory Catalog orchestrator docs, `implementation-goals/GOAL-25-product-quality-review-admin.md`, `docs/contracts/catalog-product-quality-review.md`, `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`, and `docs/orchestrator/2026-07-02-product-quality-review-admin-cross-repo-plan.md`. Preserve the IPS chain Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update. Do not edit files outside your assigned workstream. Mark unavailable facts as `[MISSING: ...]` or `[UNKNOWN: ...]`. Validate with the narrowest relevant gates and finish with changed files, validation evidence, blockers, and `Next step:`.

## Completion Checklist

- [x] W0 pre-coding gate accepted
- [x] Backend evaluator/API implemented
- [x] Validation script/report implemented
- [x] Frontend admin review UI implemented
- [ ] Import/channel consumer blockers verified (`W4 active: 019f24ba-0695-7bc2-aff7-27d9df27ea9a`)
- [x] Focused backend tests complete
- [x] W1/W2/W3 validation evidence collected
- [x] Goal 25 contract/report documentation updated
- [x] Deviations documented for deferred importer/channel consumers, generated-description state, and runtime deploy approval
