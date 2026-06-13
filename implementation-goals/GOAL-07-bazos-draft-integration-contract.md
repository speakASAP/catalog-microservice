# Goal 07 - Bazos Draft Integration Contract

Status: source implemented validation passed

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


## Source Implementation Evidence

- Added protected `POST /api/products/:id/bazos-draft`.
- Preserved `POST /api/products/:id/sell-on-bazos` as a compatibility alias.
- Catalog now requests Bazos draft preparation through Bazos-owned `sell-action` contract.
- Catalog no longer directly creates Bazos accounts, identities, offers, or enqueue-publish jobs in this action path.
- Bazos policy and human-action reasons are surfaced in Catalog action responses.

## Validation Evidence

- `npm test -- --runInBand` passed: 5 suites / 23 tests.
- `npm run build` passed.
- `git diff --check` passed.
- Created `reports/validation/VAL-GOAL-07-bazos-draft-integration-contract.md`.
