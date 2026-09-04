# Goal 14 - Authorized Runtime Contract Smoke

Status: done

Completion: Implemented on `feature/catalog-goal-14-authorized-runtime-contract-smoke`, merged to `main` with `8b85197`, runtime credential wiring committed as `3abbe1f`, and optional Warehouse logistics fallback committed/deployed as `1747c87`. Default smoke remains anonymous and non-destructive. Authorized Warehouse/FlipFlop checks passed with Vault/Kubernetes runtime credentials. The owner determined that the optional Bazos authorized draft smoke is not needed, so it will remain disabled and is not a completion blocker.

## Intent

Catalog should prove protected integration contracts work with approved runtime credentials, while keeping default smoke anonymous, non-destructive, and safe for production.

## Dependencies

- Goal 05.
- Goal 06.
- Goal 07.
- Goal 09.

## Scope

- Add an opt-in authorized smoke mode for protected runtime contracts.
- Verify authorized Warehouse availability returns the expected Catalog envelope.
- Verify authorized FlipFlop projection returns the expected Catalog projection envelope.
- Keep Bazos authorized draft smoke behind a second explicit opt-in because it can request Bazos-owned draft work.
- Record skipped checks when approved credentials or safe Bazos inputs are unavailable.

## Non-Goals

- Do not print JWTs, service tokens, runtime secrets, raw production payloads, or customer/supplier data.
- Do not make authorized smoke the default.
- Do not create, update, delete, archive, price, or upload Catalog records.
- Do not bypass Bazos policy or publishing ownership.

## Acceptance Criteria

- Default `npm run smoke:e2e` remains safe and exits successfully without credentials.
- `npm run smoke:e2e:authorized` names skipped authorized checks when no token is supplied.
- When approved credentials are supplied, authorized Warehouse and FlipFlop checks use real protected endpoints and validate response envelopes.
- Authorized Bazos smoke requires separate explicit opt-in and required Bazos identity/category inputs.

## Validation

```bash
npm run smoke:e2e
npm run smoke:e2e:authorized
npm test -- --runInBand
npm run build
git diff --check
```

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-003`, `CAT-INV-005`, `CAT-INV-009`, and `CAT-INV-010`.
- Warehouse remains stock authority.
- FlipFlop remains storefront/checkout authority.
- Bazos remains policy and publishing authority.
