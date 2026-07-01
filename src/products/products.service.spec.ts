import axios from "axios";
import { ProductsService } from "./products.service";
import { Product } from "./product.entity";

jest.mock("axios");

describe("ProductsService product readiness", () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults created products to active lifecycle while preserving isActive compatibility", async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: "product-1", ...data })),
    };
    const service = new ProductsService(repository as any, logger as any);

    const product = await service.create({ sku: "SKU-001", title: "Test product" });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      sku: "SKU-001",
      lifecycle: "active",
      isActive: true,
    }));
    expect(product.lifecycle).toBe("active");
    expect(product.isActive).toBe(true);
  });

  it("normalizes legacy HTML descriptions into plain text and canonical JSON fallback", async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: "product-html", ...data })),
    };
    const service = new ProductsService(repository as any, logger as any);

    await service.create({
      sku: "SKU-HTML",
      title: "HTML product",
      description: "<p>Strong &amp; clean</p><ul><li>Size M</li></ul>",
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      description: "Strong & clean\nSize M",
      descriptionRich: expect.objectContaining({
        version: 1,
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: "paragraph", text: "Strong & clean\nSize M" }),
        ]),
      }),
    }));
  });

  it("returns blocking and warning diagnostics for incomplete products", async () => {
    const product = {
      id: "product-2",
      sku: "SKU-002",
      title: "Incomplete product",
      isActive: true,
      lifecycle: "active",
      ean: null,
      description: "",
      categories: [],
      media: [],
      pricing: [],
    } as unknown as Product;
    const repository = {
      findOne: jest.fn(async () => product),
      count: jest.fn(async () => 1),
    };
    const service = new ProductsService(repository as any, logger as any);

    const readiness = await service.getReadiness("product-2");

    expect(readiness.productId).toBe("product-2");
    expect(readiness.lifecycle).toBe("active");
    expect(readiness.sellable).toBe(false);
    expect(readiness.publishable).toBe(false);
    expect(readiness.checks).toMatchObject({
      hasEan: false,
      hasMedia: false,
      hasCurrentPrice: false,
      hasCategory: false,
      hasDescription: false,
    });
    expect(readiness.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "missing_ean",
      "missing_description",
      "missing_category",
      "missing_media",
      "missing_current_price",
    ]));
  });


});


