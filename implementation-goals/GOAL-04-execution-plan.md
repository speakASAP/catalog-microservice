# EP-CATALOG-04: Channel Readiness Model

```yaml
id: EP-CATALOG-04
status: implemented-source
source_goal: implementation-goals/GOAL-04-channel-readiness-model.md
owner: orchestrator
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: source-implementation-complete
```

## Metadata

Remote implementation repository: `alfares:/home/ssf/Documents/Github/catalog-microservice`.

Target branch: `feature/catalog-goal-04-channel-readiness-model` after Goal 3 is closed or merged according to the branch workflow.

Current planning branch inspected: `feature/catalog-goal-03-pricing-integrity`.

Lifecycle state: source implementation complete. Production deployment was not requested and was not run.

## Upstream Traceability

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/MASTER_PROMPT.md`
- `docs/orchestrator/INTENT.md`
- `docs/orchestrator/GOALS.md`
- `docs/orchestrator/PLAN.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/IMPLEMENTATION_ORCHESTRATOR.md`
- `docs/governance/PROJECT_INVARIANTS.md`
- `docs/process/OPERATIONAL_GATES.md`
- `implementation-goals/README.md`
- `implementation-goals/GOAL-04-channel-readiness-model.md`

## Goal Impact

Goal 4 makes Catalog more useful as the product truth service by exposing channel-specific readiness facts for FlipFlop, Bazos draft workflows, and future channels. The model should explain why a product is not ready, what catalog field is missing, and the next safe action, without moving checkout, storefront UX, Bazos compliance, or Bazos publishing into Catalog.

## Project Invariants

- `CAT-INV-001`: Catalog owns product truth, channel eligibility, and publication readiness signals.
- `CAT-INV-004`: FlipFlop remains owner of storefront projection and checkout UX; Catalog only exposes readiness facts needed by FlipFlop.
- `CAT-INV-005`: Bazos remains owner of compliance, identities, drafts, queues, pacing, platform challenges, and publish actions. Catalog readiness must not claim publish permission.
- `CAT-INV-009`: Existing public product and pricing read response envelopes remain backward compatible. Goal 4 should add a new endpoint or additive fields only.
- `CAT-INV-010`: If any readiness-affecting mutation is introduced later, it must remain protected and audited. Goal 4's planned read endpoint is read-only.

## Sensitive-Data Handling

Data classification: non-sensitive catalog metadata and synthetic test fixtures only.

Do not print or store JWTs, runtime secrets, raw production product lists, Bazos account identifiers, phone numbers, customer identifiers, or production offer data in tests, prompts, logs, reports, or screenshots. Readiness tests should use synthetic product IDs, SKUs, EANs, prices, media URLs, and channel names.

## Contract/Schema Impact

Preferred implementation is additive and schema-neutral for the first Goal 4 slice: compute channel readiness as a typed JSON response from existing product, media, category, lifecycle, and deterministic current-pricing data.

A database entity is not required unless implementation discovers a real need for owner-maintained per-channel overrides. If an entity is introduced, it must be additive and must not replace product truth fields.

Planned response shape:

```ts
type ChannelReadinessResponse = {
  productId: string;
  sku: string;
  ready: boolean;
  channels: Array<{
    channel: "flipflop" | "bazos_draft" | string;
    ready: boolean;
    status: "ready" | "blocked" | "needs_review";
    missingFields: string[];
    issues: Array<{
      code: string;
      field?: string;
      severity: "blocking" | "warning";
      message: string;
      nextAction: string;
    }>;
    nextAction: string;
    authority: "catalog" | "flipflop" | "bazos" | string;
  }>;
};
```

Bazos readiness language must use draft-readiness terms only, such as `ready_for_bazos_draft_request`. It must not return `publishable: true`, `canPublish: true`, `queued`, `publishPermission`, or equivalent publish authority from the readiness endpoint.

## Scope

- Add an extensible channel readiness model as typed JSON.
- Add a read endpoint per product for channel readiness.
- Add FlipFlop readiness rules based on lifecycle, active state, category, description, media, and deterministic current price.
- Add Bazos draft-readiness rules based on lifecycle, active state, title/description, current price, category, media, and contact/policy prerequisites represented as missing fields or next actions, not publish permission.
- Reuse Goal 2 product readiness facts and Goal 3 deterministic pricing behavior where practical.
- Add focused unit tests for missing-field output, next-action output, extensibility, and the Bazos non-publish boundary.

## Non-Goals

- Do not implement Bazos publishing.
- Do not enqueue Bazos publish jobs.
- Do not create or verify Bazos identities.
- Do not implement FlipFlop checkout or storefront UX.
- Do not move warehouse stock ownership into Catalog.
- Do not change auth/JWT issuance or RBAC policy ownership.
- Do not change existing public read response shapes except by adding a new endpoint or additive fields.
- Do not deploy production changes in this goal without explicit owner approval.

## Files To Inspect

- `src/products/product.entity.ts`
- `src/products/products.service.ts`
- `src/products/products.controller.ts`
- `src/products/products.module.ts`
- `src/products/products.service.spec.ts`
- `src/pricing/pricing.service.ts`
- `src/pricing/pricing.module.ts`
- `src/pricing/pricing.service.spec.ts`
- `src/media/media.entity.ts`
- `src/categories/category.entity.ts`
- `src/app.module.ts`
- `docs/governance/PROJECT_INVARIANTS.md`
- `docs/process/OPERATIONAL_GATES.md`

## Files To Create

Preferred source layout:

- `src/channel-readiness/channel-readiness.types.ts`
- `src/channel-readiness/channel-readiness.service.ts`
- `src/channel-readiness/channel-readiness.controller.ts`
- `src/channel-readiness/channel-readiness.module.ts`
- `src/channel-readiness/channel-readiness.service.spec.ts`
- `reports/validation/VAL-GOAL-04-channel-readiness-model.md` after implementation validation

## Files To Modify

- `src/app.module.ts` to import the channel readiness module.
- `src/products/products.controller.ts` only if routing through the existing product controller is safer than a standalone `products/:id/channel-readiness` controller.
- `src/products/products.service.ts` only if shared product readiness helpers need to be exported or refactored without changing existing response shapes.
- `src/products/products.service.spec.ts` only if shared readiness behavior is adjusted.
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/STATUS.md`
- `docs/orchestrator/PLAN.md`
- `implementation-goals/GOAL-04-channel-readiness-model.md` only for status/checklist updates after implementation begins.

