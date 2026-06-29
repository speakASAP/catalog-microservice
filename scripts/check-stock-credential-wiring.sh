#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-statex-apps}"
EXTERNAL_SECRET_FILE="${EXTERNAL_SECRET_FILE:-k8s/external-secret.yaml}"
EXPECTED_WAREHOUSE_SECRET_PATH="${EXPECTED_WAREHOUSE_SECRET_PATH:-secret/prod/auth-microservice}"
EXPECTED_WAREHOUSE_SECRET_PROPERTY="${EXPECTED_WAREHOUSE_SECRET_PROPERTY:-CATALOG_WAREHOUSE_SERVICE_TOKEN}"
CATALOG_SECRET_NAME="${CATALOG_SECRET_NAME:-catalog-microservice-secret}"

have_kubectl=true
if ! command -v kubectl >/dev/null 2>&1; then
  have_kubectl=false
fi

secret_block() {
  local key="$1"
  awk -v wanted="$key" '
    $0 ~ "- secretKey: " wanted "$" { capture=1; count=0 }
    capture { print; count++ }
    capture && count >= 8 { capture=0 }
  ' "$EXTERNAL_SECRET_FILE"
}

warehouse_block="$(secret_block WAREHOUSE_SERVICE_TOKEN)"
catalog_internal_block="$(secret_block CATALOG_INTERNAL_SERVICE_TOKEN)"

manifest_warehouse_path="$(printf '%s
' "$warehouse_block" | awk '/key:/ {print $2; exit}')"
manifest_warehouse_property="$(printf '%s
' "$warehouse_block" | awk '/property:/ {print $2; exit}')"
manifest_catalog_internal_path="$(printf '%s
' "$catalog_internal_block" | awk '/key:/ {print $2; exit}')"
manifest_catalog_internal_property="$(printf '%s
' "$catalog_internal_block" | awk '/property:/ {print $2; exit}')"

secret_keys_json="[]"
external_secret_status="unknown"
deployment_images_json="{}"

if [ "$have_kubectl" = true ]; then
  if kubectl get secret "$CATALOG_SECRET_NAME" -n "$NAMESPACE" >/tmp/catalog-stock-secret-keys.err 2>&1; then
    secret_keys_json="$(kubectl get secret "$CATALOG_SECRET_NAME" -n "$NAMESPACE" -o json | node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(0, "utf8"));
console.log(JSON.stringify(Object.keys(data.data || {}).sort()));
')"
  else
    secret_keys_json="[]"
  fi

  external_secret_status="$(kubectl get externalsecret catalog-microservice-secret -n "$NAMESPACE" -o jsonpath='{range .status.conditions[*]}{.type}={.status}:{.reason}{";"}{end}' 2>/dev/null || true)"

  deployment_images_json="$(
    kubectl get deployment auth-microservice catalog-microservice warehouse-microservice -n "$NAMESPACE" -o json 2>/dev/null       | node -e '
const fs = require("fs");
const raw = fs.readFileSync(0, "utf8").trim();
if (!raw) { console.log("{}"); process.exit(0); }
const data = JSON.parse(raw);
const out = {};
for (const item of data.items || []) {
  out[item.metadata.name] = {
    image: item.spec?.template?.spec?.containers?.[0]?.image || null,
    ready: `${item.status?.readyReplicas || 0}/${item.spec?.replicas || 0}`,
  };
}
console.log(JSON.stringify(out));
' 2>/dev/null || printf '{}'
  )"
fi

MANIFEST_WAREHOUSE_PATH="$manifest_warehouse_path" MANIFEST_WAREHOUSE_PROPERTY="$manifest_warehouse_property" MANIFEST_CATALOG_INTERNAL_PATH="$manifest_catalog_internal_path" MANIFEST_CATALOG_INTERNAL_PROPERTY="$manifest_catalog_internal_property" EXPECTED_WAREHOUSE_SECRET_PATH="$EXPECTED_WAREHOUSE_SECRET_PATH" EXPECTED_WAREHOUSE_SECRET_PROPERTY="$EXPECTED_WAREHOUSE_SECRET_PROPERTY" SECRET_KEYS_JSON="$secret_keys_json" EXTERNAL_SECRET_STATUS="$external_secret_status" DEPLOYMENT_IMAGES_JSON="$deployment_images_json" HAVE_KUBECTL="$have_kubectl" node <<'NODE'
const secretKeys = JSON.parse(process.env.SECRET_KEYS_JSON || '[]');
const deploymentImages = JSON.parse(process.env.DEPLOYMENT_IMAGES_JSON || '{}');
const checks = [];
function check(name, pass, details = {}) {
  checks.push({ name, pass, ...details });
}

check('warehouseTokenManifestUsesAuthOwnedPath',
  process.env.MANIFEST_WAREHOUSE_PATH === process.env.EXPECTED_WAREHOUSE_SECRET_PATH,
  {
    actual: process.env.MANIFEST_WAREHOUSE_PATH || null,
    expected: process.env.EXPECTED_WAREHOUSE_SECRET_PATH,
  });
check('warehouseTokenManifestUsesCatalogWarehouseProperty',
  process.env.MANIFEST_WAREHOUSE_PROPERTY === process.env.EXPECTED_WAREHOUSE_SECRET_PROPERTY,
  {
    actual: process.env.MANIFEST_WAREHOUSE_PROPERTY || null,
    expected: process.env.EXPECTED_WAREHOUSE_SECRET_PROPERTY,
  });
check('catalogInternalTokenAlreadyAuthOwned',
  process.env.MANIFEST_CATALOG_INTERNAL_PATH === 'secret/prod/auth-microservice',
  {
    path: process.env.MANIFEST_CATALOG_INTERNAL_PATH || null,
    property: process.env.MANIFEST_CATALOG_INTERNAL_PROPERTY || null,
  });
check('runtimeSecretHasWarehouseServiceTokenKey',
  secretKeys.includes('WAREHOUSE_SERVICE_TOKEN'),
  { keyPresent: secretKeys.includes('WAREHOUSE_SERVICE_TOKEN') });
check('runtimeSecretHasCatalogInternalServiceTokenKey',
  secretKeys.includes('CATALOG_INTERNAL_SERVICE_TOKEN'),
  { keyPresent: secretKeys.includes('CATALOG_INTERNAL_SERVICE_TOKEN') });
check('externalSecretSynced',
  /Ready=True/.test(process.env.EXTERNAL_SECRET_STATUS || ''),
  { status: process.env.EXTERNAL_SECRET_STATUS || null });
for (const name of ['auth-microservice', 'catalog-microservice', 'warehouse-microservice']) {
  const deployment = deploymentImages[name] || {};
  check(`${name}Ready`, deployment.ready === '1/1', {
    image: deployment.image || null,
    ready: deployment.ready || null,
  });
}

const failed = checks.filter((item) => !item.pass);
const summary = {
  contract: 'catalog-stock-credential-wiring.v1',
  mutatesSecrets: false,
  mutatesKubernetes: false,
  readsSecretValues: false,
  namespace: process.env.NAMESPACE || 'statex-apps',
  expectedWarehouseTokenSource: {
    path: process.env.EXPECTED_WAREHOUSE_SECRET_PATH,
    property: process.env.EXPECTED_WAREHOUSE_SECRET_PROPERTY,
  },
  checks,
  status: failed.length === 0 ? 'passed' : 'failed',
};
console.log(JSON.stringify(summary, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
NODE