describe("ProductsService Bazos draft action", () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const readyProduct = {
    id: "11111111-1111-4111-8111-111111111111",
    sku: "SKU-BAZOS-001",
    title: "Bazos draft product",
    description: "Synthetic description.",
    isActive: true,
    lifecycle: "active",
    categories: [{ id: "category-1", name: "elektro" }],
    media: [{ url: "https://cdn.example.test/product.png" }],
    pricing: [],
  } as unknown as Product;

  it("requests Bazos draft preparation without calling publish or queue endpoints directly", async () => {
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ productId: readyProduct.id, basePrice: 1000, salePrice: 900, currency: "CZK" })),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        action: "sell_on_bazos",
        productId: readyProduct.id,
        draft: { id: "draft-1", productId: readyProduct.id, publishStatus: "draft" },
        policyStatus: { allowed: false, failures: [{ gate: "public_duplicate_check_missing" }] },
        requiresConfirmation: true,
        canQueueAfterConfirmation: false,
        requiresHumanAction: { required: true, reason: "public_duplicate_check_missing", policyFailures: [] },
        nextAction: "resolve_policy_failures",
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any, pricingService as any);

    const result = await service.requestBazosDraft(readyProduct.id, {
      identityId: "22222222-2222-4222-8222-222222222222",
      category: "elektro",
      location: "Praha",
    }, "Bearer user-token");

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post.mock.calls[0][0]).toBe("http://bazos-service:3000/api/bazos/catalog/products/11111111-1111-4111-8111-111111111111/sell-action");
    expect(JSON.stringify(mockedAxios.post.mock.calls)).not.toContain("enqueue-publish");
    expect(JSON.stringify(mockedAxios.post.mock.calls)).not.toContain("/offers");
    expect(result).toMatchObject({
      success: true,
      action: "create_bazos_draft",
      authority: "bazos",
      policyAuthority: "bazos",
      publishAuthority: "bazos",
      requiresConfirmation: true,
      canQueueAfterConfirmation: false,
      nextAction: "resolve_policy_failures",
    });
    expect((result as any).policyStatus.failures[0].gate).toBe("public_duplicate_check_missing");
  });


  it('reads Bazos listing status and preserves the published listing URL', async () => {
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        action: 'sell_on_bazos',
        productId: readyProduct.id,
        publishedOnBasus: true,
        listingUrl: 'https://www.bazos.cz/inzerat/123456789/',
        draft: {
          id: '33333333-3333-4333-8333-333333333333',
          productId: readyProduct.id,
          publishStatus: 'published',
          bazosAdId: '123456789',
          publishedOnBasus: true,
          listingUrl: 'https://www.bazos.cz/inzerat/123456789/',
        },
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.getBazosStatus(readyProduct.id, 'Bearer user-token');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://bazos-service:3000/api/bazos/catalog/products/11111111-1111-4111-8111-111111111111/sell-action/status',
      { headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' } },
    );
    expect(result).toMatchObject({
      success: true,
      action: 'read_bazos_listing_status',
      publishedOnBasus: true,
      listingUrl: 'https://www.bazos.cz/inzerat/123456789/',
      nextAction: 'view_bazos_listing',
    });
  });

  it("blocks draft requests locally when Bazos identity is missing", async () => {
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ productId: readyProduct.id, basePrice: 1000, currency: "CZK" })),
    };
    const service = new ProductsService(repository as any, logger as any, pricingService as any);

    const result = await service.requestBazosDraft(readyProduct.id, { category: "elektro" }, "Bearer user-token");

    expect((axios as jest.Mocked<typeof axios>).post).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: false,
      reason: "identity_required",
      authority: "bazos",
      policyAuthority: "bazos",
      publishAuthority: "bazos",
      requiresHumanAction: { required: true, reason: "identity_required" },
    });
  });




  it("uses the caller token for user-owned Bazos listing status checks", async () => {
    const previousToken = process.env.BAZOS_SERVICE_TOKEN;
    process.env.BAZOS_SERVICE_TOKEN = "invalid-service-token";
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        action: "sell_on_bazos",
        productId: readyProduct.id,
        draft: { id: "draft-user-1", productId: readyProduct.id, publishStatus: "draft" },
        identity: { id: "33333333-3333-4333-8333-333333333333" },
        requiresHumanAction: { required: false, reason: null },
        nextAction: "confirm_publish",
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    await service.getBazosStatus(readyProduct.id, "Bearer current-user-token");

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://bazos-service:3000/api/bazos/catalog/products/11111111-1111-4111-8111-111111111111/sell-action/status",
      { headers: { Authorization: "Bearer current-user-token", "Content-Type": "application/json" } },
    );

    if (previousToken === undefined) {
      delete process.env.BAZOS_SERVICE_TOKEN;
    } else {
      process.env.BAZOS_SERVICE_TOKEN = previousToken;
    }
  });

  it("reports the current user's Bazos account readiness from Bazos identities", async () => {
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          displayName: "Verified seller",
          defaultLocation: "Praha",
          status: "verified",
          reviewState: "clear",
          sessionState: "active",
          activeAdCount: 3,
        },
      ],
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    const status = await service.getBazosAccountStatus("Bearer current-user-token");

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://bazos-service:3000/api/bazos/identities",
      { headers: { Authorization: "Bearer current-user-token", "Content-Type": "application/json" } },
    );
    expect(status).toMatchObject({
      connected: true,
      active: true,
      canSell: true,
      authority: "bazos",
      selectedIdentity: {
        id: "33333333-3333-4333-8333-333333333333",
        canSell: true,
        blockingReasons: [],
      },
      nextAction: "create_bazos_draft",
    });
  });

  it("uses the caller token for user-owned Bazos identity draft requests when requested", async () => {
    const previousToken = process.env.BAZOS_SERVICE_TOKEN;
    process.env.BAZOS_SERVICE_TOKEN = "service-smoke-token";
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ productId: readyProduct.id, basePrice: 1000, currency: "CZK" })),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        action: "sell_on_bazos",
        productId: readyProduct.id,
        draft: { id: "draft-user-1", productId: readyProduct.id, publishStatus: "draft" },
        identity: { id: "33333333-3333-4333-8333-333333333333", status: "verified" },
        policyStatus: { allowed: true, failures: [] },
        requiresConfirmation: true,
        canQueueAfterConfirmation: true,
        requiresHumanAction: { required: false, reason: null, policyFailures: [] },
        nextAction: "confirm_publish",
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any, pricingService as any);

    const result = await service.requestBazosDraft(readyProduct.id, {
      identityId: "33333333-3333-4333-8333-333333333333",
      category: "elektro",
      useCallerBazosIdentity: true,
    }, "Bearer current-user-token");

    expect(mockedAxios.post.mock.calls[0][2]).toMatchObject({
      headers: { Authorization: "Bearer current-user-token" },
    });
    expect(result).toMatchObject({
      success: true,
      canQueueAfterConfirmation: true,
      nextAction: "confirm_publish",
    });

    if (previousToken === undefined) {
      delete process.env.BAZOS_SERVICE_TOKEN;
    } else {
      process.env.BAZOS_SERVICE_TOKEN = previousToken;
    }
  });
});

