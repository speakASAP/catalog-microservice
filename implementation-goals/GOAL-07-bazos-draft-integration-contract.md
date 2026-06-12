# Goal 07 - Bazos Draft Integration Contract

Status: pending

## Intent

Catalog may initiate Bazos draft creation but must not bypass Bazos compliance or publishing authority.

## Dependencies

- Goal 04.

## Scope

- Define catalog-to-Bazos draft request contract.
- Add product action/readiness status for "create Bazos draft".
- Require Bazos to return policy status and human action reasons.

## Non-Goals

- Do not publish directly to Bazos.
- Do not implement Bazos identities, pacing, duplicate checks, or challenge handling in catalog.
- Do not treat readiness as publishing approval.

## Acceptance Criteria

- Catalog cannot publish directly.
- Bazos remains policy and publishing authority.
- Failure reasons are visible in catalog readiness/action responses.

## Validation

```bash
npm run build
npm test
```

Verify the contract names Bazos as final policy and publishing authority.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-005`, `CAT-INV-009`, and `CAT-INV-010`.
