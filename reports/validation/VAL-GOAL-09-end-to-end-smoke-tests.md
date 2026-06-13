# VAL-GOAL-09 - End-To-End Catalog Smoke Tests

```yaml
id: VAL-CAT-G09
status: passed
goal_id: CAT-G09
created: 2026-06-13
last_updated: 2026-06-13
branch: feature/catalog-goal-09-end-to-end-smoke-tests
```

## Planned Validation

| Command | Status | Notes |
| --- | --- | --- |
| `npm run smoke:e2e` | passed | Ran against `https://catalog.alfares.cz`; 9 passed, 0 skipped, 0 failed. |
| `npm test -- --runInBand` | passed | Full Catalog Jest suite passed: 6 suites / 33 tests. |
| `npm run build` | passed | Nest build completed. |
| `git diff --check` | passed | No whitespace errors. |

## Smoke Evidence

The smoke command selected product `a2e15cc0-1a94-4faf-a82f-64afea9e9817` from the public product list and verified:

- `health`: `200`, service `catalog-microservice`.
- `product-search`: `200`, valid list envelope.
- `product-detail`: `200`, selected product ID matched.
- `pricing-current`: `200`, success envelope, no current price present for selected product.
- `media-by-product`: `200`, valid media array, count `0`.
- `protected-mutation-rejection`: anonymous category `POST` returned `401`.
- `warehouse-contract-protection`: anonymous availability batch `POST` returned `401`.
- `flipflop-contract-protection`: anonymous FlipFlop projection `POST` returned `401`.
- `bazos-contract-protection`: anonymous Bazos draft `POST` returned `401`.

## Result

CAT-G09 passed source and runtime-safe validation. The smoke script names each contract, returns structured JSON, and exits nonzero when a contract fails.

## Deployment Evidence

Deployment was run after owner approval:

- Merge commit: `89e9f24`.
- Command: `./scripts/deploy.sh`.
- Image: `localhost:5000/catalog-microservice:89e9f24` and `latest`.
- Kubernetes rollout: completed successfully.
- In-pod health check: `status=healthy`, service `catalog-microservice`, version `1.0.0`, environment `production`.
- Post-deploy smoke: `npm run smoke:e2e` passed against `https://catalog.alfares.cz` with 9 passed, 0 skipped, 0 failed.

## Boundary Evidence

- No authorized requests, JWTs, service tokens, runtime secrets, customer data, supplier payloads, media uploads, pricing writes, product writes, or delete actions were used.
- Anonymous protected-contract checks intentionally relied on `401` responses before any mutation could occur.
- Production deployment used the approved deploy script and post-deploy smoke remained non-destructive.
