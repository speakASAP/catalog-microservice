# 2026-07-02 Product Quality Review Admin Cross-Repo Plan

Status: planned, not implemented
Primary repo: `/home/ssf/Documents/Github/catalog-microservice`
Related repos: `warehouse-microservice`, `allegro`, `bazos`, `aukro`, `flipflop`, `heureka`, `auth-microservice`

## Live Evidence Collected

- Catalog branch: `main`, latest observed commit `9909a5d docs: align catalog source defaults`.
- Catalog worktree already has unrelated dirty `GOAL-24` product-relations files. This plan must not overwrite them.
- Existing product model has `sku`, `title`, nullable `description`, `description_rich`, `brand`, `manufacturer`, `ean`, dimensions, tags, categories, attributes, media, pricing, `isActive`, and `lifecycle`.
- Existing lifecycle values are `draft`, `active`, `archived`, and `needs_review`.
- Existing readiness already checks duplicate SKU/EAN, description, category, media, placeholder media, current price, lifecycle, and active state.
- Existing quality audit endpoint currently focuses on missing EAN and duplicate SKU/EAN; it is not yet an owner-facing mandatory-field report.
- Existing frontend has `/dashboard` navigation and `/dashboard/admin`, while legacy `/admin` redirects to `/dashboard`.
- Existing pricing bulk path requires explicit human review for large pricing changes.
- `[MISSING: docs-rag JWT_TOKEN]`; planning used repository files directly.

## Intent Preservation Chain

Vision: Catalog is the Statex product truth service for sellable product content and publication readiness.

Goal Impact: Every product can be imported safely as a draft, reviewed against mandatory product-quality standards, reported to its owner, and updated in groups without losing ownership boundaries.

System: Catalog owns product identity/content/media/pricing/readiness; Warehouse owns stock quantity; Auth owns identity/RBAC; channel repos consume readiness.

Feature: Product Quality Review Admin with mandatory-field validation, owner report, bulk update editor, and draft gate.

Task: Implement `GOAL-25-product-quality-review-admin` after current `GOAL-24` product-relations work is integrated or isolated.

Execution Plan: This document.

Coding Prompt: Use the workstream prompts below. Each worker must read `AGENTS.md`, mandatory Catalog orchestrator docs, this plan, and `implementation-goals/GOAL-25-product-quality-review-admin.md` before source edits.

Code: `[MISSING: implementation not started]`.

Validation: `[MISSING: source validation not run because this is planning only]`.

State Update: Add implementation evidence to `docs/IMPLEMENTATION_STATE.md` and `docs/orchestrator/STATUS.md` only after implementation/validation.

## Product Quality Policy

### Blocking Mandatory Fields

These fields block `active` lifecycle and publishability:

- `sku`: required, non-empty, unique within owner/source scope.
- `title`: required, non-empty.
- `description` or `descriptionRich`: required unless a generated-description workflow state proves the description is pending/generated. Generated descriptions are not owner missing-data defects.
- current positive selling price: active pricing row with positive `salePrice` or `basePrice`.
- media image: at least one `media` row with `type=image` and a non-placeholder URL/reference.

### Draft Defaults

- New imported products with missing mandatory fields must be saved as `lifecycle=draft`, `isActive=false` or equivalent non-publishable state.
- Existing products that fail newly added policy should be reported as blockers and may be moved to `needs_review` only through an explicit reviewed migration/script plan. Do not silently archive or delete.
- Quantity is optional and defaults to `0` in importer/Warehouse integration. Catalog must not add stock quantity fields to `products`.

### Non-Blocking Completeness Fields

The review UI may filter and bulk update optional fields, but the owner mandatory-gap report must not call them required:

- `brand`, `manufacturer`, `ean`, dimensions, weight, SEO, tags, category, material, color, and other product attributes.

If a channel later requires one of these fields, implement it as channel readiness, not as a global Catalog mandatory blocker.

## Proposed Catalog API Contract

Additive endpoints under authenticated Catalog routes:

- `GET /api/products/review/quality`
  - Query: pagination, lifecycle, owner/source scope, missingField, severity, search, catalogScope.
  - Response: product summary plus `blockingIssues`, `optionalOpportunities`, `completionScore`, `canActivate`, `nextAction`.

- `GET /api/products/review/quality/export`
  - Query: same filters plus `format=json|csv|markdown`.
  - Response: owner report. No raw secrets, no customer data.

