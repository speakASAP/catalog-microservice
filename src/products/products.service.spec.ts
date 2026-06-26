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
