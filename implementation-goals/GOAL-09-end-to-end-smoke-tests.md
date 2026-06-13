# Goal 09 - End-To-End Catalog Smoke Tests

Status: done

Completion: Implemented in commit `47b9c93`, merged through `89e9f24`, deployed to production, and post-deploy smoke verified. `npm run smoke:e2e` passed against `https://catalog.alfares.cz` with 9 passed, 0 skipped, and 0 failed.

## Intent

Catalog must prove it serves product truth through health, read contracts, pricing/media access, and protected mutation rejection.

## Dependencies

- Goal 01.
- Goal 02.
- Goal 03.

## Scope

- Add smoke script for health, product search, product detail, pricing, media, and auth-protected mutation rejection.
- Add optional integration checks for warehouse, FlipFlop, and Bazos contract endpoints.
- Make smoke output name the broken contract when failing.

## Non-Goals

- Do not run destructive production mutations.
- Do not require unavailable credentials for default smoke.
- Do not modify other services unless owner explicitly asks.

## Acceptance Criteria

- Smoke output names the broken contract when failing.
- Protected write check proves unauthorized mutation is rejected.
- `npm run build` and smoke checks are documented in status.

## Validation

```bash
npm run build
npm test
```

Run the smoke script against local or production-safe target and record evidence.

## Boundary Checks

- Preserve all catalog invariants, especially `CAT-INV-009` and `CAT-INV-010`.
