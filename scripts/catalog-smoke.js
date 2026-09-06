#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://catalog.alfares.cz";
const baseUrl = (process.env.CATALOG_SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
const configuredProductId = process.env.CATALOG_SMOKE_PRODUCT_ID || "";
const configuredProductIds = parseProductIds(process.env.CATALOG_SMOKE_PRODUCT_IDS || configuredProductId);
const authorizedSmokeEnabled = isEnabled(process.env.CATALOG_SMOKE_AUTHORIZED);
const authorizedBazosSmokeEnabled = isEnabled(process.env.CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED);
const authorizedChannelStatusSmokeEnabled = isEnabled(process.env.CATALOG_SMOKE_ENABLE_CHANNEL_STATUS);
const heurekaReadinessSmokeEnabled = isEnabled(process.env.CATALOG_SMOKE_ENABLE_HEUREKA_READINESS);
const stockConsistencySmokeEnabled = isEnabled(process.env.CATALOG_SMOKE_ASSERT_STOCK);
// Only the per-pair principal. The former precedence here --
//   authToken = CATALOG_SMOKE_AUTH_TOKEN || (internalServiceToken ? "" : JWT_TOKEN)
// -- is the exact line that made catalog-contract-monitor fail silently for five
// days: with the shared internal token mounted it forced authToken to "", so the
// bearer was never sent even once a correct principal existed, and JWT_TOKEN was
// a hand-minted HS256 value that /auth/validate rejects outright.
const authToken = process.env.CATALOG_SMOKE_AUTH_TOKEN || "";
const smokeServiceName = process.env.CATALOG_SMOKE_SERVICE_NAME || "catalog-authorized-smoke";
const heurekaBaseUrl = (process.env.CATALOG_SMOKE_HEUREKA_BASE_URL || "https://heureka.alfares.cz").replace(/\/+$/, "");
const heurekaFeedType = process.env.CATALOG_SMOKE_HEUREKA_FEED_TYPE || "heureka_cz";
const bazosProductId = process.env.CATALOG_SMOKE_BAZOS_PRODUCT_ID || "";
const bazosIdentityId = process.env.CATALOG_SMOKE_BAZOS_IDENTITY_ID || "";
const bazosCategory = process.env.CATALOG_SMOKE_BAZOS_CATEGORY || "";
const bazosLocation = process.env.CATALOG_SMOKE_BAZOS_LOCATION || "";
const requestRetries = Number(process.env.CATALOG_SMOKE_RETRIES || 0);
const requestRetryDelayMs = Number(process.env.CATALOG_SMOKE_RETRY_DELAY_MS || 750);
const transientStatusCodes = new Set([502, 503, 504]);

const results = [];
const stockEvidence = {
  warehouseAvailable: null,
  warehouseQuantity: null,
  warehouseReserved: null,
  flipflopStockQuantity: null,
  products: {},
  channelStatuses: {},
  heurekaReadiness: {},
};

function record(contract, status, detail = {}) {
  results.push({ contract, status, ...detail });
}

function isEnabled(value) {
  return value === "1" || value === "true" || value === "yes";
}

function parseProductIds(value) {
  return Array.from(new Set(String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)));
}

