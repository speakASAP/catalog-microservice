import { BadRequestException } from "@nestjs/common";
import { FlipFlopProjectionService } from "./flipflop-projection.service";

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "product-1",
  sku: "SKU-001",
  title: "Catalog truth product",
  description: "Synthetic product description.",
  brand: "Statex",
  manufacturer: "Statex Manufacturing",
  lifecycle: "active",
  isActive: true,
  categories: [{ id: "category-1", name: "Shoes", slug: "shoes", path: "/shoes" }],
  media: [
    { id: "media-2", type: "image", url: "https://cdn.example.test/secondary.png", isPrimary: false, position: 2 },
    { id: "media-1", type: "image", url: "https://cdn.example.test/primary.png", thumbnailUrl: "https://cdn.example.test/primary-thumb.png", altText: "Primary image", isPrimary: true, position: 1 },
  ],
  seoData: { slug: "catalog-truth-product" },
  tags: ["synthetic"],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  ...overrides,
});

const readyResponse = (overrides: Record<string, unknown> = {}) => ({
  productId: "product-1",
  sku: "SKU-001",
  ready: true,
  channels: [{
    channel: "flipflop",
    authority: "flipflop",
    ready: true,
    status: "ready",
    missingFields: [],
    issues: [],
    nextAction: "FlipFlop still owns storefront and checkout behavior.",
    ...overrides,
  }],
});

