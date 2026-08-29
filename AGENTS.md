# Repository Agent Instructions

Shared rules live here:

- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# Agents: catalog-microservice

Catalog is a data service, but AI/Codex sessions must follow the catalog implementation orchestrator before planning or implementing work.

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

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

## Runtime Context

- Remote server alias: `alfares`.
- Remote repository: `/home/ssf/Documents/Github/catalog-microservice`.
- Production URL: `https://catalog.alfares.cz`.
- API base: `https://catalog.alfares.cz/api`.
- Internal API base: `http://catalog-microservice:3200/api`.
- Health check: `GET https://catalog.alfares.cz/health`.
- Kubernetes namespace: `statex-apps`.
- Service port: `3200`.
- Deployment command, only after deployment-readiness approval and explicit owner intent:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && ./scripts/deploy.sh'
```

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

## Intent Preservation System (MANDATORY)

Catalog follows the company Intent Preservation System. When working from the local Codex environment, the standard source is `/Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system`; on `alfares`, use `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md` and repository-local IPS/process documents.

Preserve this chain for every non-trivial change:

```text
Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update
```

Coding must not start until:

1. The selected task or goal traces back to Catalog intent, goal impact, and system ownership boundaries.
2. An execution plan exists or is explicitly created for the selected goal.
3. Validation commands, rollback notes, sensitive-data classification, contract/schema impact, replay/determinism impact, and parallel file ownership are documented.
4. Any missing upstream fact is recorded as `[MISSING: ...]` or `[UNKNOWN: ...]` instead of guessed.
5. The narrowest relevant operational gate from `docs/process/OPERATIONAL_GATES.md` has been selected.

Required pre-coding checks, when scripts exist for the current branch:

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
```

If a required script is missing, record `[MISSING: script path]` in the execution plan or final report and use the nearest documented gate from `docs/process/OPERATIONAL_GATES.md`.

## Agent Permissions And Safety

Agents may:

- Read repository files and repo-local planning/status documents.
- Update implementation plans, goal status, validation evidence, and bounded source files allowed by the selected goal.
- Run build, lint, unit, static contract, and smoke commands listed below when they do not expose secrets or mutate production data.
- Run read-only Kubernetes commands such as `kubectl get`, `kubectl describe`, and sanitized `kubectl logs` when runtime evidence is required.
- Use worker agents for independent workstreams only when file ownership and merge order are explicit.

Agents must not:

- Copy the remote repository into `/Users/Sergej.Stasok/Documents` or treat a local checkout as authoritative.
- Modify protected intent, business, invariant, schema, migration, Kubernetes, deployment, or secret-related files unless the selected execution plan explicitly allows it.
- Print secrets, tokens, raw production data, customer identifiers, live private logs, or unmasked production screenshots.
- Delete catalog products, run destructive data fixes, or mass-change more than 10 product prices without explicit owner approval.
- Move stock, reservations, checkout, login, Bazos compliance, or publishing ownership into Catalog.
- Deploy without explicit owner intent and deployment-readiness evidence.

## Validation And Deployment Gates

Use the narrowest relevant checks for the current change. Common Catalog gates are:

```bash
git diff --check
npm run build
npm test -- --runInBand
npm run check:aos-auth-contract
npm run smoke:e2e
CATALOG_SMOKE_AUTHORIZED=true npm run smoke:e2e:authorized
npm run monitor:contracts
curl -sk https://catalog.alfares.cz/health
```

Run deployment only after goal scope, validation evidence, dirty-worktree review, and explicit production deployment approval are documented:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && ./scripts/deploy.sh'
```

After deployment, record rollout evidence and at least the production health check. Use authorized smoke tests only with approved non-secret runtime credentials.

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

## Parallel Execution

Every substantial plan must include a parallel execution section. Mark each workstream as `ready now`, `dependency-gated`, `blocked`, or `final integration`.

Each workstream must declare objective, scope, allowed files, forbidden files, expected output, owner role, dependencies, blockers, validation evidence, and handoff notes. The plan must also name shared files/contracts, integration owner, validation owner, and merge order.

Do not parallelize edits to the same file, schema, migration, public contract, generated index, deployment file, or status document unless the plan assigns one integration owner and conflict-resolution order.

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

## Required Final Report

Every agent final report must include:

- Role performed.
- Files changed and documents created.
- Intent chain preserved or remaining `[MISSING: ...]` / `[UNKNOWN: ...]` markers.
- Validation commands and results.
- Validation debt used or added.
- Dirty worktree caveats and active blockers.
- Deviations from scope or owner approval requirements.
- Deployment status only if deployment was explicitly approved and run.
- Final line beginning `Next step:`.

## Active Agents

<!-- Coordinator-maintained -->
None.
