#!/usr/bin/env node
"use strict";

const crypto = require("crypto");

const DEFAULT_CATALOG_BASE_URL = "https://catalog.alfares.cz";
const DEFAULT_CHANNEL_BASES = Object.freeze({
  allegro: "https://allegro.alfares.cz",
  aukro: "https://aukro.alfares.cz",
  bazos: "https://bazos.alfares.cz",
  heureka: "https://heureka.alfares.cz",
});

const catalogBaseUrl = trimBase(process.env.CATALOG_SOURCE_E2E_BASE_URL || DEFAULT_CATALOG_BASE_URL);
const ownerToken = tokenFromEnv("CATALOG_SOURCE_E2E_OWNER_TOKEN", "CATALOG_SMOKE_OWNER_TOKEN");
const viewerToken = tokenFromEnv("CATALOG_SOURCE_E2E_VIEWER_TOKEN", "CATALOG_SMOKE_VIEWER_TOKEN");
const execute = isEnabled(process.env.CATALOG_SOURCE_E2E_EXECUTE);
const expectFreshUsers = isEnabled(process.env.CATALOG_SOURCE_E2E_EXPECT_FRESH_USERS);
const runChannelRoutes = isEnabled(process.env.CATALOG_SOURCE_E2E_CHANNEL_ROUTES);
const restoreState = !isEnabled(process.env.CATALOG_SOURCE_E2E_NO_RESTORE);
const sourceApplication = process.env.CATALOG_SOURCE_E2E_SOURCE_APPLICATION || "catalog-source-e2e-smoke";
const requestTimeoutMs = Number(process.env.CATALOG_SOURCE_E2E_TIMEOUT_MS || 12000);
const skuPrefix = process.env.CATALOG_SOURCE_E2E_SKU_PREFIX || "codex-e2e-resale";
const runId = process.env.CATALOG_SOURCE_E2E_RUN_ID || `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const smokeSku = `${skuPrefix}-${runId}`.slice(0, 96);
const results = [];

let ownerInitialSettings = null;
let viewerInitialSettings = null;
let createdProductId = null;

function trimBase(value) {
  return String(value || "").replace(/\/+$/, "");
}

function isEnabled(value) {
  return value === "1" || value === "true" || value === "yes";
}

function tokenFromEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function bearer(token) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

function record(contract, status, detail = {}) {
  results.push({ contract, status, ...detail });
}

function fail(contract, message, detail = {}) {
  const error = new Error(message);
  error.contract = contract;
  error.detail = detail;
  throw error;
}

function assert(condition, contract, message, detail = {}) {
  if (!condition) {
    fail(contract, message, detail);
  }
}

function responseSummary(response) {
  return {
    statusCode: response.status,
    url: response.url,
    body: summarizeBody(response.body),
  };
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") {
    return body ? String(body).slice(0, 240) : null;
  }
  return {
    success: body.success,
    message: body.message || body.error || body.error?.message || undefined,
    statusCode: body.statusCode,
    dataKeys: body.data && typeof body.data === "object" ? Object.keys(body.data).slice(0, 12) : undefined,
    pagination: body.pagination,
  };
}

async function request(baseUrl, path, options = {}) {
  const url = /^https?:\/\//.test(path) ? path : `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        accept: "application/json",
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...(options.token ? { authorization: bearer(options.token) } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { url, ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function catalog(token, method, path, body) {
  return request(catalogBaseUrl, path, { method, body, token });
}

function dataOf(response) {
  if (response.body && typeof response.body === "object" && Object.prototype.hasOwnProperty.call(response.body, "data")) {
    return response.body.data;
  }
  return response.body;
}

async function expectOk(contract, promise) {
  const response = await promise;
  assert(response.ok, contract, `${contract} returned non-2xx`, responseSummary(response));
  return dataOf(response);
}

async function provisionSettings(label, token) {
  const contract = `catalog-${label}-access-provision`;
  const data = await expectOk(
    contract,
    catalog(token, "POST", "/api/catalog/access/provision", { sourceApplication }),
  );
  assert(data && typeof data === "object", contract, "Provision response did not contain settings data", { data });
  record(contract, "pass", {
    includeAlfaresCatalog: Boolean(data.includeAlfaresCatalog),
    includeCommunityCatalog: Boolean(data.includeCommunityCatalog),
    created: Boolean(data.created),
  });
  return data;
}

async function updateSettings(label, token, settings) {
  const contract = `catalog-${label}-settings-update`;
  const data = await expectOk(contract, catalog(token, "PUT", "/api/catalog/settings", settings));
  record(contract, "pass", {
    includeAlfaresCatalog: Boolean(data.includeAlfaresCatalog),
    includeCommunityCatalog: Boolean(data.includeCommunityCatalog),
  });
  return data;
}

async function getSettings(label, token) {
  const contract = `catalog-${label}-settings-read`;
  const data = await expectOk(contract, catalog(token, "GET", "/api/catalog/settings"));
  record(contract, "pass", {
    includeAlfaresCatalog: Boolean(data.includeAlfaresCatalog),
    includeCommunityCatalog: Boolean(data.includeCommunityCatalog),
  });
  return data;
}

async function createOwnerProduct() {
  const contract = "catalog-owner-create-private-product";
  const data = await expectOk(
    contract,
    catalog(ownerToken, "POST", "/api/products", {
      sku: smokeSku,
      title: `Catalog source E2E resale ${runId}`,
      description: "Synthetic Catalog source E2E product. Safe to archive after smoke.",
      brand: "Codex E2E",
      manufacturer: "Codex",
      isActive: true,
      lifecycle: "active",
      resaleEnabled: false,
      tags: ["codex-e2e", "catalog-source-smoke"],
    }),
  );
  assert(data?.id, contract, "Product create response did not include an id", { data });
  createdProductId = data.id;
  assert(data.resaleEnabled === false, contract, "New owner product did not default to private resale visibility", {
    productId: createdProductId,
    resaleEnabled: data.resaleEnabled,
  });
  record(contract, "pass", { productId: createdProductId, sku: data.sku, resaleEnabled: data.resaleEnabled });
  return data;
}

async function searchProducts(label, token, catalogScope, search) {
  const response = await catalog(
    token,
    "GET",
    `/api/products?catalogScope=${encodeURIComponent(catalogScope)}&search=${encodeURIComponent(search)}&limit=50`,
  );
  const contract = `catalog-${label}-search-${catalogScope}`;
  assert(response.ok, contract, "Product search returned non-2xx", responseSummary(response));
  const items = Array.isArray(response.body?.data) ? response.body.data : [];
  record(contract, "pass", {
    statusCode: response.status,
    total: response.body?.pagination?.total ?? items.length,
    matchedCreatedProduct: Boolean(createdProductId && items.some((item) => item?.id === createdProductId)),
  });
  return items;
}

function containsCreatedProduct(items) {
  return Boolean(createdProductId && items.some((item) => item?.id === createdProductId));
}

async function enableOwnerResale() {
  const contract = "catalog-owner-enable-resale";
  const data = await expectOk(
    contract,
    catalog(ownerToken, "PUT", `/api/products/${encodeURIComponent(createdProductId)}`, { resaleEnabled: true }),
  );
  assert(data?.resaleEnabled === true, contract, "Owner update did not enable resale", {
    productId: createdProductId,
    resaleEnabled: data?.resaleEnabled,
  });
  record(contract, "pass", { productId: createdProductId, resaleEnabled: data.resaleEnabled });
}

async function assertNonOwnerMutationForbidden() {
  const contract = "catalog-viewer-non-owner-mutation-forbidden";
  const response = await catalog(
    viewerToken,
    "PUT",
    `/api/products/${encodeURIComponent(createdProductId)}`,
    { title: `Forbidden viewer edit ${runId}` },
  );
  assert(!response.ok && [403, 404].includes(response.status), contract, "Viewer was able to mutate a non-owned community product", responseSummary(response));
  record(contract, "pass", { statusCode: response.status, productId: createdProductId });
}

async function runCatalogCommunityFlow() {
  ownerInitialSettings = await provisionSettings("owner", ownerToken);
  viewerInitialSettings = await provisionSettings("viewer", viewerToken);

  if (expectFreshUsers) {
    assert(ownerInitialSettings.includeAlfaresCatalog === false && ownerInitialSettings.includeCommunityCatalog === false, "catalog-owner-fresh-defaults", "Owner fresh-user defaults were not fail-closed", ownerInitialSettings);
    assert(viewerInitialSettings.includeAlfaresCatalog === false && viewerInitialSettings.includeCommunityCatalog === false, "catalog-viewer-fresh-defaults", "Viewer fresh-user defaults were not fail-closed", viewerInitialSettings);
    record("catalog-fresh-user-defaults", "pass", { includeAlfaresCatalog: false, includeCommunityCatalog: false });
  } else {
    record("catalog-fresh-user-defaults", "skip", { reason: "Set CATALOG_SOURCE_E2E_EXPECT_FRESH_USERS=true with fresh tokens to assert first-provision defaults." });
  }

  await updateSettings("owner", ownerToken, { includeAlfaresCatalog: false, includeCommunityCatalog: false });
  await updateSettings("viewer", viewerToken, { includeAlfaresCatalog: false, includeCommunityCatalog: false });

  await createOwnerProduct();

  const ownerOwnItems = await searchProducts("owner", ownerToken, "own", smokeSku);
  assert(containsCreatedProduct(ownerOwnItems), "catalog-owner-own-scope-contains-product", "Owner own scope did not include the newly created product", { productId: createdProductId });
  record("catalog-owner-own-scope-contains-product", "pass", { productId: createdProductId });

  const viewerBeforeResale = await searchProducts("viewer", viewerToken, "effective", smokeSku);
  assert(!containsCreatedProduct(viewerBeforeResale), "catalog-viewer-community-disabled-before-resale-hidden", "Viewer saw owner product before resale was enabled", { productId: createdProductId });
  record("catalog-viewer-community-disabled-before-resale-hidden", "pass", { productId: createdProductId });

  await enableOwnerResale();

  const viewerCommunityDisabled = await searchProducts("viewer", viewerToken, "effective", smokeSku);
  assert(!containsCreatedProduct(viewerCommunityDisabled), "catalog-viewer-community-disabled-after-resale-hidden", "Viewer saw community product while community source was disabled", { productId: createdProductId });
  record("catalog-viewer-community-disabled-after-resale-hidden", "pass", { productId: createdProductId });

  await updateSettings("viewer", viewerToken, { includeCommunityCatalog: true });
  const viewerCommunityEnabled = await searchProducts("viewer", viewerToken, "effective", smokeSku);
  assert(containsCreatedProduct(viewerCommunityEnabled), "catalog-viewer-community-enabled-effective-visible", "Viewer did not see resale-enabled owner product after enabling community source", { productId: createdProductId });
  record("catalog-viewer-community-enabled-effective-visible", "pass", { productId: createdProductId });

  await assertNonOwnerMutationForbidden();
}

async function runChannelRouteSmoke() {
  if (!runChannelRoutes) {
    record("channel-route-smoke", "skip", { reason: "Set CATALOG_SOURCE_E2E_CHANNEL_ROUTES=true to read channel effective pickers with the viewer token." });
    return;
  }

  const checks = [
    ["allegro", "/api/products?catalogScope=effective&limit=1"],
    ["aukro", "/aukro/ui/catalog/products?limit=1"],
    ["bazos", "/ui/catalog/products?limit=1"],
    ["heureka", "/api/heureka/dashboard/catalog-products?limit=1&source=effective"],
  ];

  for (const [channel, path] of checks) {
    const base = trimBase(process.env[`CATALOG_SOURCE_E2E_${channel.toUpperCase()}_BASE_URL`] || DEFAULT_CHANNEL_BASES[channel]);
    const contract = `channel-${channel}-effective-picker-route`;
    const response = await request(base, path, { token: viewerToken });
    assert(response.ok, contract, `${channel} effective picker route returned non-2xx`, responseSummary(response));
    record(contract, "pass", { statusCode: response.status, url: response.url });
  }
}

async function cleanup() {
  if (!restoreState) {
    record("cleanup", "skip", { reason: "CATALOG_SOURCE_E2E_NO_RESTORE enabled." });
    return;
  }

  if (createdProductId) {
    try {
      const response = await catalog(ownerToken, "DELETE", `/api/products/${encodeURIComponent(createdProductId)}`);
      record("cleanup-owner-product-archive", response.ok || response.status === 204 ? "pass" : "warn", {
        statusCode: response.status,
        productId: createdProductId,
      });
    } catch (error) {
      record("cleanup-owner-product-archive", "warn", { error: error.message, productId: createdProductId });
    }
  }

  for (const [label, token, initial] of [
    ["owner", ownerToken, ownerInitialSettings],
    ["viewer", viewerToken, viewerInitialSettings],
  ]) {
    if (!token || !initial) continue;
    try {
      const response = await catalog(token, "PUT", "/api/catalog/settings", {
        includeAlfaresCatalog: Boolean(initial.includeAlfaresCatalog),
        includeCommunityCatalog: Boolean(initial.includeCommunityCatalog),
      });
      record(`cleanup-${label}-settings-restore`, response.ok ? "pass" : "warn", { statusCode: response.status });
    } catch (error) {
      record(`cleanup-${label}-settings-restore`, "warn", { error: error.message });
    }
  }
}

function preflight() {
  if (!execute) {
    console.error("[MISSING: set CATALOG_SOURCE_E2E_EXECUTE=true to run mutating Catalog source E2E smoke]");
    console.error("Required env: CATALOG_SOURCE_E2E_OWNER_TOKEN and CATALOG_SOURCE_E2E_VIEWER_TOKEN.");
    console.error("Optional env: CATALOG_SOURCE_E2E_EXPECT_FRESH_USERS=true, CATALOG_SOURCE_E2E_CHANNEL_ROUTES=true.");
    process.exit(2);
  }
  if (!ownerToken || !viewerToken) {
    fail("preflight-auth-tokens", "Both owner and viewer human bearer tokens are required. Do not mint tokens locally; use approved Auth tokens.");
  }
  if (ownerToken === viewerToken) {
    fail("preflight-distinct-users", "Owner and viewer tokens must belong to different Auth users for community visibility checks.");
  }
}

async function main() {
  preflight();
  try {
    await runCatalogCommunityFlow();
    await runChannelRouteSmoke();
  } finally {
    await cleanup();
  }
}

main()
  .then(() => {
    const failed = results.filter((result) => result.status === "fail");
    console.log(JSON.stringify({ ok: failed.length === 0, baseUrl: catalogBaseUrl, runId, sku: smokeSku, productId: createdProductId, results }, null, 2));
    process.exit(failed.length === 0 ? 0 : 1);
  })
  .catch(async (error) => {
    record(error.contract || "catalog-source-e2e-smoke", "fail", {
      message: error.message,
      detail: error.detail,
    });
    console.error(JSON.stringify({ ok: false, baseUrl: catalogBaseUrl, runId, sku: smokeSku, productId: createdProductId, results }, null, 2));
    process.exit(1);
  });
