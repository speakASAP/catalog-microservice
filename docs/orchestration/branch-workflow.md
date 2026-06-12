# Catalog Branch And Worktree Workflow

## Purpose

This workflow lets the orchestrator run sequential and parallel catalog goals while preserving traceability, avoiding file conflicts, and keeping `docs/IMPLEMENTATION_STATE.md` authoritative.

## Branch Naming

Use these branch names by default:

```text
main
feature/catalog-goal-01-contract-auth-boundary
feature/catalog-goal-02-product-model-completeness
feature/catalog-goal-03-pricing-integrity
feature/catalog-goal-04-channel-readiness-model
feature/catalog-goal-05-catalog-warehouse-contract
feature/catalog-goal-06-flipflop-catalog-projection
feature/catalog-goal-07-bazos-draft-integration-contract
feature/catalog-goal-08-data-import-reconciliation
feature/catalog-goal-09-end-to-end-smoke-tests
integration/catalog-merge-goals
```

## Sequential Goals

Run Goal 01 sequentially because it protects shared mutation behavior. Goals 02 and 03 may start after Goal 01, but sequential remains the safe default.

Recommended pattern:

```bash
git switch -c feature/catalog-goal-01-contract-auth-boundary
# implement the goal
# run validation from the goal file
git status --short --branch
git add <goal files>
git commit -m "Implement catalog goal 01 contract auth boundary"
git status --short --branch
git switch main
git merge --no-ff feature/catalog-goal-01-contract-auth-boundary
```

Before switching goals:

```bash
./scripts/next_goal.sh
git status --short --branch
```

## Commit Boundary

A goal is not complete until:

- acceptance criteria are met or blocker evidence is recorded;
- validation evidence is recorded;
- `docs/IMPLEMENTATION_STATE.md` is updated;
- all goal source, tests, reports, and documentation changes are committed;
- `git status --short --branch` confirms a clean working tree or known external changes are documented.

## Parallel Goals

Parallel work is allowed only when:

- goals are dependency-ready;
- write ownership is disjoint;
- workers use separate branches or worktrees;
- merge happens through `integration/catalog-merge-goals`.

Potential parallelization after Goal 01:

- Goal 02 product model work and Goal 03 pricing integrity work may proceed separately if entity/service files do not overlap.
- Goal 05 warehouse contract documentation can proceed while Goal 04 readiness model is planned, but code integration should wait for stable product readiness contracts.

## Merge Protocol

When independent branches must be merged:

1. Create or switch to `integration/catalog-merge-goals` from `main`.
2. Merge one feature branch at a time.
3. Resolve conflicts by preserving both approved goal intents.
4. Run validation commands from every merged goal.
5. Update `docs/IMPLEMENTATION_STATE.md`.
6. Merge the integration branch back to `main` only after validation passes or failures are documented.

## Production Deployment

Do not deploy production changes without explicit owner approval. Deployment evidence must name the command, commit or image, health result, and any smoke tests.
