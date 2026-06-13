# Goal 16 - Production Contract Monitoring And Drift Audit

Status: done

## Intent

Catalog should continuously prove that its production cross-service contracts still behave as expected after deployments and dependency changes, without moving ownership from Warehouse, FlipFlop, Auth, or Bazos into Catalog.

## Dependencies

- Goal 09.
- Goal 14.
- Goal 15.

## Scope

- Add a production contract monitor that reuses the existing smoke contracts and emits sanitized JSON suitable for scheduled logs.
- Add a Kubernetes CronJob manifest for recurring production contract drift checks.
- Keep Bazos authorized draft checks disabled by default because they can prepare or reuse Bazos-owned draft work.
- Use Vault/Kubernetes secret references for runtime tokens only; do not commit token values.
- Record validation evidence and next operator action in Catalog status docs.

## Non-Goals

- Do not add a new external monitoring service.
- Do not add database tables, alert routing, or notification credentials.
- Do not confirm, queue, publish, renew, or delete Bazos ads.
- Do not store tokens, raw payloads, identity contact data, session/cookie data, or production response bodies in source or validation docs.
- Do not change public read envelopes or protected mutation behavior.

## Acceptance Criteria

- `npm run monitor:contracts` runs the anonymous production smoke and returns nonzero on failed contracts.
- Authorized Warehouse and FlipFlop checks can run from Kubernetes runtime secrets without printing tokens.
- The monitor output summarizes pass/skip/fail counts per profile and lists failed contract names without raw sensitive payloads.
- Kubernetes CronJob is present but Bazos authorized draft monitoring remains explicitly opt-in and disabled in the manifest.
- Build, tests, diff check, and monitor dry runs pass.

## Source Validation Evidence

- `npm run monitor:contracts` passed: anonymous profile passed with 9 passed, 2 skipped, 0 failed.
- `CATALOG_MONITOR_AUTHORIZED=true` with runtime Kubernetes token passed: anonymous profile passed 9/2/0 and authorized profile passed 11/1/0.
- `npm run smoke:e2e` passed: 9 passed, 2 skipped, 0 failed.
- `npm test -- --runInBand` passed: 6 suites / 34 tests.
- `npm run build` passed.
- `kubectl apply --dry-run=server -f k8s/contract-monitor-cronjob.yaml -n statex-apps` passed.
- `git diff --check` passed.

## Runtime Closure Evidence

- Source merged to `main` with merge commit `baad7fb`.
- Production image packaging fix committed as `afb7cef` so monitor scripts are present in the runtime image.
- CronJob internal service URL fix committed as `9575158`.
- Smoke retry hardening committed and deployed as `f6abce4`.
- Final deployment from `f6abce4` completed successfully with healthy rollout.
- Live manual Job created from `cronjob/catalog-contract-monitor` completed successfully.
- Live monitor output passed both profiles: anonymous 9 passed / 2 skipped / 0 failed; authorized 11 passed / 1 skipped / 0 failed.
- CronJob schedule verified as `*/30 * * * *` and not suspended.

## Boundary Checks

- Preserve `CAT-INV-001`, `CAT-INV-002`, `CAT-INV-003`, `CAT-INV-004`, `CAT-INV-005`, `CAT-INV-009`, and `CAT-INV-010`.
- Catalog monitors contracts; it does not become the stock, auth, storefront, Bazos compliance, queue, or publishing authority.