describe("ProductsService FlipFlop status action", () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  const product = {
    id: "884c1c5e-fe94-46c7-aab1-78bcc424e7ee",
    sku: "SKU-FLIPFLOP-001",
    title: "Warehouse backed FlipFlop product",
    description: "Synthetic description.",
    isActive: true,
    lifecycle: "active",
    categories: [{ id: "category-1", name: "winter" }],
    media: [{ url: "https://cdn.example.test/product.png" }],
    pricing: [],
  } as unknown as Product;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CATALOG_SERVICE_URL;
    delete process.env.CATALOG_BASE_URL;
    delete process.env.CATALOG_INTERNAL_SERVICE_TOKEN;
    delete process.env.INTERNAL_SERVICE_TOKEN;
  });

  it("uses the native FlipFlop bulk publish lifecycle endpoint", async () => {
    process.env.FLIPFLOP_PRODUCT_SERVICE_URL = "http://flipflop-product-service:3002";
    const repository = {
      findOne: jest.fn(async () => product),
      count: jest.fn(async () => 1),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          results: [{
            catalogProductId: product.id,
            productId: product.id,
            action: "publish_flipflop_listing",
            authority: "flipflop",
            status: "published",
            success: true,
            blocked: false,
            listingUrl: `https://flipflop.alfares.cz/products/${product.id}`,
            flipflopProductId: "flipflop-product-1",
            availableStock: 60,
            nextAction: "view_flipflop_listing",
          }],
        },
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.prepareFlipFlopSale(product.id, "Bearer user-token");

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "http://flipflop-product-service:3002/products/publish/bulk",
      expect.objectContaining({
        productIds: [product.id],
        requestedBy: "catalog-marketplace-publication",
      }),
      {
        headers: {
          Authorization: "Bearer user-token",
          "Content-Type": "application/json",
        },
      },
    );
    expect(result).toMatchObject({
      success: true,
      authority: "flipflop",
      action: "publish_flipflop_listing",
      status: "published",
      flipflopProductId: "flipflop-product-1",
      availableStock: 60,
    });
  });

  it("returns blocked FlipFlop lifecycle responses from the native endpoint", async () => {
    process.env.FLIPFLOP_PRODUCT_SERVICE_URL = "http://flipflop-product-service:3002";
    const repository = {
      findOne: jest.fn(async () => product),
      count: jest.fn(async () => 1),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          results: [{
            catalogProductId: product.id,
            productId: product.id,
            action: "publish_flipflop_listing",
            authority: "flipflop",
            status: "blocked",
            success: false,
            blocked: true,
            reason: "warehouse_stock_unavailable",
            message: "Warehouse has no sellable stock for this product.",
            nextAction: "resolve_flipflop_requirements",
          }],
        },
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.prepareFlipFlopSale(product.id, "Bearer user-token");

    expect(result).toMatchObject({
      success: false,
      blocked: true,
      reason: "warehouse_stock_unavailable",
      authority: "flipflop",
      status: "blocked",
    });
  });
});

