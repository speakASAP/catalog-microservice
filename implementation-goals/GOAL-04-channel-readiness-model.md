# Goal 04 - Channel Readiness Model

Status: pending

## Intent

Catalog should say whether a product is ready for FlipFlop, Bazos drafts, and future channels without taking over those services.

## Dependencies

- Goal 02.
- Goal 03.

## Scope

- Add channel eligibility/readiness entity or JSON model.
- Add readiness endpoint per product.
- Add FlipFlop readiness rules.
- Add Bazos draft-readiness rules that defer publishing policy to Bazos.

## Non-Goals

- Do not implement Bazos publishing.
- Do not implement FlipFlop checkout.
- Do not make catalog responsible for channel policy enforcement beyond readiness signals.

## Acceptance Criteria

- Readiness response includes missing fields and next action.
- Bazos readiness never claims publish permission.
- Model is extensible to more channels.

## Validation

```bash
npm run build
npm test
```

Verify readiness output for at least one product missing required fields.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-004`, `CAT-INV-005`, and `CAT-INV-009`.
