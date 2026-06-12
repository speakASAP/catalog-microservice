# EP-CATALOG-02: Product Model Completeness

```yaml
id: EP-CATALOG-02
status: draft
source_goal: implementation-goals/GOAL-02-product-model-completeness.md
owner: orchestrator
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
```

## Metadata

Remote implementation repository: `alfares:/home/ssf/Documents/Github/catalog-microservice`.

Branch target: `feature/catalog-goal-02-product-model-completeness`.

Lifecycle state: planning complete; pre-coding gate required before source edits.

## Upstream Traceability

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/INTENT.md`
- `docs/orchestrator/GOALS.md`
- `docs/orchestrator/PLAN.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/governance/PROJECT_INVARIANTS.md`
- `implementation-goals/GOAL-02-product-model-completeness.md`

## Goal Impact

Goal 2 improves Catalog as the product truth service by making each product describe its lifecycle state and expose why it is or is not sellable/publishable. The work keeps Catalog responsible for product quality/readiness facts without moving stock, checkout, login, Bazos publishing, or channel compliance ownership into Catalog.

## Project Invariants

- `CAT-INV-001`: preserve Catalog as product truth by adding lifecycle and quality facts to product records.
- `CAT-INV-002`: no warehouse stock quantities, reservations, movements, or locations are added.
- `CAT-INV-005`: Bazos readiness remains diagnostic only; Catalog must not publish or bypass Bazos compliance.
- `CAT-INV-008`: media diagnostics inspect external media references only; no inline media blobs.
- `CAT-INV-009`: public product read responses must remain backward compatible through additive optional fields and existing envelope shapes.

## Sensitive-Data Handling

Use synthetic products, SKUs, EANs, and media URLs in tests/smokes. Do not print auth tokens, secrets, raw production samples, or customer data in prompts, reports, logs, or screenshots. Existing production smoke data may be referenced only by count/status and not copied as raw records.

## Contract/Schema Impact

Schema impact is expected and additive:

- Add product lifecycle field with allowed values `draft`, `active`, `archived`, `needs_review`.
- Preserve existing `isActive` behavior for compatibility; map or default lifecycle so old consumers keep working.
- Add diagnostics/readiness output either as additive product response field(s) or a new product diagnostics endpoint.
- Add duplicate SKU/EAN and missing EAN audit access without changing existing `GET /api/products` envelope.

## Scope

- Product entity lifecycle and quality/readiness types.
- Product DTOs/query DTOs where needed.
- Product service diagnostics helpers and duplicate/missing-field audits.
- Product controller additive endpoints or additive response fields.
- Focused tests or direct API verification for lifecycle and diagnostics behavior.
- Documentation/status/validation evidence.

## Non-Goals

- Do not implement channel publishing.
- Do not implement Bazos policy or compliance ownership.
- Do not implement warehouse stock calculations.
- Do not remove or reinterpret existing `isActive` public compatibility.
- Do not change frontend UX unless required for direct verification.

## Files To Inspect

- `src/products/product.entity.ts`
- `src/products/dto/index.ts`
- `src/products/products.service.ts`
- `src/products/products.controller.ts`
- `src/media/media.entity.ts`
- `src/media/media.service.ts`
- `src/pricing/product-pricing.entity.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/admin/products/**`

## Files To Create

- Goal-specific validation report under `reports/validation/` or `implementation-goals/` if source tests cannot cover all evidence.
- Optional focused product diagnostics spec if Jest configuration is repaired or a targeted test path is feasible.

## Files To Modify

- `src/products/product.entity.ts`
- `src/products/dto/index.ts`
- `src/products/products.service.ts`
- `src/products/products.controller.ts`
- Product-focused tests if added.
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `implementation-goals/GOAL-02-product-model-completeness.md`

## Files That Must Not Be Modified

- `BUSINESS.md`
- `docs/orchestrator/INTENT.md`
- `docs/governance/PROJECT_INVARIANTS.md` except by owner-approved governance change.
- Unrelated services or channel repositories.
- Frontend files unless required by product diagnostics verification.

## Implementation Steps

1. Create/switch to `feature/catalog-goal-02-product-model-completeness` after Goal 1 closure docs are committed.
2. Run pre-coding gate and record evidence.
3. Add lifecycle enum/field with safe defaults and compatibility with `isActive`.
4. Add readiness/quality issue model in product service without exposing secrets or raw request bodies.
5. Detect missing EAN, duplicate SKU/EAN, missing media, placeholder media references, inactive/archived lifecycle, missing title/description/category/price as diagnostics.
6. Expose diagnostics additively, preferring a dedicated read endpoint such as `GET /api/products/:id/readiness` and optional audit endpoints for missing EAN/duplicates.
7. Add focused tests or direct API smoke using synthetic records.
8. Run `npm run build`, `git diff --check`, and `npm test` or document the known Jest blocker if still present.
9. Update validation/status/state and commit Goal 2 changes.

## Test Plan

- Unit-test diagnostics helpers if the Jest configuration can run a targeted test without the current frontend `.next` haste collision.
- Direct API verification with synthetic data must cover: lifecycle field default/update, readiness response for missing EAN/media, duplicate audit behavior, and existing product list/detail envelope compatibility.
- Keep unauthorized mutation checks covered by Goal 1; rerun only if Goal 2 modifies mutation routes.

## Validation Plan

- `npm run build` must pass.
- `git diff --check` must pass.
- `npm test` must run or the existing Jest collision must be documented with exact output.
- Direct API verification must prove additive behavior and cleanup synthetic records.
- Status docs must name invariant evidence and any residual risk.

## Gate Commands

```bash
git status --short --branch
python3 -c "from pathlib import Path; files=[Path(p) for p in [\"docs/orchestrator/GOALS.md\",\"docs/orchestrator/PLAN.md\",\"docs/orchestrator/STATUS.md\",\"docs/IMPLEMENTATION_STATE.md\",\"implementation-goals/GOAL-02-product-model-completeness.md\",\"implementation-goals/GOAL-02-execution-plan.md\",\"reports/validation/GOAL-02-pre-coding-gate.md\"]]; markers=[chr(91)+\"MISSING:\", chr(91)+\"UNKNOWN:\"]; hits=[str(f) for f in files if any(m in f.read_text() for m in markers)]; print(\"missing_marker_hits=\" + str(hits)); raise SystemExit(1 if hits else 0)"
npm run build
npm test
git diff --check
```

## Documentation Updates

- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `implementation-goals/GOAL-02-product-model-completeness.md`
- Goal 2 validation report

## Rollback Plan

Revert Goal 2 commit or restore the listed product files and docs. If a migration/schema sync has applied in production, rollback must preserve existing rows and only remove additive optional behavior after owner review.

## Agent Handoff Prompt

Implement Goal 2 in the remote `catalog-microservice` repository only. Preserve existing public product read envelopes and `isActive` compatibility. Add lifecycle and product quality/readiness diagnostics as additive behavior, verify with build/tests or direct API evidence, update status/state/validation docs, and do not move stock, login, checkout, Bazos compliance, publishing, or media blob ownership into Catalog.

## Completion Checklist

- [ ] Implementation complete
- [ ] Tests complete
- [ ] Validation evidence collected
- [ ] Documentation updated
- [ ] Deviations documented
