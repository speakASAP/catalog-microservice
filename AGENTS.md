# Agents: catalog-microservice

Catalog is a data service, but AI/Codex sessions must follow the catalog implementation orchestrator before planning or implementing work.

## One-Command Continuation

When the user says:

```text
CATALOG ORCHESTRATOR: continue implementation
```

or:

```text
Continue implementation of this project.
```

act as the catalog implementation orchestrator.

Do not ask the user which goal is next. Determine the next action from:

```text
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
implementation-goals/README.md
docs/orchestrator/GOALS.md
docs/orchestrator/PLAN.md
docs/orchestrator/STATUS.md
```

Then continue from the latest checkpoint.

## Mandatory Reading Order

Before implementation, branch orchestration, or launching workers, read:

1. `BUSINESS.md`
2. `SYSTEM.md`
3. `README.md`
4. `TASKS.md`
5. `STATE.json`
6. `docs/orchestrator/MASTER_PROMPT.md`
7. `docs/orchestrator/INTENT.md`
8. `docs/orchestrator/GOALS.md`
9. `docs/orchestrator/PLAN.md`
10. `docs/orchestrator/STATUS.md`
11. `docs/IMPLEMENTATION_STATE.md`
12. `docs/IMPLEMENTATION_ORCHESTRATOR.md`
13. `docs/governance/PROJECT_INVARIANTS.md`
14. `docs/process/OPERATIONAL_GATES.md`
15. `docs/process/AGENT_GAP_FILLING_RULES.md`
16. `docs/AGENT_ORCHESTRATION.md`
17. `docs/orchestration/branch-workflow.md`
18. `implementation-goals/README.md`

For a specific goal, also read the matching file in `implementation-goals/`.

## Core Intent

```text
Catalog is the Statex product truth service.
It owns product identity, sellable content, categories, attributes, media references, pricing records, channel eligibility, and publication readiness.
It must serve FlipFlop e-commerce, Bazos draft workflows, current marketplace consumers, and future channels without letting any channel redefine product truth.
Warehouse owns stock quantities, reservations, movements, and warehouse locations.
Auth owns login, JWT, RBAC, and service identity.
FlipFlop owns storefront projection and checkout UX.
Bazos owns Bazos compliance, identities, drafts, publishing queues, pacing, duplicate checks, platform challenges, and publish actions.
Catalog must never publish directly to Bazos.
Catalog must never delete product records without explicit owner approval.
Mass pricing changes over 10 products require human review.
Media must be external URLs or object references, never inline file blobs.
```

## Orchestrator Duties

1. Read `docs/IMPLEMENTATION_STATE.md`.
2. Identify the active goal, next ready goal, or blocked checkpoint.
3. Run only the next valid goal according to `implementation-goals/README.md`.
4. Use isolated branches or worktrees for parallel goals.
5. Keep write ownership disjoint when using workers or subagents.
6. Update `docs/IMPLEMENTATION_STATE.md` after every implementation session.
7. Update `docs/orchestrator/STATUS.md` when goal evidence changes.
8. Require an Intent Compliance Report before marking a goal complete.
9. Run or document validation before moving to the next goal.
10. For coding work, create or update an execution plan from `implementation-goals/templates/EXECUTION_PLAN.md` before editing code.
11. Run the narrowest relevant gate from `docs/process/OPERATIONAL_GATES.md`.
12. After each goal is complete, commit goal changes and verify the working tree before starting the next goal when practical.

## Branch Rules

Use the branch and worktree workflow in:

```text
docs/orchestration/branch-workflow.md
```

Sequential goals may run on one goal branch merged back immediately after validation.

Parallel goals must use separate branches or worktrees. Merge parallel work through:

```text
integration/catalog-merge-goals
```

## User Checkpoints

The user should only need to review:

```text
goal completion reports
running app URLs or screenshots when available
validation summaries
merge conflict decisions if any
MVP boundary or ownership deviations
production deployment approval
```

Ask the user only when a decision cannot be safely inferred from the docs and current repository state.

## Active Agents

<!-- Coordinator-maintained -->
None.

## Company Cross-Agent Standard

This repository also follows `AGENT_OPERATIONS.md`, which points all AI agents to the company cross-agent automation model: readiness scanner, bounded worker agent, worker monitor, and integration validator. Use the validation-debt ledger for known out-of-scope validation failures and preserve the Intent Preservation chain.

## Central Instruction Source

Shared agent rules now live in `/home/ssf/.codex/AGENTS.md` and `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`. Keep this file for repository-specific constraints only; do not duplicate shared operating rules here.
