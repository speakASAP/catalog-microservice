# Catalog Implementation Goals

This directory contains executable goal prompts for separate Codex sessions.

Use the master command from `../docs/IMPLEMENTATION_ORCHESTRATOR.md`:

```text
CATALOG ORCHESTRATOR: continue implementation
```

To start a specific goal:

```text
CATALOG ORCHESTRATOR: implement goal number 1
```

To print the current resume checkpoint:

```bash
./scripts/next_goal.sh
```

## Goals

1. `GOAL-01-contract-auth-boundary.md` - protect catalog writes, hard deletes, and write audit context.
2. `GOAL-02-product-model-completeness.md` - lifecycle, readiness diagnostics, placeholder media, EAN/SKU audits.
3. `GOAL-03-pricing-integrity.md` - deterministic current price, validation, mass-change guard, audit trail.
4. `GOAL-04-channel-readiness-model.md` - extensible readiness without channel ownership drift.
5. `GOAL-05-catalog-warehouse-contract.md` - product identity and stock projection contract without stock ownership.
6. `GOAL-06-flipflop-catalog-projection.md` - catalog fields and mappings FlipFlop consumes.
7. `GOAL-07-bazos-draft-integration-contract.md` - draft request/readiness contract without publishing ownership.
8. `GOAL-08-data-import-reconciliation.md` - idempotent imports, dry-run, duplicate/missing-data reports.
9. `GOAL-09-end-to-end-smoke-tests.md` - health, reads, pricing, media, protected mutation rejection.
10. `GOAL-10-stock-origin-visibility.md` - stock origin visibility projection from Warehouse through Catalog and FlipFlop.

## Parallelization

Safe default:

```text
01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08 -> 09
```

After Goal 01, Goal 02 and Goal 03 may be planned in parallel only if write ownership is disjoint. Merge through `integration/catalog-merge-goals`.

## Source Documents

Every implementation session must read:

```text
AGENTS.md
README.md
BUSINESS.md
SYSTEM.md
TASKS.md
STATE.json
docs/orchestrator/MASTER_PROMPT.md
docs/orchestrator/INTENT.md
docs/orchestrator/GOALS.md
docs/orchestrator/PLAN.md
docs/orchestrator/STATUS.md
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
docs/governance/PROJECT_INVARIANTS.md
docs/process/OPERATIONAL_GATES.md
docs/process/AGENT_GAP_FILLING_RULES.md
docs/orchestration/branch-workflow.md
```

## Required Workflow For Every Goal

1. Read source documents and the selected goal file.
2. Run `git status --short --branch` before editing.
3. Create or update an execution plan before coding.
4. Keep implementation within selected goal scope.
5. Split work into workers only when ownership is disjoint.
6. Run the narrowest relevant validation and gates.
7. Produce an Intent Compliance Report.
8. Update `docs/IMPLEMENTATION_STATE.md` and `docs/orchestrator/STATUS.md` when status changes.
9. Commit all goal changes after validation and state updates when practical.
10. Verify `git status --short --branch` before starting the next goal.

## Required Final Report Shape

```markdown
## Intent Compliance Report

### Goal

### Implemented

### Not Implemented

### Boundary Check

### Workers Used

### Validation Evidence

### Risks

### Files Changed

### Next Action
```

## Global Non-Goals

Do not implement:

```text
warehouse stock ownership in catalog
auth identity ownership in catalog
FlipFlop checkout or storefront UX in catalog
Bazos publishing or compliance ownership in catalog
hard delete without explicit owner approval
mass pricing changes without human review
inline media blob storage in catalog records
production deployment without owner approval
```

11. `GOAL-11-logistics-route-projection.md` - Warehouse-owned logistics route projection forwarding.
12. `GOAL-12-warehouse-stock-coverage-read-model.md` - Catalog coverage diagnostics for mandatory Warehouse-backed stock and routes.
13. `GOAL-13-warehouse-stock-coverage-audit.md` - Paginated Catalog audit for goods missing Warehouse-backed stock coverage.
