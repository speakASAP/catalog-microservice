# VAL-CATALOG-TOKEN-ENV-WIRING: JWT Token Environment Wiring

```yaml
id: VAL-CATALOG-TOKEN-ENV-WIRING
status: passed
validated_artifact: k8s/external-secret.yaml
owner: orchestrator
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
```

## Artifact Validated

- Branch: `feature/catalog-goal-02-product-model-completeness`
- Repository: `/home/ssf/Documents/Github/catalog-microservice`
- Target files: `k8s/external-secret.yaml`, `.env.example`, `k8s/secret.yaml.example`

## Validation Scope

Validated the cross-service JWT token mapping pattern against RunLayer token-env wiring and Catalog runtime configuration. This validation does not change Catalog auth behavior and does not deploy production code.

## Evidence

- RunLayer token-env wiring maps Vault property `JWT_TOKEN` into runtime secret keys consumed by the service and scripts, with no token values committed.
- Catalog deployment uses `envFrom` for `catalog-microservice-secret`, so ExternalSecret `secretKey` names become runtime environment variables.
- Catalog now maps Vault property `JWT_TOKEN` from `secret/prod/catalog-microservice` into runtime key `JWT_TOKEN`.
- The live Kubernetes Secret key list includes `JWT_TOKEN`; key names only were inspected and no value was printed.
- Catalog auth verification remains based on `JWT_SECRET`/`AUTH_JWT_SECRET`; `JWT_TOKEN` is documented as a compatibility token for smoke/orchestration tooling, not as an auth bypass.

## Gate Evidence

- `kubectl apply --dry-run=client -f k8s/external-secret.yaml -n statex-apps`: passed.
- `rg -n "JWT_TOKEN|JWT_SECRET|AUTH_JWT_SECRET" .env.example k8s src docs`: passed and showed repository wiring plus the existing auth guard secret usage.
- `git diff --check`: passed.

## Invariant Evidence

- `CAT-INV-003`: Auth remains the JWT issuer/RBAC authority; Catalog only receives configured token material and validates JWTs with shared secret.
- `CAT-INV-010`: Mutation endpoints remain protected by `CatalogAuthGuard`; no new anonymous write path or bypass token behavior was added.

## Sensitive-Data Evidence

Passed. Only environment variable names, Vault property names, and Kubernetes Secret key names were inspected or committed. No token value, secret value, JWT, or raw production data was printed or stored.

## Passed Criteria

- `JWT_TOKEN` is projected into `catalog-microservice-secret` from Vault property `JWT_TOKEN`.
- `.env.example` documents `JWT_TOKEN` as an empty placeholder.
- `k8s/secret.yaml.example` documents `JWT_TOKEN` as a commented placeholder.
- Kubernetes client dry-run accepts the ExternalSecret manifest.

## Failed Criteria

None.

## Deviations

No production deployment was performed for this docs/config commit because the live ExternalSecret had already reconciled the key and the user request was to resolve the mapping before Goal 3 planning.

## Recommendation

Treat Catalog token env mapping as resolved. Continue with Goal 3 pricing integrity execution planning.
