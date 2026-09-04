# VAL-GOAL-14 - Authorized Runtime Contract Smoke

```yaml
id: VAL-CAT-G14
status: passed
goal_id: CAT-G14
created: 2026-06-13
last_updated: 2026-06-13
branch: main
```

## Planned Validation

| Command | Status | Notes |
| --- | --- | --- |
| `npm run smoke:e2e` | passed | Default anonymous smoke passed against `https://catalog.alfares.cz`: 9 passed, 2 skipped, 0 failed. Authorized checks skipped because they were not enabled. |
| `npm run smoke:e2e:authorized` | passed_with_skips | Authorized mode passed safely without approved token: 9 passed, 2 skipped, 0 failed. Authorized runtime checks named the missing token requirement. |
| `npm test -- --runInBand` | passed | Full Catalog Jest suite passed: 6 suites / 33 tests. |
| `npm run build` | passed | Nest build completed. |
| `git diff --check` | passed | No whitespace errors. |
| `npm test -- --runInBand src/warehouse-availability/warehouse-availability.service.spec.ts` | passed | Regression coverage for stock-only availability when optional Warehouse logistics enrichment is unavailable: 11 tests passed. |
| `npm run smoke:e2e:authorized` | passed_with_safe_skip | Runtime authorized smoke passed after Vault/Kubernetes credential wiring and deployment: 11 passed, 1 skipped, 0 failed. Warehouse availability and FlipFlop projection returned 200. Bazos authorized draft remained skipped because it requires explicit side-effect inputs. |

## Result

CAT-G14 passed source and runtime validation. The default smoke remains anonymous and non-destructive, while authorized Warehouse/FlipFlop runtime checks are available through explicit environment-gated execution and Vault-backed Kubernetes runtime secrets.

## Boundary Evidence

Authorized runtime checks were implemented as opt-in only. No token values, service credentials, Bazos identities, customer data, supplier payloads, or raw response bodies should be stored in this report.

Runtime credential evidence:

- Catalog smoke JWT was rotated in Vault under `secret/prod/catalog-microservice` and synced through `catalog-microservice-secret`.
- Catalog-to-Warehouse service token was created in Vault under `secret/prod/catalog-microservice`, mapped by `k8s/external-secret.yaml`, synced through Kubernetes, and loaded into the pod via `envFrom`.
- `WAREHOUSE_SERVICE_URL` was set through the Catalog ConfigMap to the in-cluster Warehouse service on port `3201`.
- No token values were printed or committed.

Deployment/runtime evidence:

- `8b85197` merged Goal 14 source into `main`.
- `3abbe1f` committed runtime credential wiring and was deployed successfully.
- `1747c87` committed a Catalog fallback so optional Warehouse logistics enrichment failures do not turn valid stock availability into a `503`; this was deployed successfully.
- Runtime `npm run smoke:e2e:authorized` against `https://catalog.alfares.cz` passed: 11 passed, 1 skipped, 0 failed.

Authorized Bazos draft smoke was not run because it requires a separate explicit opt-in plus Bazos-owned identity/category inputs and can create side-effecting draft work.
## Owner Decision

On 2026-09-04, the owner determined that the optional authorized Bazos draft smoke is not needed. It remains disabled and is not a GOAL-14 blocker.
