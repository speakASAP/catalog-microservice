import { ProductsService } from "./products.service";
import { Product } from "./product.entity";

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