- `POST /api/products/review/bulk-update`
  - Body: `productIds`, `patch`, `attributePatch`, `categoryPatch`, `pricingPatch?`, `expectedMissingField?`, `humanReview`.
  - Guardrails: authenticated owner/admin scope; allowlist fields; optimistic policy re-check after update; pricing patch delegates to guarded pricing service; large price changes require existing explicit human review.

- `POST /api/products/review/activate`
  - Body: `productIds`, `humanReview`.
  - Behavior: promotes only products passing blocking policy; returns per-product blockers for failures.

## Validation Script Contract

Add script such as `scripts/validate-product-quality.js` and package alias `validate:product-quality`.

Expected outputs:

- `reports/validation/product-quality-audit.json`: machine-readable rows.
- `reports/validation/product-quality-owner-report.md`: owner-readable action report.
- Optional CSV for spreadsheet review.

Report row shape:

```json
{
  "productId": "uuid",
  "sku": "SKU",
  "title": "Name",
  "ownerUserId": "masked-or-null",
  "lifecycle": "draft",
  "blockingMissingFields": ["description", "price", "image"],
  "optionalOpportunities": ["manufacturer", "color"],
  "nextAction": "Fill mandatory fields before activation"
}
```

Sensitive-data rule: mask owner identifiers unless the owner-facing execution explicitly requires unmasked owner IDs and is approved.

## Admin UI Plan

Add a dedicated menu entry under `/dashboard/admin/product-review` or `/dashboard/product-review` depending on existing admin route shape.

Views:

- Review queue table: SKU, title, lifecycle, owner/source, missing mandatory fields, completion score, last updated, current selection state.
- Field gap tabs/filters: description, price, image, title, SKU duplicates, draft, needs_review.
- Bulk editor panel:
  - common product fields: brand, manufacturer, tags, SEO, lifecycle;
  - attributes: color, material, arbitrary attribute value selected from existing attribute catalog;
  - categories: add/replace category;
  - media: link image URL/reference or assign existing media;
  - pricing: guarded bulk pricing path with review marker;
  - activation: re-check policy before `active`.
- Owner report panel: export current filtered mandatory blockers.

UX constraints:

- Use existing Auth/AdminGuard and dashboard shell.
- Keep review tooling dense and operational, not marketing-like.
- Do not expose optional fields as required defects in the owner report.

## Cross-Repo Impact

### Catalog

Primary implementation.

Allowed areas:

- `implementation-goals/GOAL-25-*`
- `docs/orchestrator/*product-quality-review*`
- `docs/contracts/*product-quality*`
- `src/products/*`
- `src/pricing/*` only to reuse existing guarded bulk path
- `src/media/*` only for image/placeholder classification if needed
- `scripts/validate-product-quality.js`
- `services/frontend/app/dashboard/**`
- `services/frontend/components/**`
- `services/frontend/lib/api/products.ts`
- `reports/validation/VAL-GOAL-25-*`

Forbidden without explicit integration owner approval:

- existing dirty `src/product-relations/*` and `GOAL-24` files
- deployment scripts
- Kubernetes manifests
- destructive migrations
- product hard deletes

### Warehouse

Owner of quantity default behavior.

Expected work:

- Verify import/stock write paths treat missing source quantity as `0`.
- Do not add Catalog product stock fields.
- If a product import pipeline writes Warehouse stock, make missing quantity produce an explicit zero-stock state and validation evidence.

### Allegro/Bazos/Aukro/FlipFlop/Heureka

Consumers.

Expected work:

- Consume Catalog readiness/publishable state.
- Keep channel-specific policy in the channel service.
- Block publish/draft confirmation when Catalog says mandatory blockers remain.
- Surface Catalog owner report links or blockers where product selection happens.

### Auth

Expected work only if existing roles are insufficient:

- `[UNKNOWN: whether current Catalog admin roles cover product quality reviewers]`.
- Prefer existing hosted Auth/RBAC; do not add local login/register flows.

## Parallel Execution

### W0 - Policy Contract And IPS Baseline