describe("ProductsService Allegro stock preflight", () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };
  const product = {
    id: "884c1c5e-fe94-46c7-aab1-78bcc424e7ee",
    sku: "ALLEGRO-OFFER-18106496345",
    title: "Warehouse backed Allegro product",
    description: "Synthetic description.",
    isActive: true,
    lifecycle: "active",
    categories: [{ id: "category-1", name: "winter" }],
    media: [{ url: "https://cdn.example.test/product.png" }],
    pricing: [],
  } as unknown as Product;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CATALOG_SERVICE_URL;
    delete process.env.CATALOG_INTERNAL_SERVICE_TOKEN;
    delete process.env.ALLEGRO_SERVICE_URL;
  });

  it("blocks Allegro preparation when Warehouse availability is missing", async () => {
    process.env.CATALOG_SERVICE_URL = "http://catalog-microservice:3200";
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = "catalog-internal-token";
    const repository = {
      findOne: jest.fn(async () => product),
      count: jest.fn(async () => 1),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ productId: product.id, basePrice: 1000, currency: "CZK" })),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [{
            id: product.id,
            productId: product.id,
            stockQuantity: 0,
            availability: { source: "warehouse", totalAvailable: 0, warehouses: [] },
          }],
        },
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any, pricingService as any);

    const result = await service.prepareAllegroSale(product.id, {}, "Bearer user-token");

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post.mock.calls[0][0]).toBe("http://catalog-microservice:3200/api/products/projections/flipflop/batch");
    expect(JSON.stringify(mockedAxios.post.mock.calls)).not.toContain("/allegro/catalog-sell/prepare");
    expect(result).toMatchObject({
      success: false,
      blocked: true,
      reason: "warehouse_stock_unavailable",
      authority: "allegro",
    });
  });

  it("caps Allegro requested quantity to Warehouse sellable stock", async () => {
    process.env.CATALOG_SERVICE_URL = "http://catalog-microservice:3200";
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = "catalog-internal-token";
    process.env.ALLEGRO_SERVICE_URL = "http://allegro-service:3000";
    const repository = {
      findOne: jest.fn(async () => product),
      count: jest.fn(async () => 1),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ productId: product.id, basePrice: 1000, currency: "CZK" })),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            items: [{
              id: product.id,
              productId: product.id,
              stockQuantity: 60,
              availability: {
                source: "warehouse",
                totalAvailable: 60,
                warehouses: [{ warehouseId: "warehouse-1", available: 60 }],
              },
            }],
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          success: true,
          draft: { catalogProductId: product.id, quantity: 60 },
          nextAction: "confirm_publish",
        },
      } as any);
    const service = new ProductsService(repository as any, logger as any, pricingService as any);

    const result = await service.prepareAllegroSale(product.id, { quantity: 999 }, "Bearer user-token");

    expect(mockedAxios.post.mock.calls[1]).toEqual([
      "http://allegro-service:3000/allegro/catalog-sell/prepare",
      expect.objectContaining({ catalogProductId: product.id, quantity: 60 }),
      { headers: { Authorization: "Bearer user-token", "Content-Type": "application/json" } },
    ]);
    expect(result).toMatchObject({
      success: true,
      authority: "allegro",
      draft: { quantity: 60 },
    });
  });
});


