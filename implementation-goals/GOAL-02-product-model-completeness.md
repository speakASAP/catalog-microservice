# Goal 02 - Catalog Product Model Completeness

Status: active - source validated, runtime pending

## Intent

Catalog records must describe goods well enough for online sale and future channels while preserving existing public read compatibility.

## Dependencies

- Goal 01 should be complete.

## Scope

- Add explicit product lifecycle fields: `draft`, `active`, `archived`, `needs_review`.
- Add product quality/readiness diagnostics.
- Add placeholder media marker and missing-media detection.
- Add missing EAN and duplicate SKU/EAN audits.

## Non-Goals

- Do not publish to any channel.
- Do not implement Bazos policy.
- Do not implement warehouse stock calculations.
- Do not break existing product read response shape without a documented migration.

## Acceptance Criteria

- Existing product reads remain backward compatible.
- A product can report why it is not sellable or publishable.
- Placeholder media and missing EAN are visible as quality issues.

## Validation

```bash
npm run build
npm test
```

Add focused tests or direct API verification for lifecycle and diagnostics behavior.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-002`, `CAT-INV-005`, `CAT-INV-008`, and `CAT-INV-009`.
