# Catalog Operational Gates

```yaml
id: CATALOG-OPERATIONAL-GATES
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - docs/governance/PROJECT_INVARIANTS.md
  - docs/IMPLEMENTATION_ORCHESTRATOR.md
downstream:
  - implementation-goals/README.md
related_adrs: []
```

## Purpose

Operational gates make catalog implementation executable. They define what must be checked before coding, integration, deployment, or goal closure.

## Gate Types

| Gate | Timing | Blocks on |
|---|---|---|
| Pre-coding gate | Before converting a goal/chunk/execution plan into code. | Missing execution plan, missing acceptance criteria, unclear ownership boundary, missing validation plan, unresolved `[MISSING: ...]` marker. |
| Integration-readiness gate | Before merging independent goal branches or worker outputs. | Conflicting file ownership, missing validation evidence, incompatible API contracts, unresolved boundary deviation. |
| Deployment-readiness gate | Before deploying production changes or marking a wave complete. | Failed build/tests, missing status evidence, protected intent change without owner approval, unresolved destructive-action or pricing safety risk. |

## Required Evidence

Each gate report must include:

- command or review performed;
- repository root;
- target artifact;
- status;
- missing files or sections;
- failed checks;
- invariant evidence;
- sensitive-data result;
- next action.

Reports belong under `reports/validation/` when they are large or goal-specific. Short evidence can be summarized in `docs/IMPLEMENTATION_STATE.md`.

## Local Gate Commands

Catalog currently uses these minimum checks:

```bash
npm run build
npm test
git diff --check
```

Use only the checks relevant to the selected goal and document any check that cannot run.

## Manual Gate Checklist

Before coding:

- selected goal has a goal file;
- execution plan exists for code changes;
- applicable invariants are named;
- write ownership is bounded;
- validation is defined.

Before goal closure:

- acceptance criteria are satisfied or blocked with evidence;
- `docs/orchestrator/STATUS.md` or `docs/IMPLEMENTATION_STATE.md` records evidence;
- changed protected behavior has tests or direct API verification;
- next action is clear.

## Failure Policy

A failed gate blocks the next delivery phase. Fix the artifact, split the task, or document a human-approved exception.
