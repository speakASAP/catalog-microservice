# EP-CATALOG-14: Authorized Runtime Contract Smoke

```yaml
id: EP-CATALOG-14
status: done
source_goal: implementation-goals/GOAL-14-authorized-runtime-contract-smoke.md
owner: orchestrator
created: 2026-06-13
last_updated: 2026-09-04
completeness_level: complete
branch: feature/catalog-goal-14-authorized-runtime-contract-smoke
```

## Goal Impact

Goal 14 closes the validation gap left by anonymous-only smoke checks. It proves protected contracts can be exercised when approved credentials are intentionally supplied, while keeping default production smoke safe.

## Project Invariants

- `CAT-INV-001`: validates Catalog product-truth contract surfaces.
- `CAT-INV-003`: Catalog verifies credentials but does not issue or own identity.
- `CAT-INV-005`: Bazos remains policy and publishing authority; authorized Bazos check is separately gated.
- `CAT-INV-009`: existing public read smoke remains unchanged.
- `CAT-INV-010`: protected runtime contracts require actor/source traceability.

## Sensitive-Data Handling

Tokens are accepted only through runtime environment variables and are never printed. Validation reports record pass/skip/fail counts, status codes, selected product ID, and contract names only.

## Contract/Schema Impact

No API or database schema changes. Adds one npm alias:

```bash
npm run smoke:e2e:authorized
```

## Implementation Steps

1. Extend `scripts/catalog-smoke.js` with opt-in authorized runtime checks.
3. Add authorized Warehouse and FlipFlop checks when `CATALOG_SMOKE_AUTHORIZED=true`.
4. Add separately gated Bazos authorized check requiring `CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED=true`, identity, and category inputs.
5. Add Goal 14 docs, validation report, and state updates.

## Validation Plan

- Run default smoke to prove safe anonymous behavior remains intact.
- Run authorized alias without a token to prove checks skip safely.
- Run Jest, build, and diff checks.
- Do not run token-backed production checks without approved credentials in the shell environment.

## Rollback Plan

Revert the Goal 14 commit. No schema or production data rollback is required.
