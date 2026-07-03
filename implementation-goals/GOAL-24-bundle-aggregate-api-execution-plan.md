# GOAL 24 B1.1 - Catalog Bundle Aggregate API Execution Plan

```yaml
id: GOAL-24-B1.1-catalog-bundle-aggregate-api
status: active
owner_role: catalog backend worker
created: 2026-07-03
repository: /home/ssf/Documents/Github/codex-worktrees/catalog-goal24-bundle-api
branch: goal24-catalog-bundle-api
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Catalog can expose durable bundle identity while preserving product truth and downstream checkout/stock/payment boundaries.
- Goal Impact: resolve `[MISSING: Catalog additive migration/API implementation for catalog.bundle.v1]` after owner accepted the B1 design.
- System: Catalog owns bundle aggregate metadata over existing product IDs; Orders, Warehouse, Payments, FlipFlop, and marketplace services keep their current ownership.
- Feature: protected additive `catalog.bundle.v1` API and persistence.
- Task: implement TypeORM entities, additive migration, protected controller/service, focused tests, and state docs.
- Execution Plan: this plan; source-only implementation in isolated remote worktree; no deploy or runtime DB mutation.
- Coding Prompt: no product-like SKU, no stock quantity, no order/cart/payment/reservation/marketplace mutation, fail closed on missing products/contracts/sensitive evidence.
- Code: `src/bundles/*`, `src/app.module.ts`, `scripts/migrations/20260703_catalog_bundle_aggregate.sql`, Goal 24 docs/reports.
- Validation: focused bundles Jest, `npm run build`, `git diff --check`; pre-coding scripts if present.
- State Update: record accepted owner gate, source implementation evidence, and remaining downstream blockers.

## Allowed Files

- `src/bundles/*`
- `src/app.module.ts`
- `scripts/migrations/20260703_catalog_bundle_aggregate.sql`
- `docs/contracts/catalog-bundle-aggregate-v1.md`
- `docs/contracts/catalog-bundle-commerce-contract.md`
- `implementation-goals/GOAL-24-product-relations.md`
- `implementation-goals/GOAL-24-bundle-aggregate-api-execution-plan.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `reports/validation/VAL-GOAL-24-bundle-aggregate-api.md`

## Forbidden Files And Actions

- Orders, Warehouse, Payments, FlipFlop, marketplace repo edits.
- Kubernetes manifests, deployment scripts, secrets, `.env*`, generated `dist`, `.next`, `node_modules`.
- Runtime DB mutation, migration application, production deploy, checkout/cart/order/payment/reservation/publish side effects.
- Catalog product SKU creation, stock ownership, price calculation, or final payable total authority.

## Validation Plan

1. `python3 scripts/pre_coding_gate.py --root .` if present, otherwise record `[MISSING: scripts/pre_coding_gate.py]`.
2. `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` if present, otherwise record `[MISSING: scripts/strict_doc_audit.py]`.
3. `npm test -- --runInBand src/bundles/bundles.service.spec.ts`.
4. `npm run build`.
5. `git diff --check`.

## Parallel Execution

This source lane is not parallelized because it owns one new public/internal API surface, one migration, and shared `AppModule` wiring. Downstream Orders, Warehouse, Payments, and FlipFlop lanes remain separate after this source branch is merged.