## Files That Must Not Be Modified

- `BUSINESS.md`
- `SYSTEM.md`
- `docs/orchestrator/INTENT.md`
- `docs/orchestrator/MASTER_PROMPT.md`
- `docs/governance/PROJECT_INVARIANTS.md` unless the owner approves governance changes.
- Warehouse, Auth, FlipFlop, Bazos, and other service repositories.
- Production secrets, local `.env` files, and Kubernetes secret values.

## Implementation Steps

1. Wait until Goal 3 closure is documented remotely or the owner explicitly authorizes planning-only work to advance to code despite the dependency state.
2. Switch to or create `feature/catalog-goal-04-channel-readiness-model` from the correct post-Goal-3 source branch according to `docs/orchestration/branch-workflow.md`.
3. Confirm a clean or documented working tree with `git status --short --branch` before source edits.
4. Create a channel readiness module with explicit types for channel status, issues, missing fields, next action, and authority owner.
5. Implement a per-product read endpoint, preferably `GET /api/products/:id/channel-readiness`, returning `{ success: true, data: ... }` to preserve existing envelope conventions.
6. Reuse `ProductsService.findOne` for product truth and `PricingService.getCurrentPrice` for deterministic price readiness, or introduce a small shared helper if this avoids duplicating Goal 2/Goal 3 logic.
7. Implement common catalog prerequisites once: active product, active lifecycle, description, category, media, no placeholder-only media, no duplicate SKU/EAN blocker when available, and current price.
8. Implement FlipFlop readiness as a channel rule that reports product truth gaps and points checkout/storefront work back to FlipFlop.
9. Implement Bazos draft readiness as a channel rule that reports catalog and draft-input gaps, with `authority: "bazos"` for policy/publish decisions and no publish-permission fields.
10. Add focused tests covering missing fields and next actions for an incomplete product, a ready FlipFlop product, a Bazos draft-ready product that still defers policy to Bazos, and extensibility for adding another channel rule.
11. Run validation: `npm test`, `npm run build`, and `git diff --check`.
12. Record validation evidence in `reports/validation/VAL-GOAL-04-channel-readiness-model.md`, `docs/orchestrator/STATUS.md`, and `docs/IMPLEMENTATION_STATE.md`.

