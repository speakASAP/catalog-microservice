# GOAL-19 Pre-Coding Gate

```yaml
id: GOAL-19-PRE-CODING-GATE
status: passed_with_documented_gaps
target: implementation-goals/GOAL-19-canonical-content-connectors.md
owner: catalog orchestrator
created: 2026-06-30
```

## Summary

Goal 19 is owner-approved and aligned to Catalog's product-truth intent. Coding may proceed after this report because the execution plan defines scope, ownership boundaries, schema impact, validation commands, rollback notes, and parallel workstreams.

## Required Script Evidence

- `scripts/pre_coding_gate.py`: `[MISSING: scripts/pre_coding_gate.py]`
- `scripts/strict_doc_audit.py`: `[MISSING: scripts/strict_doc_audit.py]`

Manual gate used `docs/process/OPERATIONAL_GATES.md` and `docs/governance/PROJECT_INVARIANTS.md`.

## Upstream Goal

- BUSINESS.md: single source of truth for product descriptions across sales channels.
- docs/orchestrator/INTENT.md: channel integrations are adapters, not owners.
- implementation-goals/GOAL-18-marketplace-field-profiles.md: profile overrides/source data already exist.

## Criteria Checked

| Criterion | Result | Evidence |
|---|---|---|
| Owner-approved goal exists | Pass | 2026-06-30 owner request explicitly authorized goal-level implementation. |
| Execution plan exists | Pass | `implementation-goals/GOAL-19-execution-plan.md` |
| Schema impact documented | Pass | Additive nullable `products.description_rich jsonb`. |
| Protected ownership boundaries documented | Pass | CAT-INV-001/002/003/004/005/008/009/010 listed in plan. |
| Parallel file ownership documented | Pass | Goal and execution plan include workstream table and merge order. |
| Validation plan documented | Pass | Focused backend, full backend, frontend typecheck/build, diff check. |
| Sensitive-data handling documented | Pass | Synthetic tests/docs only; no secrets/raw production payloads. |

## Invariant Evidence

- CAT-INV-001: canonical content remains in Catalog.
- CAT-INV-004: FlipFlop UX remains in FlipFlop; Catalog emits preview/projection data only.
- CAT-INV-005: Bazos compliance/publishing remains in Bazos; Catalog emits draft content only.
- CAT-INV-009: existing `description` remains backward-compatible.
- CAT-INV-010: product mutation endpoints remain protected.

## Recommendation

Proceed with implementation.
