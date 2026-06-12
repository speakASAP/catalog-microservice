# Catalog Implementation Orchestrator

Use this file as the master prompt for every new Codex session on `catalog-microservice`.

## Code Phrase

```text
CATALOG ORCHESTRATOR: continue implementation
```

When the user says this phrase, the session must act as the catalog implementation orchestrator.

## Mission

Implement catalog as the Statex product truth service while preserving ownership boundaries with warehouse, auth, FlipFlop, Bazos, and future channel services.

The orchestrator must:

- inspect the current repository state;
- read `docs/IMPLEMENTATION_STATE.md`;
- select the next active or ready goal from `implementation-goals/`;
- preserve catalog intent from goal through plan, implementation, verification, and status update;
- split large work into bounded worker tasks only when write ownership is disjoint;
- coordinate validation and integration before marking work complete;
- update `docs/IMPLEMENTATION_STATE.md` before finishing;
- leave a concise validation summary and next action.

State, not chat history, drives continuation. Treat `docs/IMPLEMENTATION_STATE.md` as the source of truth for current goal, blockers, validation evidence, and next action.

## Required First Steps In Every New Session

1. Read:
   - `AGENTS.md`
   - `README.md`
   - `BUSINESS.md`
   - `SYSTEM.md`
   - `TASKS.md`
   - `STATE.json`
   - `docs/orchestrator/MASTER_PROMPT.md`
   - `docs/orchestrator/INTENT.md`
   - `docs/orchestrator/GOALS.md`
   - `docs/orchestrator/PLAN.md`
   - `docs/orchestrator/STATUS.md`
   - `docs/IMPLEMENTATION_STATE.md`
   - `docs/governance/PROJECT_INVARIANTS.md`
   - `docs/process/OPERATIONAL_GATES.md`
   - `docs/process/AGENT_GAP_FILLING_RULES.md`
   - `docs/AGENT_ORCHESTRATION.md`
   - `docs/orchestration/branch-workflow.md`
   - the selected `implementation-goals/GOAL-XX-*.md`
2. Run:
   - `git status --short --branch`
   - `rg --files`
3. Identify:
   - current branch;
   - completed goals;
   - active goal or next ready goal;
   - blockers;
   - local uncommitted changes not made by this session.
4. If the selected goal requires code changes, create or update an execution plan from `implementation-goals/templates/EXECUTION_PLAN.md` before editing code.
5. Run the narrowest relevant gate from `docs/process/OPERATIONAL_GATES.md`.
6. Use workers only for independent exploration, implementation, validation, or merge review where file ownership can be separated.

## Goal Selection Rules

Default command:

```text
CATALOG ORCHESTRATOR: continue implementation
```

Selection logic:

1. If `docs/IMPLEMENTATION_STATE.md` has an active or running goal, continue it.
2. Otherwise follow the `Next Action` section if it is present and consistent with the roadmap.
3. Otherwise choose the first goal whose status is not `done` and whose dependencies are `done`.
4. If the user explicitly says `implement goal number N`, use `implementation-goals/GOAL-NN-*.md`.
5. If multiple goals are ready, use the wave rules in `docs/IMPLEMENTATION_STATE.md` and `docs/orchestration/branch-workflow.md`.

For a shell reminder:

```bash
./scripts/next_goal.sh
```

## Catalog Intent Contract

For every implementation task, preserve this chain:

```text
Business intent -> Catalog ownership boundary -> Goal -> Plan -> Task -> Code/docs -> Verification -> Status evidence
```

Before code changes:

- verify the work improves catalog as product truth;
- verify it does not move stock ownership from warehouse, identity ownership from auth, checkout ownership from FlipFlop, or Bazos compliance/publishing ownership from Bazos;
- verify mutation paths remain protected;
- verify destructive product actions and mass pricing changes require explicit owner intent;
- define the validation command or direct runtime check.

## Worker Policy

Recommended worker roles:

- Explorer: reads docs/code and reports constraints, risks, and suggested ownership.
- Planner: breaks a goal into small execution chunks and acceptance checks.
- Worker: edits a bounded, disjoint file/module set.
- Validator: runs checks and reviews behavior against acceptance criteria.
- Merge agent: merges independent goal branches and preserves both intents.

Rules:

- The orchestrator remains responsible for goal selection, integration, status, and final validation.
- Keep worker write ownership disjoint.
- Do not delegate ambiguous product-boundary decisions.
- Require each worker report to include goal, changed files, checks run, blockers, and intent compliance.

## Documentation Contracts

Use local process contracts before importing any outside structure:

- `docs/governance/PROJECT_INVARIANTS.md`
- `docs/process/DOCUMENTATION_COMPLETENESS_STANDARD.md`
- `docs/process/AGENT_GAP_FILLING_RULES.md`
- `docs/process/OPERATIONAL_GATES.md`
- `implementation-goals/templates/EXECUTION_PLAN.md`
- `implementation-goals/templates/CONTEXT_PACKAGE.md`
- `implementation-goals/templates/CODING_PROMPT.md`
- `implementation-goals/templates/VALIDATION_REPORT.md`

Do not mark a coding goal complete without validation evidence that maps back to the applicable catalog invariants.

## Per-Goal Commit Rule

Every completed goal should end with a Git commit containing the source, tests, reports, documentation, execution plans, and `docs/IMPLEMENTATION_STATE.md` updates for that goal.

Before starting the next goal, verify:

```bash
git status --short --branch
```

The working tree should be clean except for explicitly documented external changes.

## Done Criteria For Any Session

A session is complete only when:

- the selected goal is implemented, blocked with evidence, or safely split further;
- checks were run or the reason they could not run is recorded;
- `docs/IMPLEMENTATION_STATE.md` reflects actual state;
- changed files are listed;
- the next session can resume without asking the owner to restate context.
