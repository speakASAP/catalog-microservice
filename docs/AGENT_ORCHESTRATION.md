# Catalog Agent Orchestration

## Purpose

This document defines how the master orchestrator coordinates work on `catalog-microservice`.

## Master Agent

The master agent owns:

- reading repository state and current orchestrator status;
- selecting the next valid goal;
- splitting the goal into execution chunks;
- assigning bounded worker scopes when useful;
- integrating worker output;
- running or coordinating validation;
- updating `docs/IMPLEMENTATION_STATE.md`;
- preserving catalog ownership boundaries.

The master agent does not hand product-boundary decisions to workers.

## Worker Types

| Worker | Use | Output |
|---|---|---|
| Explorer | Repository inspection, dependency tracing, risk review. | Findings, files inspected, risks, suggested write ownership. |
| Planner | Goal decomposition and acceptance criteria mapping. | Execution plan changes and task split. |
| Implementer | Bounded code or doc edits. | Changed files, implementation summary, tests/checks run. |
| Validator | Test execution and review against goal acceptance criteria. | Validation evidence, failed criteria, residual risks. |
| Merge Agent | Integration of independent branches or worker outputs. | Merge summary, conflict decisions, combined validation. |

## Coordination Rules

- Use one master orchestrator per session.
- Workers may run in parallel only when write ownership is disjoint.
- Code workers must use the selected goal file and execution plan as scope.
- Validation workers must verify behavior against acceptance criteria, not only run commands.
- Every worker result must be compressed into `docs/IMPLEMENTATION_STATE.md` when it affects continuation.

## Required Worker Report

```text
Goal:
Scope:
Files inspected:
Files changed:
Intent boundary check:
Validation:
Blockers:
Risks:
Next recommended action:
```

## Catalog Boundary Checks

Every worker must confirm that their changes do not:

- make catalog own warehouse stock quantities, reservations, movements, or locations;
- make catalog own login, JWT issuance, RBAC policy, or service identity;
- make catalog own FlipFlop checkout or storefront UX;
- make catalog publish directly to Bazos or own Bazos compliance;
- bypass hard-delete approval or mass-pricing human review;
- put media blobs inline instead of using external object references.
