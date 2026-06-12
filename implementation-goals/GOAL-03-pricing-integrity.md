# Goal 03 - Pricing Integrity

Status: done

## Intent

Catalog pricing must be reliable, deterministic, and safe for downstream consumers.

## Dependencies

- Goal 01 should be complete.

## Scope

- Normalize current price selection.
- Add pricing validation for currency, positive amount, sale price rules, and validity windows.
- Add mass price change guard.
- Add price audit trail fields or events.

## Non-Goals

- Do not implement checkout.
- Do not implement payment behavior.
- Do not bypass human review for mass updates over 10 products.

## Acceptance Criteria

- Current price endpoint returns deterministic regular/sale priority.
- Invalid pricing is rejected.
- Mass updates over 10 products require an explicit human-review marker.

## Validation

```bash
npm run build
npm test
```

Add pricing unit tests or direct API verification for invalid pricing, current price priority, and mass-update guard.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-007`, `CAT-INV-009`, and `CAT-INV-010`.
