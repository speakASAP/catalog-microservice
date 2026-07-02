import { BadRequestException } from "@nestjs/common";
import { ImportReconciliationService } from "./import-reconciliation.service";

const repository = (rows: any[] = []) => ({
  find: jest.fn().mockResolvedValue(rows),
});

describe("ImportReconciliationService", () => {
  it("reports create candidates without writing catalog records", async () => {
    const productRepository = repository([]);
    const categoryRepository = repository([{ id: "cat-1", slug: "phones" }]);
    const mediaRepository = repository([]);
    const pricingRepository = repository([]);
    const service = new ImportReconciliationService(
      productRepository as any,
      categoryRepository as any,
      mediaRepository as any,
      pricingRepository as any,
      { log: jest.fn() } as any,
    );

    const report = await service.dryRun({
      products: [{
        sku: "SKU-1",
        title: "Phone",
        ean: "1234567890123",
        categorySlugs: ["phones"],
        mediaUrls: ["https://cdn.example.test/p.jpg"],
        pricing: [{ currency: "CZK", basePrice: 100 }],
      }],
    });

    expect(report.dryRun).toBe(true);
    expect(report.destructiveActionRequired).toBe(false);
    expect(report.totals.createCandidates).toBe(1);
    expect(report.rows[0].action).toBe("create");
    expect(productRepository.find).toHaveBeenCalledTimes(1);
    expect(categoryRepository.find).toHaveBeenCalledTimes(1);
    expect(mediaRepository.find).not.toHaveBeenCalled();
    expect(pricingRepository.find).not.toHaveBeenCalled();
  });

  it("reports update candidates for existing SKU matches", async () => {
    const service = new ImportReconciliationService(
      repository([{ id: "product-1", sku: "SKU-1", ean: "123" }]) as any,
      repository([{ id: "cat-1", slug: "phones" }]) as any,
      repository([]) as any,
      repository([]) as any,
      { log: jest.fn() } as any,
    );

    const report = await service.dryRun({
      products: [{
        sku: "SKU-1",
        title: "Phone",
        ean: "123",
        description: "Ready description",
        categoryIds: ["cat-1"],
        mediaUrls: ["https://cdn.example.test/p.jpg"],
        pricing: [{ currency: "CZK", basePrice: "100" }],
      }],
    });

    expect(report.totals.updateCandidates).toBe(1);
    expect(report.rows[0]).toMatchObject({ action: "update", productId: "product-1" });
  });

  it("keeps incomplete import create candidates draft and defaults missing Warehouse quantity to zero", async () => {
    const service = new ImportReconciliationService(
      repository([]) as any,
      repository([{ id: "cat-1", slug: "phones" }]) as any,
      repository([]) as any,
      repository([]) as any,
      { log: jest.fn() } as any,
    );

    const report = await service.dryRun({
      products: [{
        sku: "SKU-DRAFT-1",
        title: "Draft import",
        ean: "1234567890123",
        categoryIds: ["cat-1"],
      }],
    });

    expect(report.totals.createCandidates).toBe(1);
    expect(report.totals.draftCandidates).toBe(1);
    expect(report.totals.nonPublishableCandidates).toBe(1);
    expect(report.rows[0]).toMatchObject({
      action: "create",
      targetLifecycle: "draft",
      targetIsActive: false,
      publishable: false,
      warehouseStock: {
        source: "warehouse",
        sourceQuantity: null,
        resolvedQuantity: 0,
        defaulted: true,
        ownsStockInCatalog: false,
      },
    });
    expect(report.rows[0].qualityBlockingIssues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "missing_description",
      "missing_current_price",
      "missing_image",
    ]));
  });

  it("blocks duplicate import identities and inline media references", async () => {
    const service = new ImportReconciliationService(
      repository([]) as any,
      repository([{ id: "cat-1", slug: "phones" }]) as any,
      repository([]) as any,
      repository([]) as any,
      { log: jest.fn() } as any,
    );

    const report = await service.dryRun({
      products: [
        {
          sku: "SKU-1",
          title: "Phone A",
          ean: "123",
          categoryIds: ["cat-1"],
          mediaUrls: ["data:image/png;base64,abcd"],
          pricing: [{ currency: "CZK", basePrice: 100 }],
        },
        {
          sku: "SKU-1",
          title: "Phone B",
          ean: "456",
          categoryIds: ["cat-1"],
          mediaUrls: ["https://cdn.example.test/b.jpg"],
          pricing: [{ currency: "CZK", basePrice: 100 }],
        },
      ],
    });

    expect(report.totals.skippedRows).toBe(2);
    expect(report.rows[0].issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["duplicate_payload_sku", "invalid_media_reference"]),
    );
  });

  it("reports missing fields, unknown categories, pricing issues, and mass pricing review", async () => {
    const service = new ImportReconciliationService(
      repository([]) as any,
      repository([]) as any,
      repository([]) as any,
      repository([]) as any,
      { log: jest.fn() } as any,
    );

    const report = await service.dryRun({
      products: [{
        sku: "",
        title: "",
        categorySlugs: ["missing"],
        mediaUrls: [],
        pricing: Array.from({ length: 11 }, () => ({ currency: "czk", basePrice: -1 })),
      }],
    });

    expect(report.requiresHumanReview).toBe(true);
    expect(report.totals.skippedRows).toBe(1);
    expect(report.rows[0].issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["missing_sku", "missing_title", "unknown_category", "missing_media", "invalid_currency", "invalid_base_price"]),
    );
  });

  it("rejects empty payloads", async () => {
    const service = new ImportReconciliationService(
      repository([]) as any,
      repository([]) as any,
      repository([]) as any,
      repository([]) as any,
      { log: jest.fn() } as any,
    );

    await expect(service.dryRun({ products: [] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