describe("ProductsService sales statistics bridge", () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };
  const product = {
    id: "11111111-1111-4111-8111-111111111111",
    sku: "SKU-SALES-001",
    title: "Sales stats product",
    isActive: true,
  } as unknown as Product;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ORDERS_SERVICE_TOKEN;
    delete process.env.ORDERS_INTERNAL_SERVICE_TOKEN;
    delete process.env.CATALOG_INTERNAL_SERVICE_TOKEN;
    delete process.env.INTERNAL_SERVICE_TOKEN;
    delete process.env.ORDERS_SERVICE_URL;
    delete process.env.ORDERS_BASE_URL;
    delete process.env.ORDERS_STATISTICS_TIMEOUT_MS;
  });



  it("does not call Orders when the Catalog product does not exist", async () => {
    process.env.ORDERS_SERVICE_TOKEN = "orders-token";
    const repository = {
      findOne: jest.fn(async () => null),
    };
    const service = new ProductsService(repository as any, logger as any);

    await expect(service.getSalesStatistics(product.id)).rejects.toThrow("Product with ID 11111111-1111-4111-8111-111111111111 not found");
    expect((axios as jest.Mocked<typeof axios>).get).not.toHaveBeenCalled();
  });

  it("returns an unavailable zero aggregate when the Orders service token contract is missing", async () => {
    const repository = {
      findOne: jest.fn(async () => product),
    };
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.getSalesStatistics(product.id);

    expect((axios as jest.Mocked<typeof axios>).get).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      productId: product.id,
      source: "orders",
      sourceStatus: "unavailable",
      unavailableReason: "[MISSING: Catalog-to-Orders service credential; configure ORDERS_SERVICE_TOKEN, ORDERS_INTERNAL_SERVICE_TOKEN, CATALOG_INTERNAL_SERVICE_TOKEN, or INTERNAL_SERVICE_TOKEN]",
      totals: { orderCount: 0, quantitySold: 0 },
    });
    expect(result.channels).toHaveLength(5);
    expect(result.channels.every((channel) => channel.status === "unavailable")).toBe(true);
  });

  it("uses the Catalog internal service token when no Orders-specific token is configured", async () => {
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN = "catalog-internal-token";
    process.env.ORDERS_SERVICE_URL = "http://orders-service.test";
    const repository = {
      findOne: jest.fn(async () => product),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: { productId: product.id, allowedChannels: ["flipflop"], channels: [] } },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    await service.getSalesStatistics(product.id);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://orders-service.test/api/orders/statistics/products/11111111-1111-4111-8111-111111111111",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer catalog-internal-token",
          "x-internal-service-token": "catalog-internal-token",
          "x-service-name": "catalog-microservice",
        }),
      }),
    );
  });

  it("calls Orders product statistics and fills zero rows for allowed channels without sales", async () => {
    process.env.ORDERS_SERVICE_TOKEN = "orders-token";
    process.env.ORDERS_SERVICE_URL = "http://orders-service.test";
    const repository = {
      findOne: jest.fn(async () => product),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          productId: product.id,
          allowedChannels: ["flipflop", "allegro"],
          currencyStrategy: "per_currency_no_fx_conversion",
          conversion: "[UNKNOWN: conversion]",
          channels: [
            {
              productId: product.id,
              channel: "flipflop",
              currency: "CZK",
              orderCount: 1,
              quantitySold: 2,
              grossSales: 200,
              lastOrderedAt: "2026-06-13T08:00:00.000Z",
            },
          ],
        },
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.getSalesStatistics(product.id);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://orders-service.test/api/orders/statistics/products/11111111-1111-4111-8111-111111111111",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer orders-token",
          "x-internal-service-token": "orders-token",
          "x-service-name": "catalog-microservice",
        }),
      }),
    );
    expect(result).toMatchObject({
      productId: product.id,
      sourceStatus: "available",
      totals: {
        orderCount: 1,
        quantitySold: 2,
        grossSalesByCurrency: [{ currency: "CZK", amount: 200 }],
      },
      channels: [
        { channel: "flipflop", status: "available", orderCount: 1, quantitySold: 2, grossSales: 200 },
        { channel: "allegro", status: "zero", orderCount: 0, quantitySold: 0, grossSales: 0 },
      ],
    });
  });
  it("returns an unavailable zero aggregate when Orders fails", async () => {
    process.env.ORDERS_SERVICE_TOKEN = "orders-token";
    const repository = {
      findOne: jest.fn(async () => product),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 503 } });
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.getSalesStatistics(product.id);

    expect(result.sourceStatus).toBe("unavailable");
    expect(result.totals).toMatchObject({ orderCount: 0, quantitySold: 0 });
    expect(result.channels.every((channel) => channel.status === "unavailable")).toBe(true);
  });


  it("normalizes bounded recent history without forwarding sensitive Orders fields", async () => {
    process.env.ORDERS_SERVICE_TOKEN = "orders-token";
    const repository = {
      findOne: jest.fn(async () => product),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          productId: product.id,
          allowedChannels: ["bazos"],
          channels: [{ channel: "bazos", currency: "CZK", orderCount: 1, quantitySold: 1, grossSales: 150 }],
          recentHistory: Array.from({ length: 12 }, (_, index) => ({
            channel: "bazos",
            orderedAt: `2026-06-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
            currency: "CZK",
            quantity: 1,
            amount: 150,
            status: "paid",
            customerEmail: "customer@example.test",
            paymentCardLast4: "4242",
            shippingAddress: "Main Street 1",
            providerPayload: { secret: "provider-secret" },
          })),
        },
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.getSalesStatistics(product.id);
    const serialized = JSON.stringify(result);

    expect(result.recentHistory).toHaveLength(10);
    expect(result.recentHistory[0]).toMatchObject({
      channel: "bazos",
      orderedAt: "2026-06-01T08:00:00.000Z",
      currency: "CZK",
      quantitySold: 1,
      grossSales: 150,
      status: "paid",
    });
    expect(serialized).not.toContain("customer@example.test");
    expect(serialized).not.toContain("4242");
    expect(serialized).not.toContain("Main Street");
    expect(serialized).not.toContain("provider-secret");
  });
});


describe("ProductsService Aukro draft action", () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUKRO_SERVICE_TOKEN;
  });

  const readyProduct = {
    id: "11111111-1111-4111-8111-111111111111",
    sku: "SKU-AUKRO-001",
    title: "Aukro draft product",
    description: "Synthetic Aukro description.",
    isActive: true,
    lifecycle: "active",
    categories: [{ id: "category-1", name: "marketplace" }],
    media: [{ url: "https://cdn.example.test/aukro.png" }],
    pricing: [],
  } as unknown as Product;

  it("creates an Aukro catalog draft through aukro-service from the selected account", async () => {
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: "aukro-account-1", username: "seller@example.test", isActive: true }],
    } as any);
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        action: "created",
        draftStatus: "ready_for_review",
        offer: {
          id: "aukro-offer-1",
          productId: readyProduct.id,
          rawData: { draft: { draftStatus: "ready_for_review", policyReasonCodes: [] } },
        },
        blockers: [],
      },
    } as any);
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.requestAukroDraft(readyProduct.id, {}, "Bearer user-token");

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://aukro-service:3700/aukro/accounts",
      { headers: { Authorization: "Bearer user-token", "Content-Type": "application/json" } },
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "http://aukro-service:3700/aukro/offers/from-catalog",
      {
        accountId: "aukro-account-1",
        productId: readyProduct.id,
        requestedBy: "catalog-dashboard",
        policyEvidence: undefined,
      },
      { headers: { Authorization: "Bearer user-token", "Content-Type": "application/json" } },
    );
    expect(result).toMatchObject({
      success: true,
      action: "create_aukro_draft",
      authority: "aukro",
      draftStatus: "ready_for_review",
      offerId: "aukro-offer-1",
      nextAction: "review_aukro_draft",
    });
  });

  it("reads Aukro draft status by account and catalog product", async () => {
    const repository = {
      findOne: jest.fn(async () => readyProduct),
      count: jest.fn(async () => 1),
    };
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get
      .mockResolvedValueOnce({
        data: [{ id: "aukro-account-1", username: "seller@example.test", isActive: true }],
      } as any)
      .mockResolvedValueOnce({
        data: [
          {
            id: "other-offer",
            productId: "22222222-2222-4222-8222-222222222222",
            rawData: {},
          },
          {
            id: "aukro-offer-1",
            productId: readyProduct.id,
            rawData: { draft: { draftStatus: "blocked", policyReasonCodes: ["MEDIA_READINESS_MISSING"] } },
          },
        ],
      } as any);
    const service = new ProductsService(repository as any, logger as any);

    const result = await service.getAukroStatus(readyProduct.id, "Bearer user-token");

    expect(mockedAxios.get.mock.calls[1]).toEqual([
      "http://aukro-service:3700/aukro/offers?accountId=aukro-account-1",
      { headers: { Authorization: "Bearer user-token", "Content-Type": "application/json" } },
    ]);
    expect(result).toMatchObject({
      success: true,
      action: "read_aukro_draft_status",
      authority: "aukro",
      draftStatus: "blocked",
      offerId: "aukro-offer-1",
      blockers: ["MEDIA_READINESS_MISSING"],
      nextAction: "resolve_aukro_policy_blockers",
    });
  });
});

describe("ProductsService bulk marketplace publication", () => {
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dispatches unique selected products to selected marketplace-owned workflows", async () => {
    const service = new ProductsService({} as any, logger as any);
    jest.spyOn(service, "requestBazosDraft").mockResolvedValue({
      success: true,
      action: "create_bazos_draft",
      productId: "product-1",
      authority: "bazos",
      nextAction: "resolve_policy_failures",
    } as any);
    jest.spyOn(service, "prepareFlipFlopSale").mockResolvedValue({
      success: true,
      action: "prepare_flipflop_sale",
      productId: "product-1",
      authority: "flipflop",
      nextAction: "view_flipflop_listing",
    } as any);

    const result = await service.publishProductsToMarketplaces({
      productIds: ["product-1", "product-1", "product-2"],
      marketplaces: ["bazos", "flipflop"],
      options: { bazos: { identityId: "identity-1" } },
    }, "Bearer user-token");

    expect(service.requestBazosDraft).toHaveBeenCalledTimes(2);
    expect(service.requestBazosDraft).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ identityId: "identity-1", requestedBy: "catalog-bulk-publication", useCallerBazosIdentity: true }),
      "Bearer user-token",
    );
    expect(service.prepareFlipFlopSale).toHaveBeenCalledTimes(2);
    expect(service.prepareFlipFlopSale).toHaveBeenCalledWith("product-1", "Bearer user-token");
    expect(result).toMatchObject({
      success: true,
      requestedProductIds: ["product-1", "product-2"],
      marketplaces: ["bazos", "flipflop"],
      totals: { requested: 4, succeeded: 4, failed: 0, blocked: 0 },
    });
  });
});
