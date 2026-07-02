# GOAL-25 Execution Plan

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog remains the canonical product content truth.
- Goal Impact: canonical JSON propagates predictably while manual marketplace edits stay visible and bounded.
- System: Catalog owns canonical content, profile metadata, and readiness flags; marketplace services own accounts, compliance, drafts, publication, and live mutation.
- Feature: manual override tracking, stale source markers, protected API response metadata, and Catalog UI review cues.
- Task: add additive profile metadata, API response flags, UI markers, contract docs, and focused tests.
- Execution Plan: implement the Catalog backend/UI/docs slice first; leave channel service consumers dependency-gated.
- Coding Prompt: fail closed, preserve manual data, mark stale values, do not publish externally, do not expose secrets.
- Code: `src/marketplace-fields/*`, `services/frontend/components/MarketplaceFieldsPanel.tsx`, `services/frontend/lib/api/products.ts`, `scripts/migrations/20260702_marketplace_manual_overrides.sql`.
- Validation: `reports/validation/VAL-GOAL-25-canonical-json-propagation.md`.

## Parallel Execution

| Workstream | Status | Owner Role | Scope | Dependencies | Validation | Handoff |
|---|---|---|---|---|---|---|
| W0 Contract and orchestration | active | Catalog orchestrator | Goal docs, contract update, merge order | None | doc review, diff check | Owns final integration |
| W1 Catalog propagation model/API | active | backend worker | marketplace profile metadata, stale flags, Jest tests | W0 contract | focused marketplace-fields Jest, backend build | API shape for UI |
| W2 Catalog frontend stale markers | active | frontend worker | marketplace fields panel badges/warnings/types | W1 response shape | frontend build | UI evidence |
| W3 Channel service consumers | dependency-gated | per-channel worker | Allegro/Bazos/Aukro/FlipFlop/Heureka consumer behavior | deployed Catalog contract | channel builds/smokes | do not start until Catalog source is accepted |
| W4 Runtime validation | final integration | validation owner | migration, deploy, protected API smoke, readiness smoke | `[MISSING: deploy approval]`, `[MISSING: approved Auth token]` | runtime smoke report | final acceptance |

Shared files/contracts:

- `docs/contracts/marketplace-description-connectors.md`
- `src/marketplace-fields/*`
- `services/frontend/components/MarketplaceFieldsPanel.tsx`
- `services/frontend/lib/api/products.ts`
- `scripts/migrations/20260702_marketplace_manual_overrides.sql`

Dirty worktree boundary: existing Goal 24 files and unrelated `services/frontend/app/page.tsx` / `src/app.module.ts` are not owned by this goal.

Integration owner: Catalog orchestrator.

Validation owner: current worker session.

Merge order: W0/W1/W2 source first, then migration/deploy only after approval, then channel consumers if required.
