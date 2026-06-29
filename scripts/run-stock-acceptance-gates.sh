#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-statex-apps}"
PRODUCT_IDS="${STOCK_ACCEPTANCE_PRODUCT_IDS:-ce4a51aa-2d12-4ab7-a965-7a36609d01fc,d8c962ad-1717-430e-932e-a2ebc870233e,4090f93b-e8a7-4a08-a21f-3ae645620910,1db1cac0-db7f-4b29-bcb3-1055f8955b81,dbc51dde-fc66-4511-b178-f929183f4647,884c1c5e-fe94-46c7-aab1-78bcc424e7ee,87b1bdb1-2cdb-458b-97d0-77ee7814b30f,53fb68c9-c8e8-4490-a145-1f3d0094c86d,8bba517b-e5c6-41c4-9bb3-92108f4f84c3}"
EXPECTED_TOTALS="${STOCK_ACCEPTANCE_EXPECTED_TOTALS:-ce4a51aa-2d12-4ab7-a965-7a36609d01fc=124,d8c962ad-1717-430e-932e-a2ebc870233e=87,4090f93b-e8a7-4a08-a21f-3ae645620910=50,1db1cac0-db7f-4b29-bcb3-1055f8955b81=25,dbc51dde-fc66-4511-b178-f929183f4647=110,884c1c5e-fe94-46c7-aab1-78bcc424e7ee=60,87b1bdb1-2cdb-458b-97d0-77ee7814b30f=10,53fb68c9-c8e8-4490-a145-1f3d0094c86d=3,8bba517b-e5c6-41c4-9bb3-92108f4f84c3=27}"
ALLEGRO_DETAIL_LIMIT="${STOCK_ACCEPTANCE_ALLEGRO_DETAIL_LIMIT:-20}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

fail() {
  echo "stock acceptance gate failed: $*" >&2
  exit 1
}

deployment_image() {
  local deployment="$1"
  kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}'
}

running_pod_for_image() {
  local deployment="$1"
  local image="$2"
  kubectl get pods -n "$NAMESPACE" -l "app=$deployment" --field-selector=status.phase=Running -o json \
    | node -e '
const fs = require("fs");
const image = process.argv[1];
const data = JSON.parse(fs.readFileSync(0, "utf8"));
const pod = (data.items || []).find((item) =>
  item?.spec?.containers?.some((container) => container.image === image)
);
if (pod) console.log(pod.metadata.name);
' "$image"
}

extract_json() {
  local file="$1"
  node - "$file" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
for (let start = 0; start < raw.length; start += 1) {
  if (raw[start] !== "{") continue;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(raw.slice(start, index + 1));
          process.stdout.write(JSON.stringify(parsed));
          process.exit(0);
        } catch {
          break;
        }
      }
    }
  }
}
throw new Error(`No JSON object found in ${file}`);
NODE
}

print_section() {
  printf '\n== %s ==\n' "$1"
}

run_and_capture() {
  local output_file="$1"
  shift
  set +e
  "$@" 2>&1 | tee "$output_file"
  local status="${PIPESTATUS[0]}"
  set -e
  return "$status"
}

warehouse_image="$(deployment_image warehouse-microservice)"
allegro_image="$(deployment_image allegro-service)"
catalog_image="$(deployment_image catalog-microservice)"

warehouse_pod="$(running_pod_for_image warehouse-microservice "$warehouse_image")"
allegro_pod="$(running_pod_for_image allegro-service "$allegro_image")"
catalog_pod="$(running_pod_for_image catalog-microservice "$catalog_image")"

[[ -n "$warehouse_pod" ]] || fail "no running warehouse-microservice pod for image $warehouse_image"
[[ -n "$allegro_pod" ]] || fail "no running allegro-service pod for image $allegro_image"
[[ -n "$catalog_pod" ]] || fail "no running catalog-microservice pod for image $catalog_image"

warehouse_out="$tmpdir/warehouse.json"
allegro_out="$tmpdir/allegro.json"
credential_out="$tmpdir/catalog-warehouse-credential.json"
catalog_out="$tmpdir/catalog.json"

print_section "Warehouse stock authority"
warehouse_status=0
run_and_capture "$warehouse_out" kubectl exec -n "$NAMESPACE" "$warehouse_pod" -- sh -lc \
  "WAREHOUSE_VERIFY_PRODUCT_IDS='$PRODUCT_IDS' WAREHOUSE_VERIFY_EXPECTED_TOTALS='$EXPECTED_TOTALS' npm run verify:stock-authority-live" \
  || warehouse_status="$?"

