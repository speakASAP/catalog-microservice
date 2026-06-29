# TASK-STOCK-004 Catalog-to-Warehouse Token Mount Runbook

Purpose: make the remaining Catalog-to-Warehouse credential lane reproducible without printing token values or changing Warehouse auth semantics.

This runbook is approval-gated. Do not run the mutation sections without explicit owner approval for DB mutation, token issuance, Vault secret mutation, Catalog ExternalSecret change, and Catalog deploy.

## Intent Preservation Chain

Vision: prevent overselling by making Warehouse the stock authority for Catalog and all sales channels.

Goal Impact: Catalog can read Warehouse availability with an Auth-compatible service JWT, allowing `npm run verify:stock-acceptance:gates` to prove stock propagation before channel selling.

System: `auth-microservice` issues the Catalog service JWT; Vault/ExternalSecrets mount it into `catalog-microservice`; `warehouse-microservice` validates the bearer through Auth `/auth/validate`.

Feature: Catalog Warehouse service credential provisioning and mount.

Task: TASK-STOCK-004 owner-approved runtime credential lane.

Execution Plan: preflight current wiring, issue a service-principal token, store it under an Auth-owned Vault property, remap Catalog `WAREHOUSE_SERVICE_TOKEN`, deploy Catalog, then rerun the central acceptance gate.

Coding Prompt: do not add Warehouse static-token bypasses; use Auth service identity with `internal:warehouse-microservice:admin`; do not print, commit, or decode token values.

Code: `auth-microservice/scripts/provision-catalog-warehouse-service-token.ts`, `catalog-microservice/k8s/external-secret.yaml`, `catalog-microservice/scripts/check-stock-credential-wiring.sh`, `catalog-microservice/scripts/run-stock-acceptance-gates.sh`.

Validation: `npm run verify:stock-credential:wiring` then `npm run verify:stock-acceptance:gates`.

## Current Known State

- `auth-microservice` deployed service identity projection in image `localhost:5000/auth-microservice:97ea521-20260629180327`.
- `warehouse-microservice` source coverage proves `serviceName=service=clientId=catalog-microservice` with `internal:warehouse-microservice:admin` is accepted by the default Warehouse guard.
- Catalog runtime key to keep: `WAREHOUSE_SERVICE_TOKEN`.
- Current source: `secret/prod/catalog-microservice#WAREHOUSE_SERVICE_TOKEN`.
- Target source after approval: `secret/prod/auth-microservice#CATALOG_WAREHOUSE_SERVICE_TOKEN`.
- `CATALOG_INTERNAL_SERVICE_TOKEN` already follows the Auth-owned pattern at `secret/prod/auth-microservice#CATALOG_INTERNAL_SERVICE_TOKEN`.

## Read-Only Preflight

Safe to run without secret values:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/auth-microservice && git status --short --branch && git log -1 --oneline'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && git status --short --branch && git log -1 --oneline'
ssh alfares 'cd /home/ssf/Documents/Github/warehouse-microservice && git status --short --branch && git log -1 --oneline'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm run verify:stock-credential:wiring'
ssh alfares 'kubectl get externalsecret catalog-microservice-secret auth-microservice-secret -n statex-apps'
```

Expected before approval: `npm run verify:stock-credential:wiring` fails only because `WAREHOUSE_SERVICE_TOKEN` is still sourced from `secret/prod/catalog-microservice#WAREHOUSE_SERVICE_TOKEN`.

## Approval-Gated DB Mutation And Token Issuance

Requires explicit owner approval for Auth DB mutation and token issuance.

Use a secure operator-controlled token output path. Do not place token files in the repository.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/auth-microservice && npx ts-node scripts/provision-catalog-warehouse-service-token.ts \
  --email=catalog-warehouse-service@alfares.cz \
  --service-name=catalog-microservice \
  --role=internal:warehouse-microservice:admin \
  --create-if-missing \
  --apply \
  --confirm-db-mutation=CATALOG_WAREHOUSE_SERVICE_PRINCIPAL \
  --confirm-token-issuance=CATALOG_WAREHOUSE_SERVICE_JWT \
  --token-output=/secure/operator/path/catalog-warehouse.jwt'