function getAuthorizedHeaders() {
  if (authToken) {
    return {
      authorization: authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`,
    };
  }
  // The shared-secret branch that used to live here is gone. It sent one static
  // token held by seven services with a self-asserted x-service-name header --
  // the shape SERVICE_IDENTITY_CONSUMER_STANDARD.md prohibits -- and it was what
  // made this monitor fail silently: catalog-smoke.js PREFERRED it over the
  // bearer, so a correct principal would never have been sent while both were
  // mounted. The contract-monitor CronJob now mounts only the pair principal.
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestReadContract(path) {
  const headers = getAuthorizedHeaders();
  return request(path, headers ? { headers } : {});
}

async function request(path, options = {}) {
  const url = /^https?:\/\//.test(path) ? path : `${baseUrl}${path}`;
  const attempts = Number.isFinite(requestRetries) && requestRetries > 0 ? requestRetries + 1 : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          accept: "application/json",
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...(options.headers || {}),
        },
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
      if (attempt < attempts && transientStatusCodes.has(response.status)) {
        await sleep(requestRetryDelayMs);
        continue;
      }
      return { url, status: response.status, ok: response.ok, body };
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      await sleep(requestRetryDelayMs);
    }
  }

  throw new Error("Request failed without a response");
}

function assert(condition, contract, message, detail = {}) {
  if (!condition) {
    throw Object.assign(new Error(message), { contract, detail });
  }
}

function summarizeChannelStatusPayload(data) {
  if (!data || typeof data !== "object") {
    return {};
  }
  const projection = data.productProjection || {};
  return {
    authority: data.authority || null,
    action: data.action || null,
    success: data.success ?? null,
    blocked: data.blocked ?? null,
    reason: data.reason || null,
    nextAction: data.nextAction || null,
    dependencyStatus: data.dependencyStatus ?? null,
    listingUrl: data.listingUrl || null,
    offerId: data.offerId || data.draft?.offerId || data.draft?.id || null,
    draftStatus: data.draftStatus || data.draft?.publicationStatus || data.draft?.publishStatus || null,
    stockQuantity: projection.stockQuantity ?? projection.warehouse?.totalAvailable ?? null,
    warehouseSource: projection.warehouse?.source || projection.availability?.source || null,
  };
}

function summarizeHeurekaReadinessPayload(data, productId) {
  const items = data?.data?.items || data?.items || [];
  const item = items.find((entry) => entry?.productId === productId) || items[0] || null;
  if (!item) {
    return {
      productId,
      readinessAvailable: null,
      readiness: null,
      blockerCodes: [],
    };
  }
  return {
    productId: item.productId || productId,
    readinessAvailable: numberOrNull(item.availableStock),
    readiness: item.readiness || null,
    blockerCodes: Array.isArray(item.blockers) ? item.blockers.map((blocker) => blocker.code).filter(Boolean) : [],
  };
}

async function checkAuthorizedChannelStatus(channel, path, expectedAuthority, headers, productId) {
  const contract = productId ? `authorized-${channel}-status:${productId}` : `authorized-${channel}-status`;
  await check(contract, async () => {
    if (!productId) {
      record(contract, "skip", { reason: `No product ID available for authorized ${channel} status check.` });
      return;
    }
    const response = await request(path, { headers });
    assert(response.ok, contract, `Authorized ${channel} status endpoint did not return 2xx`, {
      statusCode: response.status,
      productId,
    });
    const data = response.body?.data || response.body;
    assert(data?.authority === expectedAuthority, contract, `${channel} status response did not preserve channel authority`, {
      statusCode: response.status,
      productId,
      authority: data?.authority || null,
    });
    const summary = summarizeChannelStatusPayload(data);
    stockEvidence.channelStatuses[`${channel}:${productId}`] = { productId, channel, ...summary };
    record(contract, "pass", {
      statusCode: response.status,
      productId,
      ...summary,
    });
  });
}

async function checkAuthorizedProductChannelStatuses(productId, headers) {
  await checkAuthorizedChannelStatus("flipflop", `/api/products/${encodeURIComponent(productId)}/flipflop-status`, "flipflop", headers, productId);
  await checkAuthorizedChannelStatus("allegro", `/api/products/${encodeURIComponent(productId)}/allegro-status`, "allegro", headers, productId);
  await checkAuthorizedChannelStatus("bazos", `/api/products/${encodeURIComponent(productId)}/bazos-status`, "bazos", headers, productId);
  await checkAuthorizedChannelStatus("aukro", `/api/products/${encodeURIComponent(productId)}/aukro-status`, "aukro", headers, productId);
}

async function checkHeurekaReadiness(productId) {
  const contract = `authorized-heureka-readiness:${productId}`;
  await check(contract, async () => {
    const response = await request(`${heurekaBaseUrl}/heureka/feed/readiness/products/${encodeURIComponent(productId)}?feedType=${encodeURIComponent(heurekaFeedType)}`);
    assert(response.ok, contract, "Heureka readiness endpoint did not return 2xx", {
      statusCode: response.status,
      productId,
    });
    const summary = summarizeHeurekaReadinessPayload(response.body, productId);
    assert(summary.productId === productId, contract, "Heureka readiness returned a different product ID", {
      statusCode: response.status,
      productId,
      returnedProductId: summary.productId,
    });
    stockEvidence.heurekaReadiness[productId] = summary;
    record(contract, "pass", {
      statusCode: response.status,
      feedType: heurekaFeedType,
      ...summary,
    });
  });
}

function firstProductFromList(body) {
  if (!body || !Array.isArray(body.data) || body.data.length === 0) {
    return null;
  }
  return body.data[0];
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstAvailabilityItem(body, productId) {
  const items = Array.isArray(body?.data?.items) ? body.data.items : [];
  return items.find((item) => item?.productId === productId) || items[0] || null;
}

function firstProjectionItem(body, productId) {
  const items = Array.isArray(body?.data?.items) ? body.data.items : [];
  return items.find((item) => item?.id === productId || item?.productId === productId) || items[0] || null;
}

function stockQuantitiesMatch(left, right) {
  return numberOrNull(left) !== null && numberOrNull(left) === numberOrNull(right);
}

function productIdsForAuthorizedChecks(productId) {
  if (configuredProductIds.length > 0) {
    return configuredProductIds;
  }
  return productId ? [productId] : [];
}

function ensureProductEvidence(productId) {
  if (!stockEvidence.products[productId]) {
    stockEvidence.products[productId] = {
      warehouseAvailable: null,
      warehouseQuantity: null,
      warehouseReserved: null,
      flipflopStockQuantity: null,
      warehouseSource: null,
    };
  }
  return stockEvidence.products[productId];
}

async function check(contract, fn) {
  try {
    await fn();
  } catch (error) {
    record(contract, "fail", {
      message: error.message,
      ...(error.detail || {}),
    });
  }
}

async function main() {
  let productId = configuredProductIds[0] || configuredProductId;

  await check("health", async () => {
    const response = await request("/health");
    assert(response.ok, "health", "Health endpoint did not return 2xx", { statusCode: response.status });
    assert(response.body?.status === "healthy", "health", "Health response status is not healthy", {
      statusCode: response.status,
      bodyStatus: response.body?.status,
    });
    record("health", "pass", { statusCode: response.status, service: response.body?.service || null });
  });

  await check("product-search", async () => {
    const response = await requestReadContract("/api/products?page=1&limit=1");
    assert(response.ok, "product-search", "Product search did not return 2xx", { statusCode: response.status });
    assert(Array.isArray(response.body?.data), "product-search", "Product search data is not an array", {
      statusCode: response.status,
    });
    const firstProduct = firstProductFromList(response.body);
    if (!productId && firstProduct?.id) {
      productId = firstProduct.id;
    }
    record("product-search", "pass", {
      statusCode: response.status,
      resultCount: response.body.data.length,
      selectedProductId: productId || null,
    });
  });

  await check("product-detail", async () => {
    if (!productId) {
      record("product-detail", "skip", { reason: "No product ID supplied and product search returned no rows." });
      return;
    }
    const response = await requestReadContract(`/api/products/${encodeURIComponent(productId)}`);
    assert(response.ok, "product-detail", "Product detail did not return 2xx", { statusCode: response.status, productId });
    assert(response.body?.data?.id === productId, "product-detail", "Product detail returned a different product ID", {
      statusCode: response.status,
      productId,
      returnedId: response.body?.data?.id,
    });
    record("product-detail", "pass", { statusCode: response.status, productId });
  });

  await check("pricing-current", async () => {
    if (!productId) {
      record("pricing-current", "skip", { reason: "No product ID available for pricing check." });
      return;
    }
    const response = await requestReadContract(`/api/pricing/product/${encodeURIComponent(productId)}/current`);
    assert(response.ok, "pricing-current", "Current pricing endpoint did not return 2xx", { statusCode: response.status, productId });
    assert(response.body?.success === true, "pricing-current", "Current pricing response did not use success envelope", {
      statusCode: response.status,
      productId,
    });
    record("pricing-current", "pass", {
      statusCode: response.status,
      productId,
      hasCurrentPrice: Boolean(response.body?.data),
    });
  });

  await check("media-by-product", async () => {
    if (!productId) {
      record("media-by-product", "skip", { reason: "No product ID available for media check." });
      return;
    }
    const response = await requestReadContract(`/api/media/product/${encodeURIComponent(productId)}`);
    assert(response.ok, "media-by-product", "Product media endpoint did not return 2xx", { statusCode: response.status, productId });
    assert(Array.isArray(response.body?.data), "media-by-product", "Product media data is not an array", {
      statusCode: response.status,
      productId,
    });
    record("media-by-product", "pass", {
      statusCode: response.status,
      productId,
      mediaCount: response.body.data.length,
    });
  });

  await check("protected-mutation-rejection", async () => {
    const response = await request("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "codex-smoke-unauthorized", slug: "codex-smoke-unauthorized" }),
    });
    assert(response.status === 401, "protected-mutation-rejection", "Anonymous category mutation was not rejected with 401", {
      statusCode: response.status,
    });
    record("protected-mutation-rejection", "pass", { statusCode: response.status });
  });

  await check("warehouse-contract-protection", async () => {
    const response = await request("/api/products/availability/batch", {
      method: "POST",
      body: JSON.stringify({ productIds: ["00000000-0000-4000-8000-000000000000"] }),
    });
    assert(response.status === 401, "warehouse-contract-protection", "Anonymous availability contract was not rejected with 401", {
      statusCode: response.status,
    });
    record("warehouse-contract-protection", "pass", { statusCode: response.status });
  });

  await check("flipflop-contract-protection", async () => {
    const response = await request("/api/products/projections/flipflop/batch", {
      method: "POST",
      body: JSON.stringify({ productIds: ["00000000-0000-4000-8000-000000000000"] }),
    });
    assert(response.status === 401, "flipflop-contract-protection", "Anonymous FlipFlop projection contract was not rejected with 401", {
      statusCode: response.status,
    });
    record("flipflop-contract-protection", "pass", { statusCode: response.status });
  });

  if (productId) {
    await check("bazos-contract-protection", async () => {
      const response = await request(`/api/products/${encodeURIComponent(productId)}/bazos-draft`, {
        method: "POST",
        body: JSON.stringify({ dryRun: true }),
      });
      assert(response.status === 401, "bazos-contract-protection", "Anonymous Bazos draft contract was not rejected with 401", {
        statusCode: response.status,
        productId,
      });
      record("bazos-contract-protection", "pass", { statusCode: response.status, productId });
    });
  } else {
    record("bazos-contract-protection", "skip", { reason: "No product ID available for Bazos route check." });
  }

  const authorizedHeaders = getAuthorizedHeaders();
  if (!authorizedSmokeEnabled) {
    record("authorized-runtime-contracts", "skip", { reason: "Set CATALOG_SMOKE_AUTHORIZED=true to run authorized runtime contract checks." });
  } else if (!authorizedHeaders) {
    record("authorized-runtime-contracts", "skip", {
      reason: "Set CATALOG_SMOKE_AUTH_TOKEN or CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN to run authorized checks.",
    });
  } else {
    await check("authorized-warehouse-availability", async () => {
      const productIds = productIdsForAuthorizedChecks(productId);
      if (productIds.length === 0) {
        record("authorized-warehouse-availability", "skip", { reason: "No product ID available for authorized Warehouse check." });
        return;
      }
      const response = await request("/api/products/availability/batch", {
        method: "POST",
        headers: authorizedHeaders,
        body: JSON.stringify({ productIds }),
      });
      assert(response.ok, "authorized-warehouse-availability", "Authorized Warehouse availability contract did not return 2xx", {
        statusCode: response.status,
        productIds,
      });
      assert(response.body?.success === true && Array.isArray(response.body?.data?.items), "authorized-warehouse-availability", "Warehouse availability response did not use the expected envelope", {
        statusCode: response.status,
        productIds,
      });
      const item = firstAvailabilityItem(response.body, productId);
      stockEvidence.warehouseAvailable = numberOrNull(item?.totalAvailable);
      stockEvidence.warehouseQuantity = numberOrNull(item?.totalQuantity);
      stockEvidence.warehouseReserved = numberOrNull(item?.totalReserved);
      for (const availabilityItem of response.body.data.items) {
        if (!availabilityItem?.productId) continue;
        const evidence = ensureProductEvidence(availabilityItem.productId);
        evidence.warehouseAvailable = numberOrNull(availabilityItem.totalAvailable);
        evidence.warehouseQuantity = numberOrNull(availabilityItem.totalQuantity);
        evidence.warehouseReserved = numberOrNull(availabilityItem.totalReserved);
      }
      record("authorized-warehouse-availability", "pass", {
        statusCode: response.status,
        productId,
        productIds,
        itemCount: response.body.data.items.length,
        totalQuantity: stockEvidence.warehouseQuantity,
        totalReserved: stockEvidence.warehouseReserved,
        totalAvailable: stockEvidence.warehouseAvailable,
      });
    });

    await check("authorized-flipflop-projection", async () => {
      const productIds = productIdsForAuthorizedChecks(productId);
      if (productIds.length === 0) {
        record("authorized-flipflop-projection", "skip", { reason: "No product ID available for authorized FlipFlop projection check." });
        return;
      }
      const response = await request("/api/products/projections/flipflop/batch", {
        method: "POST",
        headers: authorizedHeaders,
        body: JSON.stringify({ productIds, includeUnavailable: true }),
      });
      assert(response.ok, "authorized-flipflop-projection", "Authorized FlipFlop projection contract did not return 2xx", {
        statusCode: response.status,
        productIds,
      });
      assert(response.body?.success === true && Array.isArray(response.body?.data?.items), "authorized-flipflop-projection", "FlipFlop projection response did not use the expected envelope", {
        statusCode: response.status,
        productIds,
      });
      const item = firstProjectionItem(response.body, productId);
      stockEvidence.flipflopStockQuantity = numberOrNull(item?.stockQuantity ?? item?.warehouse?.totalAvailable ?? item?.availability?.totalAvailable);
      for (const projectionItem of response.body.data.items) {
        const projectionProductId = projectionItem?.id || projectionItem?.productId;
        if (!projectionProductId) continue;
        const evidence = ensureProductEvidence(projectionProductId);
        evidence.flipflopStockQuantity = numberOrNull(projectionItem?.stockQuantity ?? projectionItem?.warehouse?.totalAvailable ?? projectionItem?.availability?.totalAvailable);
        evidence.warehouseSource = projectionItem?.warehouse?.source || projectionItem?.availability?.source || null;
      }
      record("authorized-flipflop-projection", "pass", {
        statusCode: response.status,
        productId,
        productIds,
        itemCount: response.body.data.items.length,
        stockQuantity: stockEvidence.flipflopStockQuantity,
        warehouseSource: item?.warehouse?.source || item?.availability?.source || null,
      });
    });

    if (!authorizedChannelStatusSmokeEnabled) {
      record("authorized-channel-status", "skip", { reason: "Set CATALOG_SMOKE_ENABLE_CHANNEL_STATUS=true to run read-only channel status checks." });
    } else {
      for (const statusProductId of productIdsForAuthorizedChecks(productId)) {
        await checkAuthorizedProductChannelStatuses(statusProductId, authorizedHeaders);
      }
      await checkAuthorizedChannelStatus("bazos-account", "/api/products/bazos/account-status", "bazos", authorizedHeaders, productId);
      await checkAuthorizedChannelStatus("aukro-account", "/api/products/aukro/account-status", "aukro", authorizedHeaders, productId);
    }

    if (!heurekaReadinessSmokeEnabled) {
      record("authorized-heureka-readiness", "skip", { reason: "Set CATALOG_SMOKE_ENABLE_HEUREKA_READINESS=true to run read-only Heureka readiness checks." });
    } else {
      for (const heurekaProductId of productIdsForAuthorizedChecks(productId)) {
        await checkHeurekaReadiness(heurekaProductId);
      }
    }

    if (!stockConsistencySmokeEnabled) {
      record("authorized-stock-consistency", "skip", { reason: "Set CATALOG_SMOKE_ASSERT_STOCK=true to compare Warehouse and channel stock quantities." });
    } else {
      await check("authorized-stock-consistency", async () => {
        assert(stockEvidence.warehouseAvailable !== null, "authorized-stock-consistency", "Warehouse availability did not expose totalAvailable", {
          productId,
          stockEvidence,
        });
        assert(stockQuantitiesMatch(stockEvidence.warehouseAvailable, stockEvidence.flipflopStockQuantity), "authorized-stock-consistency", "FlipFlop stock projection does not match Warehouse totalAvailable", {
          productId,
          warehouseAvailable: stockEvidence.warehouseAvailable,
          flipflopStockQuantity: stockEvidence.flipflopStockQuantity,
        });

        const mismatchedChannels = Object.entries(stockEvidence.channelStatuses)
          .filter(([, summary]) => summary.stockQuantity !== null && summary.stockQuantity !== undefined)
          .filter(([, summary]) => {
            const productEvidence = summary.productId ? stockEvidence.products[summary.productId] : null;
            const warehouseAvailable = productEvidence?.warehouseAvailable ?? stockEvidence.warehouseAvailable;
            return !stockQuantitiesMatch(warehouseAvailable, summary.stockQuantity);
          })
          .map(([key, summary]) => ({
            key,
            channel: summary.channel,
            productId: summary.productId,
            warehouseAvailable: (summary.productId ? stockEvidence.products[summary.productId]?.warehouseAvailable : stockEvidence.warehouseAvailable) ?? null,
            stockQuantity: summary.stockQuantity,
          }));
        assert(mismatchedChannels.length === 0, "authorized-stock-consistency", "A channel status reported stock different from Warehouse totalAvailable", {
          productId,
          warehouseAvailable: stockEvidence.warehouseAvailable,
          mismatchedChannels,
        });

        const productStockMismatches = Object.entries(stockEvidence.products)
          .filter(([, evidence]) => evidence.warehouseAvailable !== null || evidence.flipflopStockQuantity !== null)
          .filter(([, evidence]) => !stockQuantitiesMatch(evidence.warehouseAvailable, evidence.flipflopStockQuantity))
          .map(([checkedProductId, evidence]) => ({
            productId: checkedProductId,
            warehouseAvailable: evidence.warehouseAvailable,
            flipflopStockQuantity: evidence.flipflopStockQuantity,
          }));
        assert(productStockMismatches.length === 0, "authorized-stock-consistency", "One or more FlipFlop product projections do not match Warehouse totalAvailable", {
          productId,
          productStockMismatches,
          checkedProductCount: Object.keys(stockEvidence.products).length,
        });

        const heurekaStockMismatches = Object.entries(stockEvidence.heurekaReadiness)
          .filter(([, readiness]) => readiness.readinessAvailable !== null && readiness.readinessAvailable !== undefined)
          .filter(([checkedProductId, readiness]) => {
            const evidence = stockEvidence.products[checkedProductId];
            return !stockQuantitiesMatch(evidence?.warehouseAvailable, readiness.readinessAvailable);
          })
          .map(([checkedProductId, readiness]) => ({
            productId: checkedProductId,
            warehouseAvailable: stockEvidence.products[checkedProductId]?.warehouseAvailable ?? null,
            heurekaAvailableStock: readiness.readinessAvailable,
            readiness: readiness.readiness,
            blockerCodes: readiness.blockerCodes,
          }));
        assert(heurekaStockMismatches.length === 0, "authorized-stock-consistency", "Heureka readiness stock does not match Warehouse totalAvailable", {
          productId,
          heurekaStockMismatches,
          checkedHeurekaReadiness: Object.keys(stockEvidence.heurekaReadiness).length,
        });

        const positiveWarehouseHeurekaStockBlockers = Object.entries(stockEvidence.heurekaReadiness)
          .filter(([checkedProductId]) => Number(stockEvidence.products[checkedProductId]?.warehouseAvailable) > 0)
          .filter(([, readiness]) => readiness.blockerCodes.includes("STOCK_UNKNOWN") || readiness.blockerCodes.includes("ZERO_STOCK"))
          .map(([checkedProductId, readiness]) => ({
            productId: checkedProductId,
            warehouseAvailable: stockEvidence.products[checkedProductId]?.warehouseAvailable ?? null,
            blockerCodes: readiness.blockerCodes,
          }));
        assert(positiveWarehouseHeurekaStockBlockers.length === 0, "authorized-stock-consistency", "Heureka readiness reports stock blockers for products with positive Warehouse availability", {
          productId,
          positiveWarehouseHeurekaStockBlockers,
        });

        record("authorized-stock-consistency", "pass", {
          productId,
          warehouseAvailable: stockEvidence.warehouseAvailable,
          flipflopStockQuantity: stockEvidence.flipflopStockQuantity,
          checkedProductCount: Object.keys(stockEvidence.products).length,
          checkedChannelStatuses: Object.keys(stockEvidence.channelStatuses).length,
          checkedHeurekaReadiness: Object.keys(stockEvidence.heurekaReadiness).length,
        });
      });
    }
  }

  if (!authorizedBazosSmokeEnabled) {
    record("authorized-bazos-draft", "skip", {
      reason: "Set CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED=true with approved Bazos identity/category inputs to run this side-effect-risk check.",
    });
  } else if (!authorizedHeaders) {
    record("authorized-bazos-draft", "skip", { reason: "Authorized Bazos smoke requires an approved auth token or internal service token." });
  } else if (!bazosProductId || !bazosIdentityId || !bazosCategory) {
    record("authorized-bazos-draft", "skip", {
      reason: "Authorized Bazos smoke requires explicit CATALOG_SMOKE_BAZOS_PRODUCT_ID plus CATALOG_SMOKE_BAZOS_IDENTITY_ID and CATALOG_SMOKE_BAZOS_CATEGORY.",
    });
  } else {
    await check("authorized-bazos-draft", async () => {
      const response = await request(`/api/products/${encodeURIComponent(bazosProductId)}/bazos-draft`, {
        method: "POST",
        headers: authorizedHeaders,
        body: JSON.stringify({
          identityId: bazosIdentityId,
          category: bazosCategory,
          ...(bazosLocation ? { location: bazosLocation } : {}),
        }),
      });
      assert(response.ok, "authorized-bazos-draft", "Authorized Bazos draft contract did not return 2xx", {
        statusCode: response.status,
        productId: bazosProductId,
      });
      const data = response.body?.data;
      assert(response.body?.success === true && data?.authority === "bazos", "authorized-bazos-draft", "Bazos draft response did not preserve Bazos authority", {
        statusCode: response.status,
        productId: bazosProductId,
      });
      assert(data?.policyAuthority === "bazos" && data?.publishAuthority === "bazos", "authorized-bazos-draft", "Bazos draft response did not preserve policy/publish authority", {
        statusCode: response.status,
        productId: bazosProductId,
      });
      assert(data?.draft?.id && data?.draft?.identityId === bazosIdentityId, "authorized-bazos-draft", "Bazos draft response did not include the expected draft identity", {
        statusCode: response.status,
        productId: bazosProductId,
      });
      assert(typeof data?.requiresConfirmation === "boolean" && typeof data?.canQueueAfterConfirmation === "boolean", "authorized-bazos-draft", "Bazos draft response did not expose confirmation flags", {
        statusCode: response.status,
        productId: bazosProductId,
      });
      record("authorized-bazos-draft", "pass", {
        statusCode: response.status,
        productId: bazosProductId,
        draftStatus: data.draft.publishStatus || null,
        policyAllowed: Boolean(data.policyStatus?.allowed),
        requiresConfirmation: data.requiresConfirmation,
        canQueueAfterConfirmation: data.canQueueAfterConfirmation,
        requiresHumanAction: Boolean(data.requiresHumanAction?.required),
        nextAction: data.nextAction || null,
      });
    });
  }

  const failed = results.filter((result) => result.status === "fail");
  const summary = {
    baseUrl,
    productId: productId || null,
    passed: results.filter((result) => result.status === "pass").length,
    skipped: results.filter((result) => result.status === "skip").length,
    failed: failed.length,
    stockEvidence: stockConsistencySmokeEnabled ? stockEvidence : undefined,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    baseUrl,
    failed: 1,
    results: [{
      contract: error.contract || "catalog-smoke-runner",
      status: "fail",
      message: error.message,
      ...(error.detail || {}),
    }],
  }, null, 2));
  process.exit(1);
});