print_section "Allegro current stock against Warehouse"
allegro_status=0
run_and_capture "$allegro_out" kubectl exec -n "$NAMESPACE" "$allegro_pod" -- sh -lc \
  "npm run import:current-stock:warehouse -- --all-accounts --dry-run --verify-warehouse --detail-limit '$ALLEGRO_DETAIL_LIMIT'" \
  || allegro_status="$?"

print_section "Catalog Warehouse credential preflight"
credential_status=0
run_and_capture "$credential_out" kubectl exec -n "$NAMESPACE" "$catalog_pod" -- sh -lc \
  "STOCK_ACCEPTANCE_PRODUCT_IDS='$PRODUCT_IDS' node - <<'NODE'
const productIds = (process.env.STOCK_ACCEPTANCE_PRODUCT_IDS || '').split(',').map((item) => item.trim()).filter(Boolean);
const authBaseUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370').replace(/\\/+$/, '');
const warehouseBaseUrl = (process.env.WAREHOUSE_SERVICE_URL || process.env.WAREHOUSE_BASE_URL || 'http://warehouse-microservice:3000').replace(/\\/+$/, '');
const candidates = [
  'WAREHOUSE_SERVICE_TOKEN',
  'WAREHOUSE_INTERNAL_SERVICE_TOKEN',
  'JWT_TOKEN',
  'CATALOG_INTERNAL_SERVICE_TOKEN',
  'INTERNAL_SERVICE_TOKEN',
];

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, ok: response.ok, json };
}

async function checkCandidate(name) {
  const token = process.env[name];
  if (!token) return { name, present: false, status: 'missing' };
  const result = { name, present: true, status: 'failed' };

  try {
    const auth = await postJson(authBaseUrl + '/auth/validate', { token });
    result.auth = {
      status: auth.status,
      valid: auth.json?.valid === true,
      roleCount: Array.isArray(auth.json?.user?.roles) ? auth.json.user.roles.length : 0,
      hasWarehouseAdminRole: Array.isArray(auth.json?.user?.roles)
        ? auth.json.user.roles.includes('internal:warehouse-microservice:admin') || auth.json.user.roles.includes('global:superadmin')
        : false,
      serviceNamePresent: Boolean(auth.json?.user?.serviceName || auth.json?.user?.service || auth.json?.user?.clientId || auth.json?.user?.client_id),
    };
  } catch (error) {
    result.auth = { status: 0, valid: false, error: error?.name || 'AuthRequestError' };
  }

  try {
    const warehouse = await postJson(
      warehouseBaseUrl + '/api/stock/availability/batch',
      { productIds },
      { authorization: 'Bearer ' + token },
    );
    result.warehouse = {
      status: warehouse.status,
      success: warehouse.json?.success === true,
      itemCount: Array.isArray(warehouse.json?.data) ? warehouse.json.data.length : 0,
    };
    if (warehouse.ok && warehouse.json?.success === true) {
      result.status = 'ok';
    }
  } catch (error) {
    result.warehouse = { status: 0, success: false, error: error?.name || 'WarehouseRequestError' };
  }

  return result;
}

