import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Category } from "../categories/category.entity";
import { Media } from "../media/media.entity";
import { Product } from "../products/product.entity";
import { ProductPricing } from "../pricing/product-pricing.entity";
import { LoggerService } from "../logger/logger.service";
import {
  ImportPricingRow,
  ImportProductRow,
  ImportReconciliationIssue,
  ImportReconciliationReport,
  ImportReconciliationRequest,
  ImportReconciliationRowResult,
} from "./import-reconciliation.types";

type CategoryRef = Pick<Category, "id" | "slug">;
type ExistingProductRef = Pick<Product, "id" | "sku" | "ean">;

@Injectable()
export class ImportReconciliationService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(ProductPricing)
    private readonly pricingRepository: Repository<ProductPricing>,
    private readonly logger: LoggerService,
  ) {}

  async dryRun(request: ImportReconciliationRequest): Promise<ImportReconciliationReport> {
    const rows = request.products;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException("products must contain at least one import row");
    }

    this.logger.log(`Dry-run import reconciliation rows=${rows.length}`, "ImportReconciliationService");

    const normalizedSkus = rows.map((row) => this.normalizeToken(row.sku)).filter(Boolean);
    const normalizedEans = rows.map((row) => this.normalizeToken(row.ean ?? undefined)).filter(Boolean);
    const existingProducts = await this.findExistingProducts(normalizedSkus, normalizedEans);
    const categories = await this.findCategories(rows);
    const payloadSkuCounts = this.countTokens(normalizedSkus);
    const payloadEanCounts = this.countTokens(normalizedEans);

    const results = rows.map((row, index) =>
      this.reconcileRow(row, index + 1, existingProducts, categories, payloadSkuCounts, payloadEanCounts),
    );

    const issueCount = results.reduce((total, row) => total + row.issues.length, 0);
    const requiresHumanReview = results.reduce((total, row) => total + row.pricingRowCount, 0) > 10;

    return {
      dryRun: true,
      destructiveActionRequired: false,
      requiresHumanReview,
      totals: {
        inputRows: rows.length,
        validRows: results.filter((row) => !row.issues.some((issue) => issue.severity === "blocking")).length,
        createCandidates: results.filter((row) => row.action === "create").length,
        updateCandidates: results.filter((row) => row.action === "update").length,
        skippedRows: results.filter((row) => row.action === "skip").length,
        draftCandidates: results.filter((row) => row.targetLifecycle === "draft").length,
        nonPublishableCandidates: results.filter((row) => !row.publishable).length,
        issueCount,
      },
      rows: results,
    };
  }

  private async findExistingProducts(skus: string[], eans: string[]): Promise<ExistingProductRef[]> {
    const conditions = [];
    if (skus.length) {
      conditions.push({ sku: In([...new Set(skus)]) });
    }
    if (eans.length) {
      conditions.push({ ean: In([...new Set(eans)]) });
    }
    if (!conditions.length) {
      return [];
    }

    return this.productRepository.find({
      where: conditions,
      select: ["id", "sku", "ean"],
    });
  }

  private async findCategories(rows: ImportProductRow[]): Promise<CategoryRef[]> {
    const categoryIds = rows.flatMap((row) => row.categoryIds ?? []).map((value) => this.normalizeToken(value)).filter(Boolean);
    const categorySlugs = rows.flatMap((row) => row.categorySlugs ?? []).map((value) => this.normalizeToken(value)).filter(Boolean);
    const conditions = [];
    if (categoryIds.length) {
      conditions.push({ id: In([...new Set(categoryIds)]) });
    }
    if (categorySlugs.length) {
      conditions.push({ slug: In([...new Set(categorySlugs)]) });
    }
    if (!conditions.length) {
      return [];
    }

    return this.categoryRepository.find({
      where: conditions,
      select: ["id", "slug"],
    });
  }

  private reconcileRow(
    row: ImportProductRow,
    rowNumber: number,
    existingProducts: ExistingProductRef[],
    categories: CategoryRef[],
    payloadSkuCounts: Map<string, number>,
    payloadEanCounts: Map<string, number>,
  ): ImportReconciliationRowResult {
    const issues: ImportReconciliationIssue[] = [];
    const sku = this.normalizeToken(row.sku);
    const ean = this.normalizeToken(row.ean ?? undefined);
    const productBySku = sku ? existingProducts.find((product) => this.normalizeToken(product.sku) === sku) : undefined;
    const productByEan = ean ? existingProducts.find((product) => this.normalizeToken(product.ean ?? undefined) === ean) : undefined;
    const product = productBySku ?? productByEan;
    const warehouseStock = this.resolveWarehouseStockPreview(row);

    this.addRequiredIdentityIssues(row, sku, ean, issues);
    this.addPayloadDuplicateIssues(sku, ean, payloadSkuCounts, payloadEanCounts, issues);
    this.addExistingDuplicateIssues(productBySku, productByEan, issues);
    this.addMediaIssues(row.mediaUrls ?? [], issues);
    this.addPricingIssues(row.pricing ?? [], issues);

    const categoryMatch = this.matchCategories(row, categories);
    if (categoryMatch.matchedCategoryIds.length === 0) {
      issues.push({
        code: "missing_category",
        field: "categoryIds",
        message: "Import row must reference at least one existing category.",
        severity: "warning",
      });
    }
    for (const ref of categoryMatch.missingCategoryRefs) {
      issues.push({
        code: "unknown_category",
        field: "categoryIds",
        message: `Category reference ${ref} was not found.`,
        severity: "blocking",
      });
    }

    const qualityBlockingIssues = this.buildImportQualityBlockers(row, sku, payloadSkuCounts);
    const hasBlockingIssue = issues.some((issue) => issue.severity === "blocking");
    const action = hasBlockingIssue ? "skip" : product ? "update" : "create";
    const targetLifecycle = action === "create" ? "draft" : null;
    const targetIsActive = action === "create" ? false : null;

    return {
      rowNumber,
      sku: sku || null,
      productId: product?.id ?? null,
      action,
      issues,
      qualityBlockingIssues,
      matchedCategoryIds: categoryMatch.matchedCategoryIds,
      missingCategoryRefs: categoryMatch.missingCategoryRefs,
      mediaUrlCount: (row.mediaUrls ?? []).length,
      pricingRowCount: (row.pricing ?? []).length,
      targetLifecycle,
      targetIsActive,
      publishable: action !== "skip" && qualityBlockingIssues.length === 0 && targetLifecycle !== "draft",
      warehouseStock,
    };
  }

  private addRequiredIdentityIssues(
    row: ImportProductRow,
    sku: string,
    ean: string,
    issues: ImportReconciliationIssue[],
  ): void {
    if (!sku) {
      issues.push({ code: "missing_sku", field: "sku", message: "SKU is required.", severity: "blocking" });
    }
    if (!row.title?.trim()) {
      issues.push({ code: "missing_title", field: "title", message: "Title is required.", severity: "blocking" });
    }
    if (!ean) {
      issues.push({ code: "missing_ean", field: "ean", message: "EAN is missing.", severity: "warning" });
    }
  }

  private addPayloadDuplicateIssues(
    sku: string,
    ean: string,
    payloadSkuCounts: Map<string, number>,
    payloadEanCounts: Map<string, number>,
    issues: ImportReconciliationIssue[],
  ): void {
    if (sku && (payloadSkuCounts.get(sku) ?? 0) > 1) {
      issues.push({ code: "duplicate_payload_sku", field: "sku", message: "SKU appears multiple times in this import.", severity: "blocking" });
    }
    if (ean && (payloadEanCounts.get(ean) ?? 0) > 1) {
      issues.push({ code: "duplicate_payload_ean", field: "ean", message: "EAN appears multiple times in this import.", severity: "blocking" });
    }
  }

  private addExistingDuplicateIssues(
    productBySku: ExistingProductRef | undefined,
    productByEan: ExistingProductRef | undefined,
    issues: ImportReconciliationIssue[],
  ): void {
    if (productBySku && productByEan && productBySku.id !== productByEan.id) {
      issues.push({
        code: "conflicting_existing_identity",
        field: "ean",
        message: "SKU and EAN match different existing Catalog products.",
        severity: "blocking",
      });
    }
  }

  private addMediaIssues(mediaUrls: string[], issues: ImportReconciliationIssue[]): void {
    if (!mediaUrls.length) {
      issues.push({ code: "missing_media", field: "mediaUrls", message: "No media URLs were supplied.", severity: "warning" });
    }
    for (const url of mediaUrls) {
      if (!this.isExternalMediaUrl(url)) {
        issues.push({
          code: "invalid_media_reference",
          field: "mediaUrls",
          message: "Media must be an external http(s) URL, not inline data or a local blob.",
          severity: "blocking",
        });
      }
    }
  }

  private addPricingIssues(pricingRows: ImportPricingRow[], issues: ImportReconciliationIssue[]): void {
    if (!pricingRows.length) {
      return;
    }
    for (const row of pricingRows) {
      const currency = row.currency ?? "CZK";
      const basePrice = Number(row.basePrice);
      const salePrice = row.salePrice === null || row.salePrice === undefined ? null : Number(row.salePrice);
      if (!/^[A-Z]{3}$/.test(currency)) {
        issues.push({ code: "invalid_currency", field: "pricing.currency", message: "Currency must be a three-letter uppercase code.", severity: "blocking" });
      }
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        issues.push({ code: "invalid_base_price", field: "pricing.basePrice", message: "Base price must be greater than zero.", severity: "blocking" });
      }
      if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice > basePrice)) {
        issues.push({ code: "invalid_sale_price", field: "pricing.salePrice", message: "Sale price must be positive and not exceed base price.", severity: "blocking" });
      }
    }
  }


  private buildImportQualityBlockers(
    row: ImportProductRow,
    sku: string,
    payloadSkuCounts: Map<string, number>,
  ): ImportReconciliationIssue[] {
    const issues: ImportReconciliationIssue[] = [];
    if (!sku) {
      issues.push({ code: "missing_sku", field: "sku", message: "SKU is required for activation and publishability.", severity: "blocking" });
    }
    if ((payloadSkuCounts.get(sku) ?? 0) > 1) {
      issues.push({ code: "duplicate_sku", field: "sku", message: "SKU appears multiple times in this import.", severity: "blocking" });
    }
    if (!row.title?.trim()) {
      issues.push({ code: "missing_title", field: "title", message: "Title is required for activation and publishability.", severity: "blocking" });
    }
    if (!this.hasImportDescription(row)) {
      issues.push({ code: "missing_description", field: "description", message: "Description is required before activation and publishability.", severity: "blocking" });
    }
    if (!this.hasPositiveImportPricing(row.pricing ?? [])) {
      issues.push({ code: "missing_current_price", field: "pricing", message: "A positive current price is required before activation and publishability.", severity: "blocking" });
    }
    if (!this.hasExternalImportImage(row.mediaUrls ?? [])) {
      issues.push({ code: "missing_image", field: "mediaUrls", message: "At least one external image URL is required before activation and publishability.", severity: "blocking" });
    }
    return issues;
  }

  private hasImportDescription(row: ImportProductRow): boolean {
    if (row.description?.trim()) {
      return true;
    }
    if (typeof row.descriptionRich === "string") {
      return row.descriptionRich.trim().length > 0;
    }
    return row.descriptionRich !== null && row.descriptionRich !== undefined;
  }

  private hasPositiveImportPricing(pricingRows: ImportPricingRow[]): boolean {
    return pricingRows.some((row) => {
      const basePrice = Number(row.basePrice);
      const salePrice = row.salePrice === null || row.salePrice === undefined ? null : Number(row.salePrice);
      return Number.isFinite(salePrice) && salePrice > 0 || Number.isFinite(basePrice) && basePrice > 0;
    });
  }

  private hasExternalImportImage(mediaUrls: string[]): boolean {
    return mediaUrls.some((url) => this.isExternalMediaUrl(url));
  }

  private resolveWarehouseStockPreview(row: ImportProductRow) {
    const rawQuantity = row.sourceQuantity ?? row.stockQuantity ?? row.quantity;
    const defaulted = rawQuantity === undefined || rawQuantity === null || (typeof rawQuantity === "string" && rawQuantity.trim() === "");
    const sourceQuantity = defaulted ? null : this.toWarehouseQuantity(rawQuantity);
    return {
      source: "warehouse" as const,
      sourceQuantity,
      resolvedQuantity: sourceQuantity ?? 0,
      defaulted,
      ownsStockInCatalog: false as const,
    };
  }

  private toWarehouseQuantity(value: string | number | null | undefined): number | null {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return null;
    }
    return Math.floor(numeric);
  }

  private matchCategories(row: ImportProductRow, categories: CategoryRef[]): { matchedCategoryIds: string[]; missingCategoryRefs: string[] } {
    const refs = [
      ...(row.categoryIds ?? []).map((value) => ({ kind: "id", value: this.normalizeToken(value) })),
      ...(row.categorySlugs ?? []).map((value) => ({ kind: "slug", value: this.normalizeToken(value) })),
    ].filter((ref) => ref.value);

    const matched = refs
      .map((ref) => categories.find((category) => (ref.kind === "id" ? category.id === ref.value : category.slug === ref.value)))
      .filter((category): category is CategoryRef => Boolean(category));
    const matchedIds = [...new Set(matched.map((category) => category.id))];
    const missing = refs
      .filter((ref) => !categories.some((category) => (ref.kind === "id" ? category.id === ref.value : category.slug === ref.value)))
      .map((ref) => ref.value);

    return { matchedCategoryIds: matchedIds, missingCategoryRefs: missing };
  }

  private countTokens(tokens: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    return counts;
  }

  private normalizeToken(value: string | null | undefined): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private isExternalMediaUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
}
