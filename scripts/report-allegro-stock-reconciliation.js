#!/usr/bin/env node

/**
 * Read-only Allegro/Catalog/Warehouse stock reconciliation report.
 *
 * Runs inside catalog-microservice runtime or any environment with Catalog DB
 * env vars and a Catalog internal token. It does not mutate Catalog,
 * Warehouse, or marketplace state.
 */

const { Client } = require("pg");

const cfg = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

function toFamilyKey(title) {
  const value = String(title || "").replace(/\s+/g, " ").trim();
  const size = value.match(/(\d{2,3})\s*cm/i)?.[1] || "unknown-size";
  if (/Nafukovací kluzák|Snowtubing|Sáně a sáňky/i.test(value)) {
    return `snowtubing:${size}cm`;
  }
  if (/Lenovo|Xiaomi|SONY|MicroSD|Flash/i.test(value)) {
    return `electronics:${value.toLowerCase().replace(/\s+/g, " ").slice(0, 60)}`;
  }
  return `other:${value.toLowerCase().slice(0, 60)}`;
}

function compactTitle(title) {
  return String(title || "").replace(/\s+/g, " ").slice(0, 140);
}

function isOrderHistoryOnly(tags) {
  return Array.isArray(tags) && tags.includes("data-quality:order-line-item-only");
}

function catalogBaseUrl() {
  return (process.env.CATALOG_SERVICE_URL || process.env.CATALOG_BASE_URL || "http://127.0.0.1:3200").replace(/\/$/, "");
}

// Self-pair principal for catalog-microservice -> itself. This script calls
// catalog's own HTTP API, which is still a (caller -> target) pair and needs a
// real principal. No fallback to the shared CATALOG_INTERNAL_SERVICE_TOKEN /
// INTERNAL_SERVICE_TOKEN: that was one static secret held by seven services
// with a self-asserted x-service-name header, the shape
// SERVICE_IDENTITY_CONSUMER_STANDARD.md prohibits.
function catalogToken() {
  return (process.env.CATALOG_SELF_SERVICE_TOKEN || "").trim();
}

async function fetchAvailability(productIds) {
  const token = catalogToken();
  const response = await fetch(`${catalogBaseUrl()}/api/products/availability/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ productIds }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(`Catalog availability request failed with status ${response.status}`);
  }
  return payload.data?.items || payload.items || [];
}

async function loadAllegroCatalogProducts(client) {
  const result = await client.query(`
    select id, sku, title, tags, "isActive", lifecycle
    from products
    where sku like 'ALLEGRO-OFFER-%'
    order by sku
  `);
  return result.rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    offerId: String(row.sku).replace("ALLEGRO-OFFER-", ""),
    title: row.title,
    active: row.isActive,
    lifecycle: row.lifecycle,
    orderHistoryOnly: isOrderHistoryOnly(row.tags),
    familyKey: toFamilyKey(row.title),
  }));
}

function buildReport(products, availabilityItems) {
  const availabilityByProduct = new Map(availabilityItems.map((item) => [item.productId, item]));
  const groups = new Map();
  let currentStockProductCount = 0;
  let orderHistoryOnlyCount = 0;
  let missingWarehouseCount = 0;

  for (const product of products) {
    const availability = availabilityByProduct.get(product.id);
    const quantity = Number(availability?.totalQuantity ?? 0);
    const available = Number(availability?.totalAvailable ?? 0);
    if (product.orderHistoryOnly) orderHistoryOnlyCount += 1;
    if (!product.orderHistoryOnly && available > 0) currentStockProductCount += 1;
    if (available <= 0) missingWarehouseCount += 1;

    const group = groups.get(product.familyKey) || {
      familyKey: product.familyKey,
      productCount: 0,
      currentStockProductCount: 0,
      orderHistoryOnlyCount: 0,
      missingWarehouseCount: 0,
      totalQuantity: 0,
      totalAvailable: 0,
      products: [],
    };
    group.productCount += 1;
    group.currentStockProductCount += !product.orderHistoryOnly && available > 0 ? 1 : 0;
    group.orderHistoryOnlyCount += product.orderHistoryOnly ? 1 : 0;
    group.missingWarehouseCount += available <= 0 ? 1 : 0;
    group.totalQuantity += Number.isFinite(quantity) ? quantity : 0;
    group.totalAvailable += Number.isFinite(available) ? available : 0;
    group.products.push({
      offerId: product.offerId,
      productId: product.id,
      quantity,
      available,
      orderHistoryOnly: product.orderHistoryOnly,
      title: compactTitle(product.title),
    });
    groups.set(product.familyKey, group);
  }

  const sortedGroups = Array.from(groups.values()).sort((left, right) => right.totalAvailable - left.totalAvailable);
  return {
    contract: "catalog-allegro-stock-reconciliation.v1",
    generatedAt: new Date().toISOString(),
    mutatesCatalog: false,
    mutatesWarehouse: false,
    mutatesMarketplace: false,
    productCount: products.length,
    currentStockProductCount,
    orderHistoryOnlyCount,
    missingWarehouseCount,
    near300Groups: sortedGroups.filter((group) => group.totalAvailable >= 250 && group.totalAvailable <= 350),
    groups: sortedGroups,
  };
}

async function main() {
  const client = new Client(cfg);
  await client.connect();
  try {
    const products = await loadAllegroCatalogProducts(client);
    const availability = products.length ? await fetchAvailability(products.map((product) => product.id)) : [];
    console.log(JSON.stringify(buildReport(products, availability), null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    contract: "catalog-allegro-stock-reconciliation.v1",
    status: "failed",
    mutatesCatalog: false,
    mutatesWarehouse: false,
    mutatesMarketplace: false,
    error: error.message,
  }, null, 2));
  process.exit(1);
});