(async () => {
  const results = [];
  for (const name of candidates) {
    results.push(await checkCandidate(name));
  }
  const accepted = results.find((item) => item.status === 'ok') || null;
  const summary = {
    contract: 'catalog-warehouse-credential-preflight.v1',
    mutatesWarehouse: false,
    checkedProductCount: productIds.length,
    authServiceUrlConfigured: Boolean(process.env.AUTH_SERVICE_URL),
    warehouseServiceUrlConfigured: Boolean(process.env.WAREHOUSE_SERVICE_URL || process.env.WAREHOUSE_BASE_URL),
    candidateResults: results,
    acceptedCandidate: accepted?.name || null,
    status: accepted ? 'ok' : 'failed',
    issues: accepted ? [] : ['No configured Catalog credential was accepted by Warehouse availability batch'],
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(accepted ? 0 : 1);
})().catch((error) => {
  console.log(JSON.stringify({
    contract: 'catalog-warehouse-credential-preflight.v1',
    mutatesWarehouse: false,
    status: 'failed',
    issues: [error?.message || 'Catalog Warehouse credential preflight failed'],
  }, null, 2));
  process.exit(1);
});
NODE" \
  || credential_status="$?"

print_section "Catalog channel propagation smoke"
catalog_status=0
run_and_capture "$catalog_out" kubectl exec -n "$NAMESPACE" "$catalog_pod" -- sh -lc \
  "CATALOG_SMOKE_BASE_URL=http://127.0.0.1:3200 CATALOG_SMOKE_AUTHORIZED=true CATALOG_SMOKE_ASSERT_STOCK=true CATALOG_SMOKE_ENABLE_CHANNEL_STATUS=true CATALOG_SMOKE_ENABLE_HEUREKA_READINESS=true CATALOG_SMOKE_HEUREKA_BASE_URL=http://heureka-service:3800 CATALOG_SMOKE_PRODUCT_IDS='$PRODUCT_IDS' CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN=\"\$CATALOG_INTERNAL_SERVICE_TOKEN\" CATALOG_SMOKE_SERVICE_NAME=catalog-microservice node scripts/catalog-smoke.js" \
  || catalog_status="$?"

warehouse_json="$tmpdir/warehouse.parsed.json"
allegro_json="$tmpdir/allegro.parsed.json"
credential_json="$tmpdir/catalog-warehouse-credential.parsed.json"
catalog_json="$tmpdir/catalog.parsed.json"
extract_json "$warehouse_out" > "$warehouse_json"
extract_json "$allegro_out" > "$allegro_json"
extract_json "$credential_out" > "$credential_json"
extract_json "$catalog_out" > "$catalog_json"

print_section "Acceptance summary"
WAREHOUSE_IMAGE="$warehouse_image" ALLEGRO_IMAGE="$allegro_image" CATALOG_IMAGE="$catalog_image" \
node - "$warehouse_json" "$allegro_json" "$credential_json" "$catalog_json" "$PRODUCT_IDS" "$EXPECTED_TOTALS" "$warehouse_status" "$allegro_status" "$credential_status" "$catalog_status" <<'NODE'
const fs = require("fs");
const [warehouseFile, allegroFile, credentialFile, catalogFile, productIdsCsv, expectedTotalsCsv, warehouseStatus, allegroStatus, credentialStatus, catalogStatus] = process.argv.slice(2);
const warehouse = JSON.parse(fs.readFileSync(warehouseFile, "utf8"));
const allegro = JSON.parse(fs.readFileSync(allegroFile, "utf8"));
const credentialPreflight = JSON.parse(fs.readFileSync(credentialFile, "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
const productIds = productIdsCsv.split(",").filter(Boolean);
const expectedTotals = Object.fromEntries(expectedTotalsCsv.split(",").filter(Boolean).map((entry) => {
  const [productId, total] = entry.split("=");
  return [productId, Number(total)];
}));

const issues = [];
if (Number(warehouseStatus) !== 0) issues.push(`Warehouse verifier exited ${warehouseStatus}`);
if (Number(allegroStatus) !== 0) issues.push(`Allegro verifier exited ${allegroStatus}`);
if (Number(credentialStatus) !== 0) issues.push(`Catalog Warehouse credential preflight exited ${credentialStatus}`);
if (Number(catalogStatus) !== 0) issues.push(`Catalog smoke exited ${catalogStatus}`);
if (warehouse.contract !== "warehouse-stock-authority-live.v1") issues.push("Warehouse verifier contract mismatch");
if (warehouse.mutatesWarehouse !== false) issues.push("Warehouse verifier is not read-only");
if (warehouse.failedProductCount !== 0) issues.push(`Warehouse verifier reported ${warehouse.failedProductCount} failed products`);
if (warehouse.checkedProductCount !== productIds.length) issues.push(`Warehouse checked ${warehouse.checkedProductCount}, expected ${productIds.length}`);
if (warehouse.expectedTotalsChecked !== productIds.length) issues.push(`Warehouse checked ${warehouse.expectedTotalsChecked} expected totals, expected ${productIds.length}`);

if (allegro.source !== "allegro-current-stock-warehouse-import.v1") issues.push("Allegro verifier source mismatch");
if (allegro.mode !== "dry-run") issues.push(`Allegro verifier ran in ${allegro.mode} mode`);
if (allegro.mutatesWarehouse !== false) issues.push("Allegro verifier would mutate Warehouse");
if (allegro.verifiesWarehouse !== true) issues.push("Allegro verifier did not verify Warehouse");
if ((allegro.totals?.warehouseMismatches || 0) !== 0) issues.push(`Allegro verifier reported ${allegro.totals.warehouseMismatches} Warehouse mismatches`);
if ((allegro.totals?.warehouseVerifyFailed || 0) !== 0) issues.push(`Allegro verifier reported ${allegro.totals.warehouseVerifyFailed} Warehouse verification failures`);

if (credentialPreflight.contract !== "catalog-warehouse-credential-preflight.v1") issues.push("Catalog Warehouse credential preflight contract mismatch");
if (credentialPreflight.mutatesWarehouse !== false) issues.push("Catalog Warehouse credential preflight is not read-only");
if (credentialPreflight.status !== "ok") issues.push("No Catalog Warehouse credential candidate was accepted by Warehouse");

if ((catalog.failed || 0) !== 0) issues.push(`Catalog smoke reported ${catalog.failed} failed checks`);
if (catalog.stockEvidence) {
  const checkedProducts = Object.keys(catalog.stockEvidence.products || {});
  if (checkedProducts.length !== productIds.length) issues.push(`Catalog smoke checked ${checkedProducts.length} products, expected ${productIds.length}`);
  for (const [productId, expected] of Object.entries(expectedTotals)) {
    const product = catalog.stockEvidence.products?.[productId];
    if (!product) {
      issues.push(`Catalog smoke missing product ${productId}`);
      continue;
    }
    if (Number(product.warehouseAvailable) !== expected) {
      issues.push(`Catalog product ${productId} warehouseAvailable ${product.warehouseAvailable}, expected ${expected}`);
    }
  }
} else {
  issues.push("Catalog smoke did not include stock evidence");
}

const summary = {
  contract: "stock-acceptance-gates.v1",
  mutatesWarehouse: false,
  checkedProductCount: productIds.length,
  expectedTotals,
  deploymentImages: {
    warehouse: process.env.WAREHOUSE_IMAGE || null,
    allegro: process.env.ALLEGRO_IMAGE || null,
    catalog: process.env.CATALOG_IMAGE || null,
  },
  commandStatuses: {
    warehouse: Number(warehouseStatus),
    allegro: Number(allegroStatus),
    catalogWarehouseCredential: Number(credentialStatus),
    catalog: Number(catalogStatus),
  },
  warehouse: {
    checkedProductCount: warehouse.checkedProductCount,
    failedProductCount: warehouse.failedProductCount,
    totalQuantity: warehouse.totalQuantity,
    totalReserved: warehouse.totalReserved,
    totalAvailable: warehouse.totalAvailable,
    expectedTotalsChecked: warehouse.expectedTotalsChecked,
  },
  allegro: {
    mode: allegro.mode,
    mutatesWarehouse: allegro.mutatesWarehouse,
    verifiesWarehouse: allegro.verifiesWarehouse,
    accountCount: allegro.accountCount,
    totals: allegro.totals,
  },
  catalogWarehouseCredential: {
    status: credentialPreflight.status,
    acceptedCandidate: credentialPreflight.acceptedCandidate,
    candidates: (credentialPreflight.candidateResults || []).map((candidate) => ({
      name: candidate.name,
      present: candidate.present,
      status: candidate.status,
      authStatus: candidate.auth?.status,
      authValid: candidate.auth?.valid,
      hasWarehouseAdminRole: candidate.auth?.hasWarehouseAdminRole,
      warehouseStatus: candidate.warehouse?.status,
      warehouseSuccess: candidate.warehouse?.success,
    })),
  },
  catalog: {
    passed: catalog.passed,
    skipped: catalog.skipped,
    failed: catalog.failed,
    checkedProductCount: Object.keys(catalog.stockEvidence?.products || {}).length,
    checkedChannelStatuses: Object.keys(catalog.stockEvidence?.channelStatuses || {}).length,
    checkedHeurekaReadiness: Object.keys(catalog.stockEvidence?.heurekaReadiness || {}).length,
  },
  status: issues.length === 0 ? "ok" : "failed",
  issues,
};

console.log(JSON.stringify(summary, null, 2));
if (issues.length > 0) process.exit(1);
NODE
