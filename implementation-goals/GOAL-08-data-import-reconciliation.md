# Goal 08 - Data Import And Reconciliation

Status: done

Completion: Implemented in commit `d5e82dc` and deployed through main merge commit `89e9f24`. The delivered surface is protected `POST /api/imports/reconciliation/dry-run`, with non-destructive create/update/skip reporting, exact missing-field diagnostics, duplicate identity detection, inline media rejection, pricing validation, and mass-pricing human-review indication.

## Intent

Catalog must move beyond seeded demo records and stay reconciled without destructive import behavior.

## Dependencies

- Goal 02.
- Goal 03.

## Scope

- Add idempotent import plan for SKU, EAN, category, pricing, and media.
- Add duplicate and missing-data reports.
- Add reconciliation status output.

## Non-Goals

- Do not run destructive import action without explicit owner approval.
- Do not store inline media blobs.
- Do not bypass pricing mass-change review.

## Acceptance Criteria

- Imports can be dry-run.
- Reports name SKU/product IDs and exact missing fields.
- No destructive import action runs without explicit owner approval.

## Validation

```bash
npm run build
npm test
```

Add dry-run evidence and report output samples without secrets or raw production data.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-006`, `CAT-INV-007`, `CAT-INV-008`, and `CAT-INV-010`.