Status: ready now.
Owner role: Catalog contract owner.
Objective: Write the versioned product quality policy contract and execution plan.
Allowed files: `docs/contracts/catalog-product-quality-review.md`, `implementation-goals/GOAL-25-execution-plan.md`, `reports/validation/VAL-GOAL-25-pre-coding.md`.
Forbidden files: source code, migrations, deployment files, dirty `GOAL-24` files.
Expected output: policy contract, field taxonomy, pre-coding gate result.
Dependencies: none.
Blockers: `[MISSING: docs-rag JWT_TOKEN]` can be recorded, not blocking.
Validation evidence: `python3 scripts/pre_coding_gate.py --root .` if available, `git diff --check`.
Handoff notes: W1/W2/W3 start after W0 contract is merged or explicitly accepted.

### W1 - Backend Quality Evaluator And Review API

Status: dependency-gated on W0.
Owner role: Catalog backend owner.
Objective: Extend Goal 02 readiness into reusable mandatory policy, review endpoints, and activation gate.
Allowed files: `src/products/*`, `src/media/*` if needed for image classification, backend tests.
Forbidden files: frontend, deployment, product-relations, Warehouse stock logic.
Expected output: additive API endpoints and tests.
Dependencies: W0.
Blockers: existing dirty worktree must be isolated before editing.
Validation evidence: focused product tests, `npm run build`, `git diff --check`.
Handoff notes: W2 uses evaluator directly; W3 uses API types.

### W2 - Validation Script And Owner Report

Status: dependency-gated on W0/W1 evaluator shape.
Owner role: Validation/reporting owner.
Objective: Add all-product validation script and owner-facing report outputs.
Allowed files: `scripts/validate-product-quality.js`, `package.json`, `reports/validation/VAL-GOAL-25-*`, focused fixtures/tests if existing pattern supports them.
Forbidden files: frontend UI, channel repos, deployment.
Expected output: JSON/Markdown/CSV report, documented command.
Dependencies: W0 and either W1 merged evaluator or a stable exported contract.
Blockers: `[UNKNOWN: production-safe way to run report against live data without exposing owner IDs]`.
Validation evidence: script dry-run on synthetic/local data or sanitized runtime run after approval.
Handoff notes: W5 owns production/runtime report run.

### W3 - Admin Product Review UI And Bulk Editor

Status: dependency-gated on W1 API shape.
Owner role: Frontend admin owner.
Objective: Add separate admin menu/page for product review, filtered table, export control, and bulk editor.
Allowed files: `services/frontend/app/dashboard/**`, `services/frontend/components/**`, `services/frontend/lib/api/products.ts`.
Forbidden files: backend source, deployment, product-relations.
Expected output: admin route, API client bindings, bulk edit states, error/blocker rendering.
Dependencies: W1 API contract.
Blockers: `[UNKNOWN: final route should be /dashboard/admin/product-review or /dashboard/product-review]`; choose the route that matches current admin shell after inspection.
Validation evidence: `cd services/frontend && npm run build`; browser smoke if dev server is available.
Handoff notes: W5 validates integrated backend/frontend behavior.

### W4 - Import Draft Gate And Cross-Service Consumers

Status: dependency-gated on W0/W1.
Owner role: Cross-repo integration owner.
Objective: Verify and plan importer/channel changes so incomplete products remain draft and channel publication honors Catalog blockers.
Allowed files after implementation starts: Catalog import path, Allegro/Bazos/Aukro/FlipFlop/Heureka product picker or publish-preflight files, Warehouse import/stock integration tests.
Forbidden files: marketplace publish confirmation logic unless only reading Catalog blockers; Warehouse stock ownership changes in Catalog.
Expected output: per-repo exact implementation tasks and minimal code changes only after W1 contract stabilizes.
Dependencies: W0/W1.
Blockers: dirty related repos observed in Allegro/Bazos/FlipFlop/Warehouse; isolate before editing.
Validation evidence: per-repo contract tests/builds.
Handoff notes: Merge channel consumers after Catalog API is stable.

### W5 - Final Integration, Runtime Validation, Deploy Readiness

Status: final integration.
Owner role: Catalog orchestrator.
Objective: Integrate W1-W4, run full validation, update state/status, and prepare deploy gate.
Allowed files: status/validation reports and any conflict-resolution edits after worker handoff.
Forbidden files: destructive migrations, hard deletes, production deploy without approval.
Expected output: Intent Compliance Report, validation evidence, deployment-readiness decision.
Dependencies: all source workstreams.
Blockers: owner approval for production migration/deploy/runtime authorized smoke if needed.
Validation evidence: full selected validation matrix and sanitized runtime report.
Handoff notes: Do not deploy until dirty worktree and validation debt are separated.

