# 2026-07-02 Canonical JSON Propagation Plan

```yaml
id: CATALOG-GOAL-25-CANONICAL-JSON-PROPAGATION-PLAN
status: source-implementation
owner_role: catalog integration owner
repository: /home/ssf/Documents/Github/catalog-microservice
deployment: not requested
database_mutation: not run
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Catalog canonical JSON remains product truth.
- Goal Impact: marketplace listings can be regenerated safely while human edits are preserved and flagged when source content changes.
- System: Catalog tracks propagation metadata; marketplace services own external mutation.
- Feature: manual override tracking, stale source markers, readiness-required flags, UI badges.
- Task: additive Catalog source implementation and docs.
- Execution Plan: `implementation-goals/GOAL-25-execution-plan.md`.
- Coding Prompt: no external publish, no secret exposure, no destructive cleanup, no Goal 24 edits.
- Code: bounded to marketplace fields, frontend marketplace panel/types, migration, docs.
- Validation: `reports/validation/VAL-GOAL-25-canonical-json-propagation.md`.

## Parallel Execution

| Workstream | Status | Owner Role | Scope | Dependencies | Validation | Handoff |
|---|---|---|---|---|---|---|
| W0 Contract and orchestration | active | Catalog orchestrator | Goal docs and connector contract | None | diff check | Final integration owner |
| W1 Backend profile tracking | active | backend worker | profile entity/service/migration/tests | W0 | focused Jest, backend build | response shape |
| W2 Frontend markers | active | frontend worker | UI badges/warnings/types | W1 response shape | frontend build | visual review state |
| W3 Channel consumers | dependency-gated | channel workers | platform-specific consumer behavior | accepted Catalog contract | channel tests | one repo per worker |
| W4 Runtime validation | final integration | validation owner | migration/deploy/protected smoke | `[MISSING: deploy approval]`, `[MISSING: approved Auth token]` | runtime report | acceptance |

## Blockers

- `[MISSING: owner approval to apply additive migration]`
- `[MISSING: owner approval to deploy Catalog]`
- `[MISSING: approved Auth token for protected API smoke]`
- `[MISSING: channel consumer implementation decision after Catalog source review]`

## Boundary

No channel draft, publish, queue, confirmation, Warehouse mutation, Orders mutation, or external marketplace mutation belongs to this source implementation.
