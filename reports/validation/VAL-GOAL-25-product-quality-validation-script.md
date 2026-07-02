# VAL-GOAL-25 Product Quality Validation Script

```yaml
id: VAL-GOAL-25-PRODUCT-QUALITY-VALIDATION-SCRIPT
status: source-validated-w2
created: 2026-07-02
last_updated: 2026-07-02
repository: /home/ssf/Documents/Github/codex-worktrees/catalog-goal25-product-quality-validation
branch: feature/catalog-goal-25-product-quality-validation
merged_w1_main_commit: f719cb70d1f2167d203137805f62f1c828fae55a
source_goal: implementation-goals/GOAL-25-product-quality-review-admin.md
policy_contract: docs/contracts/catalog-product-quality-review.md
execution_plan: implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md
```

## Intent Compliance Report

Vision: Catalog remains the Statex product truth service for product identity, sellable content, media references, pricing records, and publication readiness.

Goal Impact: product owners and operators can run a repeatable quality audit that separates activation blockers from optional completeness opportunities, emits JSON plus owner-readable reports, and masks owner identifiers by default.

System: Catalog owns quality/readiness reporting; Warehouse stock ownership, Auth identity/RBAC ownership, and channel publication/compliance ownership remain external.

Feature: Product Quality Review Admin validation/reporting W2.

Task: implement and validate `npm run validate:product-quality` using the stable W1 product quality review contract, then refresh generated reporting artifacts after W1 bulk delegation was merged to `main`.

Execution Plan: `implementation-goals/GOAL-25-product-quality-review-admin-execution-plan.md`.

Coding Prompt: W2 validation/reporting worker in an isolated remote worktree; no backend API shape, frontend, deployment, migration, product-relations, channel repo, or production data mutation changes.

Code: `scripts/validate-product-quality.js`, `package.json`, generated validation reports under `reports/validation/`.

Validation: syntax check, synthetic JSON audit generation, owner Markdown generation, owner CSV generation, focused product service spec, backend build, and diff check passed.

State Update: this report records W2 source evidence; orchestrator-owned implementation state/status update remains W5-owned.

## Worktree Note

W2 used the stable Codex worktree root `/home/ssf/Documents/Github/codex-worktrees/catalog-goal25-product-quality-validation` on branch `feature/catalog-goal-25-product-quality-validation`.

After W1 backend bulk delegation was merged and pushed to `main` at `f719cb70d1f2167d203137805f62f1c828fae55a`, W2 merged `origin/main` into the validation branch and refreshed generated artifacts.

## Implemented

- Added package alias `npm run validate:product-quality`.
- Added `scripts/validate-product-quality.js`.
- Supports `json`, `markdown`, and `csv` output through `--format`.
- Supports `--out` for machine-readable or owner-readable file output.
- Supports live API mode through `--api-base` or `CATALOG_PRODUCT_QUALITY_API_BASE` with bearer/internal-token headers.
- Supports JSON fixture input through `--input`.
- Defaults to deterministic synthetic/sanitized mode when no live API base/input is supplied.
- Masks owner identifiers by default.
- Blocks unmasked owner output unless `CATALOG_PRODUCT_QUALITY_UNMASKED_OWNER_REPORT_APPROVAL=approved` is set.
- Emits read-only safety metadata and does not mutate Catalog, Warehouse, marketplace, or channel state.

Generated artifacts:

- `reports/validation/product-quality-audit.json`
- `reports/validation/product-quality-owner-report.md`
- `reports/validation/product-quality-owner-report.csv`

## Validation Evidence

```bash
node --check scripts/validate-product-quality.js
# PASS

npm run validate:product-quality -- --format json --out reports/validation/product-quality-audit.json
# PASS
# source.mode=synthetic
# products=3, blocked=2, readyForActivation=1
# ownerIdentifiersMasked=true
# blockers:
# - [MISSING: generated description state contract]
# - [MISSING: live Catalog API base/token; synthetic validation mode used]

npm run validate:product-quality -- --format markdown --out reports/validation/product-quality-owner-report.md
# PASS
# products=3, blocked=2, readyForActivation=1

npm run validate:product-quality -- --format csv --out reports/validation/product-quality-owner-report.csv
# PASS
# products=3, blocked=2, readyForActivation=1

npm test -- --runInBand src/products/products.service.spec.ts
# PASS, 1 suite, 41 tests

npm run build
# PASS

git diff --check
# PASS, no output
```

Validation setup note: the isolated W2 worktree had no local dependency install. Build/test validation used a temporary symlink `node_modules -> /home/ssf/Documents/Github/catalog-microservice/node_modules`, then removed it before staging.

## Boundary Check

- `CAT-INV-001`: preserved; the validator reports Catalog product quality/readiness only.
- `CAT-INV-002`: preserved; no Catalog stock quantity ownership was added.
- `CAT-INV-003`: preserved; live API mode uses existing Auth-protected Catalog API and does not add local identity.
- `CAT-INV-005`: preserved; no marketplace publishing or channel compliance behavior was added.
- `CAT-INV-006`: preserved; no delete path or product mutation was changed.
- `CAT-INV-007`: preserved; no pricing mutation was added.
- `CAT-INV-008`: preserved; media is reported only as quality evidence.
- `CAT-INV-009`: preserved; no existing API/read response shape changed.
- `CAT-INV-010`: preserved; the script is read-only and does not introduce mutation endpoints.

## Parallel Execution

W2 status: source-validated, ready for orchestrator integration.

W3 frontend status: ready_parallel and started in Codex thread `019f24a3-c5b8-7481-a5e1-c5ea606db672`; W3 owns frontend dashboard/API-client files only and must not edit W2 reporting files.

Integration owner: Catalog orchestrator in the original thread.

Validation owner: W2 for reporting artifacts; W5 for final full-goal validation/deploy readiness.

Merge order: W1 merged to `main` -> W2 validation/reporting -> W3 frontend -> W4 importer/channel validation -> W5 final integration.

## Remaining Blockers

- `[MISSING: scripts/pre_coding_gate.py]`
- `[MISSING: scripts/strict_doc_audit.py]`
- `[MISSING: docs-rag JWT_TOKEN]`
- `[MISSING: generated description state contract]`
- `[MISSING: live Catalog API base/token for all-product production audit]`
- `[MISSING: production-safe unmasked owner-report approval process]`
- `[MISSING: W3 frontend admin review UI completion]`
- `[MISSING: W4 import/channel consumer validation]`

## Handoff

W2 is source-validated for validation/reporting. W5 can integrate this branch after W3/W4 handoffs, and run a live all-product audit only with an approved Catalog API base/token and owner masking policy.