## Existing Boundary Risk To Handle Carefully

The repository currently contains `POST /api/products/:id/sell-on-bazos` in `src/products/products.controller.ts` and `ProductsService.sellOnBazos` in `src/products/products.service.ts`. That flow calls Bazos account, identity, offer, and enqueue-publish endpoints and uses publish-oriented wording. Goal 4 must not expand this flow. The readiness implementation should be read-only and should not call Bazos. Any correction, deprecation, or migration of the existing Bazos action path should be treated as a separately scoped boundary fix or Goal 7 work unless the owner explicitly folds it into Goal 4.

## Test Plan

- Unit-test incomplete product readiness returns `ready: false`, channel-specific `missingFields`, and actionable `nextAction` values.
- Unit-test FlipFlop readiness requires current price, media, category, description, active lifecycle, and active product state.
- Unit-test Bazos draft readiness never returns publish permission and uses `authority: "bazos"` for policy or publish decisions.
- Unit-test response extensibility by adding or stubbing a future channel rule without changing the response contract.
- Keep tests synthetic and avoid production identifiers or Bazos personal data.

## Validation Plan

Required before implementation closure:

```bash
npm test
npm run build
git diff --check
```

Manual/API validation after source changes should verify readiness output for at least one synthetic product missing required fields. Production runtime verification requires explicit owner approval and is not part of this planning-only session.

## Gate Commands

Pre-coding planning gate for this artifact:

```bash
git status --short --branch
python3 -c "from pathlib import Path; files=[Path(p) for p in ['docs/orchestrator/GOALS.md','docs/orchestrator/PLAN.md','docs/orchestrator/STATUS.md','docs/IMPLEMENTATION_STATE.md','implementation-goals/GOAL-04-channel-readiness-model.md','implementation-goals/GOAL-04-execution-plan.md']]; markers=[chr(91)+'MISSING:', chr(91)+'UNKNOWN:']; hits=[str(f) for f in files if f.exists() and any(m in f.read_text() for m in markers)]; print('missing_marker_hits=' + str(hits)); raise SystemExit(1 if hits else 0)"
git diff --check
```

This gate blocks coding while `docs/IMPLEMENTATION_STATE.md` documents Goal 3 as source-complete but not deployed/closed.

## Documentation Updates

- Create `implementation-goals/GOAL-04-execution-plan.md`.
- Create `reports/validation/GOAL-04-pre-coding-gate.md`.
- Update `docs/orchestrator/PLAN.md` with the Goal 4 planning checkpoint.
- Update `docs/orchestrator/STATUS.md` with planning-only evidence.
- Update `docs/IMPLEMENTATION_STATE.md` with the Goal 4 blocked-planning entry.

## Rollback Plan

Before coding, rollback is documentation-only: revert `implementation-goals/GOAL-04-execution-plan.md`, `reports/validation/GOAL-04-pre-coding-gate.md`, and the planning entries in state/status/plan docs.

After future source implementation, revert the Goal 4 implementation commit. Because the preferred model is schema-neutral, no database rollback should be needed unless the future implementation introduces a persisted readiness entity.

## Agent Handoff Prompt

Implement Goal 4 in the remote `catalog-microservice` repository only after Goal 3 closure is documented remotely. Add a read-only, extensible per-product channel readiness endpoint that reports missing fields and next actions for FlipFlop and Bazos draft workflows. Reuse product lifecycle/readiness and deterministic current-pricing behavior. Do not call Bazos, do not enqueue publishing, do not implement FlipFlop checkout/storefront UX, do not move stock/auth ownership into Catalog, and do not deploy anything without owner approval.

## Completion Checklist

- [x] Planning artifact created
- [x] Source files inspected for implementation shape
- [x] Pre-coding gate run and recorded
- [x] Coding unblocked after Goal 3 closure was documented remotely
- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated after implementation
- [ ] Deviations documented
