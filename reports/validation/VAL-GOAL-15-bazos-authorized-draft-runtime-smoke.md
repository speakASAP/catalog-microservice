# VAL-GOAL-15 - Bazos Authorized Draft Runtime Smoke

```yaml
id: VAL-CAT-G15
status: passed
goal_id: CAT-G15
created: 2026-06-13
last_updated: 2026-06-13
branch: main
```

## Planned Validation

| Command | Status | Notes |
| --- | --- | --- |
| `npm run smoke:e2e` | passed | Default anonymous-safe smoke passed: 9 passed, 2 skipped, 0 failed. |
| `npm run smoke:e2e:authorized` | passed | Authorized Warehouse/FlipFlop smoke passed with Bazos skipped: 11 passed, 1 skipped, 0 failed. |
| `npm run smoke:e2e:bazos-authorized` without runtime Bazos inputs | passed | Bazos-authorized smoke skipped with explicit missing Bazos input reason: 11 passed, 1 skipped, 0 failed. |
| `npm test -- --runInBand` | passed | Full Catalog Jest suite passed: 6 suites / 34 tests. |
| `npm run build` | passed | Nest build passed. |
| `git diff --check` | passed | Whitespace gate passed. |
| `npm run smoke:e2e:bazos-authorized` with Vault/Kubernetes runtime inputs | passed | Runtime smoke passed against `https://catalog.alfares.cz`: 12 passed, 0 skipped, 0 failed. Draft status remained `draft`; no confirmation, queue, or publish was invoked. |

## Boundary Evidence

No token values, Bazos identity contact data, Bazos sessions/cookies, verification codes, challenge payloads, raw response bodies, or publish queue calls may be stored in this report.

## Runtime Preparation Evidence

- Created/stored Bazos smoke runtime inputs in Vault under `secret/prod/catalog-microservice`.
- Synced `CATALOG_SMOKE_BAZOS_PRODUCT_ID`, `CATALOG_SMOKE_BAZOS_IDENTITY_ID`, `CATALOG_SMOKE_BAZOS_CATEGORY`, and `CATALOG_SMOKE_BAZOS_LOCATION` through Kubernetes.
- Added `BAZOS_SERVICE_TOKEN` Vault/Kubernetes mapping for Catalog-to-Bazos service calls.
- Bazos-service deployed commit `c58d8b7`, exposing the shared catalog sell-action controller in the deployed app.
- Direct route mapping evidence showed `POST /api/bazos/catalog/products/:productId/sell-action` registered.
- Catalog deployed merge commit `555652c`; the rollout completed successfully and health returned `healthy`.
- Kubernetes secret sync exposed `BAZOS_SERVICE_TOKEN` before the active Catalog pod started.
- Linked the dedicated smoke identity to a dedicated runtime Bazos smoke account in the Bazos database. No token values, contact data, or account/identity IDs were committed or printed.

## Runtime Smoke Evidence

- `authorized-bazos-draft` passed with HTTP `201`.
- The response preserved Bazos authority and publish/policy authority.
- The response included a Bazos-owned draft for the configured smoke identity.
- The draft remained `draft`.
- `requiresConfirmation` was `true`.
- `canQueueAfterConfirmation` was `false`.
- `policyAllowed` was `false`, with next action `resolve_policy_failures`.
- No confirmation, queue, publish, browser submit, renewal, delete, CAPTCHA, SMS, bank, cookie, session, or challenge path was invoked.