describe("FlipFlopProjectionService", () => {
  const buildService = (overrides: {
    products?: any[];
    price?: any;
    availability?: any;
    readiness?: any;
  } = {}) => {
    const productsService = {
      findByIdsWithProjectionRelations: jest.fn(async () => overrides.products ?? [product()]),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => overrides.price ?? {
        productId: "product-1",
        basePrice: 1200,
        salePrice: 999,
        currency: "CZK",
        priceType: "sale",
      }),
    };
    const warehouseAvailabilityService = {
      getBatchAvailability: jest.fn(async () => overrides.availability ?? {
        requestedProductIds: ["product-1"],
        invalidProductIds: [],
        items: [{
          productId: "product-1",
          sku: "SKU-001",
          source: "warehouse",
          totalQuantity: 7,
          totalReserved: 2,
          totalAvailable: 5,
          logistics: {
            generatedAt: "2026-06-13T00:00:00.000Z",
            productId: "product-1",
            preferredRoute: "local_fulfillment",
            totals: { totalQuantity: 7, totalReserved: 2, totalAvailable: 5, routeCount: 1, ownAvailable: 5, supplierAvailable: 0, dropshipAvailable: 0 },
            options: [{
              productId: "product-1",
              warehouseId: "warehouse-1",
              warehouseCode: "OWN-PRG",
              warehouseName: "Prague Main Warehouse",
              warehouseType: "own",
              originType: "own",
              supplierId: null,
              priority: 20,
              quantity: 7,
              reserved: 2,
              available: 5,
              routeType: "local_fulfillment",
              routeLabel: "Ship from Alfares warehouse to customer",
              canReserveFromWarehouse: true,
              requiresSupplierCoordination: false,
              legs: [{ sequence: 1, from: "OWN-PRG", to: "customer", responsibility: "warehouse" }],
            }],
          },
          warehouses: [{
            warehouseId: "warehouse-1",
            warehouseCode: "OWN-PRG",
            warehouseName: "Prague Main Warehouse",
            warehouseType: "own",
            supplierId: null,
            quantity: 7,
            reserved: 2,
            available: 5,
          }],
        }],
      }),
    };
    const channelReadinessService = {
      getProductReadiness: jest.fn(async () => overrides.readiness ?? readyResponse()),
    };

    return {
      service: new FlipFlopProjectionService(
        productsService as any,
        pricingService as any,
        warehouseAvailabilityService as any,
        channelReadinessService as any,
      ),
      pricingService,
      warehouseAvailabilityService,
      channelReadinessService,
    };
  };

  it("maps Catalog title, current sale price, media, and Warehouse availability to FlipFlop aliases", async () => {
    const { service } = buildService();

    const result = await service.getBatchProjection({ productIds: ["product-1"] });

    expect(result.invalidProductIds).toEqual([]);
    expect(result.items[0]).toMatchObject({
      id: "product-1",
      productId: "product-1",
      sku: "SKU-001",
      name: "Catalog truth product",
      title: "Catalog truth product",
      mainImageUrl: "https://cdn.example.test/primary.png",
      imageUrls: ["https://cdn.example.test/primary.png", "https://cdn.example.test/secondary.png"],
      price: {
        amount: 999,
        basePrice: 1200,
        salePrice: 999,
        currency: "CZK",
        priceType: "sale",
        source: "catalog_pricing",
      },
      availability: {
        source: "warehouse",
        totalQuantity: 7,
        totalReserved: 2,
        totalAvailable: 5,
        logistics: expect.objectContaining({
          preferredRoute: "local_fulfillment",
          options: [expect.objectContaining({
            routeType: "local_fulfillment",
            legs: [{ sequence: 1, from: "OWN-PRG", to: "customer", responsibility: "warehouse" }],
          })],
        }),
        warehouses: [{
          warehouseId: "warehouse-1",
          warehouseCode: "OWN-PRG",
          warehouseName: "Prague Main Warehouse",
          warehouseType: "own",
          supplierId: null,
          quantity: 7,
          reserved: 2,
          available: 5,
        }],
      },
      stockQuantity: 5,
      readiness: {
        channel: "flipflop",
        ready: true,
        status: "ready",
        authority: "flipflop",
      },
    });
  });

  it("uses base price when no sale price exists and keeps Catalog pricing as the source", async () => {
    const { service } = buildService({
      price: { productId: "product-1", basePrice: 1200, salePrice: null, currency: "CZK", priceType: "regular" },
    });

    const result = await service.getBatchProjection({ productIds: ["product-1"] });

    expect(result.items[0].price).toMatchObject({
      amount: 1200,
      salePrice: null,
      source: "catalog_pricing",
    });
  });

  it("reports invalid Catalog product IDs before calling pricing, readiness, or Warehouse availability", async () => {
    const { service, pricingService, warehouseAvailabilityService, channelReadinessService } = buildService({ products: [] });

    const result = await service.getBatchProjection({ productIds: ["missing-product"] });

    expect(result).toEqual({
      requestedProductIds: ["missing-product"],
      invalidProductIds: ["missing-product"],
      items: [],
    });
    expect(pricingService.getCurrentPrice).not.toHaveBeenCalled();
    expect(warehouseAvailabilityService.getBatchAvailability).not.toHaveBeenCalled();
    expect(channelReadinessService.getProductReadiness).not.toHaveBeenCalled();
  });

  it("calls Warehouse availability once for multiple valid product IDs", async () => {
    const { service, warehouseAvailabilityService } = buildService({
      products: [product({ id: "product-1", sku: "SKU-001" }), product({ id: "product-2", sku: "SKU-002" })],
      availability: {
        requestedProductIds: ["product-1", "product-2"],
        invalidProductIds: [],
        items: [
          { productId: "product-1", sku: "SKU-001", source: "warehouse", totalQuantity: 7, totalReserved: 2, totalAvailable: 5, warehouses: [] },
          { productId: "product-2", sku: "SKU-002", source: "warehouse", totalQuantity: 3, totalReserved: 1, totalAvailable: 2, warehouses: [] },
        ],
      },
    });

    await service.getBatchProjection({ productIds: ["product-1", "product-2"] });

    expect(warehouseAvailabilityService.getBatchAvailability).toHaveBeenCalledTimes(1);
    expect(warehouseAvailabilityService.getBatchAvailability).toHaveBeenCalledWith({ productIds: ["product-1", "product-2"] });
  });

  it("filters unavailable products by default and includes them when requested", async () => {
    const blockedReadiness = readyResponse({ ready: false, status: "blocked", missingFields: ["pricing"] });
    const { service } = buildService({ readiness: blockedReadiness });

    const defaultResult = await service.getBatchProjection({ productIds: ["product-1"] });
    const includedResult = await service.getBatchProjection({ productIds: ["product-1"], includeUnavailable: true });

    expect(defaultResult.items).toEqual([]);
    expect(includedResult.items[0].readiness).toMatchObject({ ready: false, status: "blocked", missingFields: ["pricing"] });
  });

  it("filters supplier stock without Warehouse-owned supplier route linkage by default", async () => {
    const availability = {
      requestedProductIds: ["product-1"],
      invalidProductIds: [],
      items: [{
        productId: "product-1",
        sku: "SKU-001",
        source: "warehouse",
        totalQuantity: 5,
        totalReserved: 1,
        totalAvailable: 4,
        warehouses: [{ warehouseId: "sup-1", warehouseCode: "SUP", warehouseName: "Supplier", warehouseType: "supplier", supplierId: null, quantity: 5, reserved: 1, available: 4 }],
        logistics: {
          generatedAt: "2026-06-13T00:00:00.000Z",
          productId: "product-1",
          preferredRoute: null,
          totals: { totalQuantity: 5, totalReserved: 1, totalAvailable: 4, routeCount: 1, ownAvailable: 0, supplierAvailable: 4, dropshipAvailable: 0 },
          options: [{
            productId: "product-1",
            warehouseId: "sup-1",
            warehouseCode: "SUP",
            warehouseName: "Supplier",
            warehouseType: "supplier",
            originType: "supplier",
            supplierId: null,
            priority: 5,
            quantity: 5,
            reserved: 1,
            available: 4,
            routeType: "supplier_replenishment",
            routeLabel: "Supplier",
            canReserveFromWarehouse: true,
            requiresSupplierCoordination: true,
            legs: [
              { sequence: 1, from: "SUP", to: "alfares_receiving_or_handoff", responsibility: "supplier" },
              { sequence: 2, from: "alfares_receiving_or_handoff", to: "customer", responsibility: "warehouse" },
            ],
          }],
        },
      }],
    };
    const { service } = buildService({ availability });

    const defaultResult = await service.getBatchProjection({ productIds: ["product-1"] });
    const includedResult = await service.getBatchProjection({ productIds: ["product-1"], includeUnavailable: true });

    expect(defaultResult.items).toEqual([]);
    expect(includedResult.items[0]).toMatchObject({
      productId: "product-1",
      stockQuantity: 0,
      availability: {
        logistics: expect.objectContaining({
          options: [expect.objectContaining({
            routeType: "supplier_replenishment",
            supplierId: null,
            canReserveFromWarehouse: true,
          })],
        }),
      },
    });
  });

  it("projects only traceable reservable route availability as channel stock quantity", async () => {
    const availability = {
      requestedProductIds: ["product-1"],
      invalidProductIds: [],
      items: [{
        productId: "product-1",
        sku: "SKU-001",
        source: "warehouse",
        totalQuantity: 15,
        totalReserved: 1,
        totalAvailable: 14,
        warehouses: [
          { warehouseId: "own-1", warehouseCode: "OWN", warehouseName: "Own", warehouseType: "own", supplierId: null, quantity: 5, reserved: 1, available: 4 },
          { warehouseId: "sup-1", warehouseCode: "SUP", warehouseName: "Supplier", warehouseType: "supplier", supplierId: null, quantity: 10, reserved: 0, available: 10 },
        ],
        logistics: {
          generatedAt: "2026-06-13T00:00:00.000Z",
          productId: "product-1",
          preferredRoute: "local_fulfillment",
          totals: { totalQuantity: 15, totalReserved: 1, totalAvailable: 14, routeCount: 2, ownAvailable: 4, supplierAvailable: 10, dropshipAvailable: 0 },
          options: [
            {
              productId: "product-1",
              warehouseId: "own-1",
              warehouseCode: "OWN",
              warehouseName: "Own",
              warehouseType: "own",
              originType: "own",
              supplierId: null,
              priority: 10,
              quantity: 5,
              reserved: 1,
              available: 4,
              routeType: "local_fulfillment",
              routeLabel: "Local",
              canReserveFromWarehouse: true,
              requiresSupplierCoordination: false,
              legs: [{ sequence: 1, from: "OWN", to: "customer", responsibility: "warehouse" }],
            },
            {
              productId: "product-1",
              warehouseId: "sup-1",
              warehouseCode: "SUP",
              warehouseName: "Supplier",
              warehouseType: "supplier",
              originType: "supplier",
              supplierId: null,
              priority: 5,
              quantity: 10,
              reserved: 0,
              available: 10,
              routeType: "supplier_replenishment",
              routeLabel: "Supplier",
              canReserveFromWarehouse: false,
              requiresSupplierCoordination: true,
              legs: [
                { sequence: 1, from: "SUP", to: "alfares_receiving_or_handoff", responsibility: "supplier" },
                { sequence: 2, from: "alfares_receiving_or_handoff", to: "customer", responsibility: "warehouse" },
              ],
            },
          ],
        },
      }],
    };
    const { service } = buildService({ availability });

    const result = await service.getBatchProjection({ productIds: ["product-1"] });

    expect(result.items[0]).toMatchObject({
      productId: "product-1",
      stockQuantity: 4,
      availability: {
        totalAvailable: 14,
        logistics: expect.objectContaining({
          options: [
            expect.objectContaining({ routeType: "local_fulfillment", available: 4, canReserveFromWarehouse: true }),
            expect.objectContaining({ routeType: "supplier_replenishment", available: 10, canReserveFromWarehouse: false, supplierId: null }),
          ],
        }),
      },
    });
  });

  it("filters products with stock but no reservable Warehouse logistics route by default", async () => {
    const availability = {
      requestedProductIds: ["product-1"],
      invalidProductIds: [],
      items: [{
        productId: "product-1",
        sku: "SKU-001",
        source: "warehouse",
        totalQuantity: 7,
        totalReserved: 2,
        totalAvailable: 5,
        warehouses: [{ warehouseId: "warehouse-1", warehouseCode: "OWN-PRG", warehouseName: "Prague Main Warehouse", warehouseType: "own", supplierId: null, quantity: 7, reserved: 2, available: 5 }],
        logistics: {
          generatedAt: "2026-06-13T00:00:00.000Z",
          productId: "product-1",
          preferredRoute: null,
          totals: { totalQuantity: 7, totalReserved: 2, totalAvailable: 5, routeCount: 0, ownAvailable: 5, supplierAvailable: 0, dropshipAvailable: 0 },
          options: [],
        },
      }],
    };
    const { service } = buildService({ availability });

    const defaultResult = await service.getBatchProjection({ productIds: ["product-1"] });
    const includedResult = await service.getBatchProjection({ productIds: ["product-1"], includeUnavailable: true });

    expect(defaultResult.items).toEqual([]);
    expect(includedResult.items[0]).toMatchObject({
      productId: "product-1",
      stockQuantity: 0,
      availability: { logistics: expect.objectContaining({ options: [] }) },
    });
  });

  it("rejects duplicate and empty IDs", async () => {
    const { service } = buildService();

    await expect(service.getBatchProjection({ productIds: ["product-1", "product-1"] }))
      .rejects.toThrow(BadRequestException);
    await expect(service.getBatchProjection({ productIds: [" "] }))
      .rejects.toThrow(BadRequestException);
  });
});
