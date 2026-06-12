# Catalog Documentation Completeness Standard

## Purpose

This standard defines minimum completeness for orchestrator artifacts, goal files, execution plans, prompts, and validation reports.

## Required Metadata

Structured artifacts should include:

- ID or title;
- status;
- owner;
- created date;
- last updated date;
- upstream sources;
- downstream consumers when relevant.

## Required Sections By Artifact

Goal files must include:

- intent;
- status;
- dependencies;
- scope;
- non-goals;
- chunks;
- acceptance criteria;
- validation;
- boundary checks.

Execution plans must include:

- upstream traceability;
- goal impact;
- applicable invariants;
- sensitive-data handling;
- scope and non-goals;
- files to inspect/create/modify;
- implementation steps;
- test and validation plan;
- rollback plan.

Validation reports must include:

- artifact validated;
- validation scope;
- evidence;
- invariant evidence;
- passed criteria;
- failed criteria;
- deviations;
- recommendation.

## Marker Policy

Use explicit markers when a required detail cannot be inferred:

```text
[MISSING: describe the missing required information]
[UNKNOWN: describe information that exists outside current repository evidence]
```

Execution-critical `[MISSING: ...]` markers block coding until resolved.
