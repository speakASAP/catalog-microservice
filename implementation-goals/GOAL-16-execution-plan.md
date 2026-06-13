# Goal 16 Execution Plan - Production Contract Monitoring And Drift Audit

```yaml
goal_id: CAT-G16
status: source_validated
created: 2026-06-13
branch: feature/catalog-goal-16-contract-monitoring
data_classification: masked
```

## Context

Goals 9, 14, and 15 created production-safe smoke contracts for public reads, protected rejection, authorized Warehouse/FlipFlop calls, and separately gated Bazos draft preparation. Goal 16 turns those contracts into scheduled production drift monitoring while keeping credentials in Vault/Kubernetes and Bazos draft side effects opt-in.

## Plan

1. Add `scripts/catalog-contract-monitor.js` as a small wrapper around `scripts/catalog-smoke.js`.
2. Add `npm run monitor:contracts`.
3. Let the smoke script consume `JWT_TOKEN` as a runtime fallback for `CATALOG_SMOKE_AUTH_TOKEN` so the CronJob can use the existing ExternalSecret without duplicating token values.
4. Add `k8s/contract-monitor-cronjob.yaml` with anonymous plus authorized Warehouse/FlipFlop checks enabled and Bazos authorized checks disabled by default.
5. Update `scripts/deploy.sh` to apply the CronJob manifest with the service manifests.
6. Record validation and status evidence without raw response bodies or secrets.

## Invariants

- `CAT-INV-001`: Monitoring proves Catalog product-truth contracts without changing product ownership.
- `CAT-INV-002`: Warehouse remains stock authority; monitor only checks the Catalog availability contract.
- `CAT-INV-003`: Auth remains JWT authority; Catalog uses existing runtime token verification only.
- `CAT-INV-004`: FlipFlop remains storefront/checkout authority; monitor only checks Catalog projection shape.
- `CAT-INV-005`: Bazos remains draft/policy/publish authority; scheduled monitoring keeps Bazos draft disabled by default.
- `CAT-INV-009`: Public reads remain backward compatible; monitor observes the existing smoke contract.
- `CAT-INV-010`: Protected endpoints remain authenticated and audited; monitor proves anonymous rejection and authorized contract shape.

## Validation

```bash
npm run smoke:e2e
npm run monitor:contracts
CATALOG_MONITOR_AUTHORIZED=true CATALOG_SMOKE_AUTH_TOKEN=<runtime> npm run monitor:contracts
npm test -- --runInBand
npm run build
git diff --check
```

Runtime token validation must read tokens from Kubernetes or Vault at execution time and must not print token values.

## Source Validation Result

All planned source checks passed. Deployment and live CronJob verification remain the final closure steps after merge.