```

Expected helper behavior:

- creates or updates only a `userType=service` principal
- assigns `internal:warehouse-microservice:admin`
- writes the JWT only to `--token-output`
- writes file mode `0600`
- does not print token values

## Approval-Gated Vault Secret Mutation

Requires explicit owner approval for Vault mutation.

Preferred target property:

```text
secret/prod/auth-microservice#CATALOG_WAREHOUSE_SERVICE_TOKEN
```

Preferred command pattern, subject to operator confirmation that the local Vault CLI supports `kv patch` with `@file` values:

```bash
ssh alfares 'vault kv patch secret/prod/auth-microservice CATALOG_WAREHOUSE_SERVICE_TOKEN=@/secure/operator/path/catalog-warehouse.jwt'
```

If `vault kv patch ... KEY=@file` is not supported in the installed Vault CLI, use an operator-approved equivalent that preserves all existing properties at `secret/prod/auth-microservice`. Do not use a full `vault kv put` unless the command includes all existing required properties and the operator has reviewed the overwrite risk.

Do not print, cat, decode, or copy the token into docs, shell history notes, issue comments, or Git.

## Approval-Gated Catalog ExternalSecret Remap

Requires explicit owner approval for source/config mutation and deploy.

Change only the `WAREHOUSE_SERVICE_TOKEN` `remoteRef` in `catalog-microservice/k8s/external-secret.yaml`:

```yaml
- secretKey: WAREHOUSE_SERVICE_TOKEN
  remoteRef:
    key: secret/prod/auth-microservice
    property: CATALOG_WAREHOUSE_SERVICE_TOKEN
```

Keep the runtime env key as `WAREHOUSE_SERVICE_TOKEN`; Catalog code already tries this key first.

Pre-deploy checks:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && kubectl apply --dry-run=server -f k8s/external-secret.yaml -n statex-apps'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && bash -n scripts/check-stock-credential-wiring.sh && bash -n scripts/run-stock-acceptance-gates.sh && git diff --check && npm run build'
```

Deploy:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && ./scripts/deploy.sh'
```

If deploy applies the ExternalSecret but the new Secret value has not reconciled yet, force only the ExternalSecret refresh without printing values:

```bash
ssh alfares 'kubectl annotate externalsecret catalog-microservice-secret -n statex-apps force-sync="$(date +%s)" --overwrite'
```

Then roll Catalog if the mounted Secret changed after the pod started:

```bash
ssh alfares 'kubectl rollout restart deployment/catalog-microservice -n statex-apps && kubectl rollout status deployment/catalog-microservice -n statex-apps --timeout=180s'
```

## Post-Mount Validation

Run in order:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm run verify:stock-credential:wiring'
ssh alfares 'cd /home/ssf/Documents/Github/catalog-microservice && npm run verify:stock-acceptance:gates'
```

Expected final state for this lane:

- `verify:stock-credential:wiring` status `passed`
- `stock-acceptance-gates.v1.commandStatuses.catalogStockCredentialWiring=0`
- `stock-acceptance-gates.v1.commandStatuses.catalogWarehouseCredential=0`
- `acceptedCandidate=WAREHOUSE_SERVICE_TOKEN`
- Warehouse verifier still checks 9 products and `totalAvailable=496`
- Allegro dry-run still reports `warehouseMatches=9`, `warehouseMismatches=0`, `warehouseVerifyFailed=0`
- Catalog smoke checks the 9 products, channel statuses, and Heureka readiness without Warehouse credential failures

Complete physical stock beyond those 9 current Allegro-authoritative offers remains gated on `[MISSING: owner-approved BizBox/current stock export, real supplier source contract, additional seller authorization, or explicit authority confirmation]`.