## Agent-Ready Prompts

### Prompt W0

You are W0 for Catalog Goal 25 Product Quality Review Admin. Work only on remote `alfares` under `/home/ssf/Documents/Github/catalog-microservice`. Do not save code under `/Users/Sergej.Stasok/Documents`. Read `AGENTS.md`, the mandatory Catalog orchestrator docs, `implementation-goals/GOAL-25-product-quality-review-admin.md`, and `docs/orchestrator/2026-07-02-product-quality-review-admin-cross-repo-plan.md`. Create or refine the policy contract and execution plan only. Do not edit source code, migrations, deployment, or existing dirty `GOAL-24` files. Preserve IPS chain and mark unknowns as `[MISSING: ...]` or `[UNKNOWN: ...]`. Validate with the narrowest doc/pre-coding gates available and `git diff --check`. Finish with an Intent Compliance Report and `Next step:`.

### Prompt W1

You are W1 for Catalog Goal 25 backend quality evaluator and review API. Start only after W0 contract exists. Work only on remote `alfares` in `/home/ssf/Documents/Github/catalog-microservice`. Read all mandatory Catalog orchestrator docs and Goal 25 artifacts. Implement an additive mandatory product-quality evaluator by extending existing readiness, plus review/export/bulk activation endpoints. Do not touch frontend, deployment, Warehouse stock ownership, or dirty `GOAL-24` product-relations files. Validate with focused product tests, build, and diff check. Produce handoff for W2/W3 and `Next step:`.

### Prompt W2

You are W2 for Catalog Goal 25 validation script and owner report. Start after W0 and W1 evaluator contract are available. Work only on remote `alfares` in `/home/ssf/Documents/Github/catalog-microservice`. Add `validate:product-quality` with JSON and owner-readable report output. Mask owner identifiers unless an approved owner-facing run requires them. Do not edit frontend, deployment, or channel repos. Validate script output on synthetic/sanitized data and run diff check/build if package files change. Finish with evidence and `Next step:`.

### Prompt W3

You are W3 for Catalog Goal 25 admin product review UI. Start after W1 API shape is stable. Work only on remote `alfares` in `/home/ssf/Documents/Github/catalog-microservice`. Add a separate admin review route/menu, review queue, filters, export control, selection, and guarded bulk editor. Use existing Auth/AdminGuard/dashboard conventions. Do not edit backend source or deployment files. Validate frontend build and browser smoke if available. Finish with screenshots/evidence summary and `Next step:`.

### Prompt W4

You are W4 for Goal 25 import draft gate and cross-service consumers. Start after W0/W1 contract is stable. Inspect remote repos `catalog-microservice`, `warehouse-microservice`, `allegro`, `bazos`, `aukro`, `flipflop`, and `heureka` on `alfares`. Keep the pass read-only unless the orchestrator explicitly opens implementation. Identify exact importer/channel files that must honor Catalog blockers and missing quantity default `0`. Do not mutate production data, deploy, or edit dirty unrelated work. Finish with per-repo implementation tasks, blockers, validation commands, and `Next step:`.

### Prompt W5

You are W5 final integration owner for Goal 25. Start after W1-W4 handoffs are complete. Work only on remote `alfares` in `/home/ssf/Documents/Github/catalog-microservice`. Integrate conflicts, run full validation, update implementation state/status and validation report, and prepare deployment-readiness evidence. Do not deploy without explicit owner intent. Finish with Intent Compliance Report and `Next step:`.

## Initial Risks

- Dirty `GOAL-24` changes in Catalog and related repos can conflict with implementation branches.
- The existing quality audit treats EAN as a warning; Goal 25 must avoid making EAN globally mandatory unless the owner changes policy.
- Generated description state is not yet proven in the current model; implementation must either add a small explicit state or document `[MISSING: generated description state source]`.
- Owner report must not expose sensitive owner/user data in shared validation artifacts.
- Bulk update of attributes needs careful allowlisting to avoid overwriting product-specific facts accidentally.

## Next Implementation Command

After this plan is accepted and current dirty work is isolated:

```text
CATALOG ORCHESTRATOR: implement goal number 25
```
