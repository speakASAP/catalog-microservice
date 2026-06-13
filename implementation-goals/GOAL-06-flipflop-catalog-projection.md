# Goal 06 - FlipFlop Catalog Projection

Status: active planning complete

## Intent

FlipFlop should consume catalog product truth and show real sellable products, while FlipFlop-specific implementation remains in FlipFlop.

## Dependencies

- Goal 02.
- Goal 03.
- Goal 05.

## Scope

- Define the catalog response fields FlipFlop requires.
- Verify price mapping from catalog.
- Verify availability mapping through warehouse contract.
- Add production smoke check expectation.

## Non-Goals

- Do not implement FlipFlop checkout in catalog.
- Do not move storefront UX ownership into catalog.
- Do not make catalog own warehouse stock.

## Acceptance Criteria

- Catalog provides required product data.
- Projection contract is documented in catalog.
- FlipFlop-specific work remains in FlipFlop.

## Validation

```bash
npm run build
npm test
```

Add contract docs and smoke evidence for catalog response fields consumed by FlipFlop.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-002`, `CAT-INV-004`, and `CAT-INV-009`.


## Planning Evidence

- Created `implementation-goals/GOAL-06-execution-plan.md`.
- Created `reports/validation/GOAL-06-pre-coding-gate.md`.
- Inspected Catalog product, pricing, channel-readiness, and Warehouse availability contracts.
- Inspected FlipFlop Catalog/Warehouse client usage and frontend product shape.
- Planned source work is additive and preserves existing product read compatibility.
