#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://catalog.alfares.cz";
const baseUrl = (process.env.CATALOG_SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
const configuredProductId = process.env.CATALOG_SMOKE_PRODUCT_ID || "";
const authorizedSmokeEnabled = isEnabled(process.env.CATALOG_SMOKE_AUTHORIZED);
const authorizedBazosSmokeEnabled = isEnabled(process.env.CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED);
const authToken = process.env.CATALOG_SMOKE_AUTH_TOKEN || "";
const internalServiceToken = process.env.CATALOG_SMOKE_INTERNAL_SERVICE_TOKEN || "";
const smokeServiceName = process.env.CATALOG_SMOKE_SERVICE_NAME || "catalog-authorized-smoke";
const bazosIdentityId = process.env.CATALOG_SMOKE_BAZOS_IDENTITY_ID || "";
const bazosCategory = process.env.CATALOG_SMOKE_BAZOS_CATEGORY || "";

const results = [];

function record(contract, status, detail = {}) {
  results.push({ contract, status, ...detail });
}

function isEnabled(value) {
  return value === "1" || value === "true" || value === "yes";
}

function getAuthorizedHeaders() {
  if (authToken) {
    return {
      authorization: authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`,
    };
  }
  if (internalServiceToken) {
    return {
      "x-internal-service-token": internalServiceToken,
      "x-service-name": smokeServiceName,
    };
  }
  return null;
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
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
  return { url, status: response.status, ok: response.ok, body };
}

function assert(condition, contract, message, detail = {}) {
  if (!condition) {
    throw Object.assign(new Error(message), { contract, detail });
  }
}

function firstProductFromList(body) {
  if (!body || !Array.isArray(body.data) || body.data.length === 0) {
    return null;
  }
  return body.data[0];
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
  let productId = configuredProductId;

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
    const response = await request("/api/products?page=1&limit=1");
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
    const response = await request(`/api/products/${encodeURIComponent(productId)}`);
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
    const response = await request(`/api/pricing/product/${encodeURIComponent(productId)}/current`);
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
    const response = await request(`/api/media/product/${encodeURIComponent(productId)}`);
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
      if (!productId) {
        record("authorized-warehouse-availability", "skip", { reason: "No product ID available for authorized Warehouse check." });
        return;
      }
      const response = await request("/api/products/availability/batch", {
        method: "POST",
        headers: authorizedHeaders,
        body: JSON.stringify({ productIds: [productId] }),
      });
      assert(response.ok, "authorized-warehouse-availability", "Authorized Warehouse availability contract did not return 2xx", {
        statusCode: response.status,
        productId,
      });
      assert(response.body?.success === true && Array.isArray(response.body?.data?.items), "authorized-warehouse-availability", "Warehouse availability response did not use the expected envelope", {
        statusCode: response.status,
        productId,
      });
      record("authorized-warehouse-availability", "pass", {
        statusCode: response.status,
        productId,
        itemCount: response.body.data.items.length,
      });
    });

    await check("authorized-flipflop-projection", async () => {
      if (!productId) {
        record("authorized-flipflop-projection", "skip", { reason: "No product ID available for authorized FlipFlop projection check." });
        return;
      }
      const response = await request("/api/products/projections/flipflop/batch", {
        method: "POST",
        headers: authorizedHeaders,
        body: JSON.stringify({ productIds: [productId], includeUnavailable: true }),
      });
      assert(response.ok, "authorized-flipflop-projection", "Authorized FlipFlop projection contract did not return 2xx", {
        statusCode: response.status,
        productId,
      });
      assert(response.body?.success === true && Array.isArray(response.body?.data?.items), "authorized-flipflop-projection", "FlipFlop projection response did not use the expected envelope", {
        statusCode: response.status,
        productId,
      });
      record("authorized-flipflop-projection", "pass", {
        statusCode: response.status,
        productId,
        itemCount: response.body.data.items.length,
      });
    });
  }

  if (!authorizedBazosSmokeEnabled) {
    record("authorized-bazos-draft", "skip", {
      reason: "Set CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED=true with approved Bazos identity/category inputs to run this side-effect-risk check.",
    });
  } else if (!authorizedHeaders) {
    record("authorized-bazos-draft", "skip", { reason: "Authorized Bazos smoke requires an approved auth token or internal service token." });
  } else if (!productId || !bazosIdentityId || !bazosCategory) {
    record("authorized-bazos-draft", "skip", {
      reason: "Authorized Bazos smoke requires CATALOG_SMOKE_PRODUCT_ID or a listed product plus CATALOG_SMOKE_BAZOS_IDENTITY_ID and CATALOG_SMOKE_BAZOS_CATEGORY.",
    });
  } else {
    await check("authorized-bazos-draft", async () => {
      const response = await request(`/api/products/${encodeURIComponent(productId)}/bazos-draft`, {
        method: "POST",
        headers: authorizedHeaders,
        body: JSON.stringify({ identityId: bazosIdentityId, category: bazosCategory }),
      });
      assert(response.ok, "authorized-bazos-draft", "Authorized Bazos draft contract did not return 2xx", {
        statusCode: response.status,
        productId,
      });
      assert(response.body?.success === true && response.body?.data?.authority === "bazos", "authorized-bazos-draft", "Bazos draft response did not preserve Bazos authority", {
        statusCode: response.status,
        productId,
      });
      record("authorized-bazos-draft", "pass", { statusCode: response.status, productId });
    });
  }

  const failed = results.filter((result) => result.status === "fail");
  const summary = {
    baseUrl,
    productId: productId || null,
    passed: results.filter((result) => result.status === "pass").length,
    skipped: results.filter((result) => result.status === "skip").length,
    failed: failed.length,
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
