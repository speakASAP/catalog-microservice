import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';
import { Product, ProductLifecycle } from "./product.entity";
import { LoggerService } from '../logger/logger.service';
import { PricingService } from '../pricing/pricing.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import axios from "axios";

type ProductQualitySeverity = "blocking" | "warning";

export type ProductQualityIssue = {
  code: string;
  message: string;
  severity: ProductQualitySeverity;
  field?: string;
};

export type ProductReadiness = {
  productId: string;
  sku: string;
  lifecycle: ProductLifecycle;
  sellable: boolean;
  publishable: boolean;
  issues: ProductQualityIssue[];
  checks: {
    hasEan: boolean;
    hasMedia: boolean;
    hasPlaceholderMedia: boolean;
    hasCurrentPrice: boolean;
    hasCategory: boolean;
    hasDescription: boolean;
    duplicateSku: boolean;
    duplicateEan: boolean;
  };
};

export type ProductIdentifierAudit = {
  missingEan: Array<{ id: string; sku: string; title: string }>;
  duplicateSkus: Array<{ sku: string; count: number }>;
  duplicateEans: Array<{ ean: string; count: number }>;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly logger: LoggerService,
    private readonly pricingService?: PricingService,
  ) {}

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`, 'ProductsService');

    const product = this.productRepository.create(this.withLifecycleDefaults(createProductDto));
    const saved = await this.productRepository.save(product);

    this.logger.log(`Product created: ${saved.id}`, 'ProductsService');
    return saved;
  }

  /**
   * Find all products with pagination and filters
   */
  async findAll(query: ProductQueryDto): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, search, isActive, lifecycle, categoryId } = query;
    const skip = (page - 1) * limit;

    this.logger.log(`Finding products: page=${page}, limit=${limit}, search=${search}`, 'ProductsService');

    const where: FindOptionsWhere<Product> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    // Search in title, sku, brand
    if (search) {
      queryBuilder.where(
        '(product.title ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive });
    }

    if (lifecycle) {
      queryBuilder.andWhere("product.lifecycle = :lifecycle", { lifecycle });
    }

    // Filter by category
    if (categoryId) {
      queryBuilder
        .innerJoin('product.categories', 'category')
        .andWhere('category.id = :categoryId', { categoryId });
    }

    // Include relations
    queryBuilder
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.media', 'media')
      .leftJoinAndSelect('product.pricing', 'pricing')
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`Found ${total} products`, 'ProductsService');

    return { items, total, page, limit };
  }

  /**
   * Find one product by ID
   */
  async findOne(id: string): Promise<Product> {
    this.logger.log(`Finding product: ${id}`, 'ProductsService');

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'attributes', 'attributes.attribute', 'media', 'pricing'],
    });

    if (!product) {
      this.logger.warn(`Product not found: ${id}`, 'ProductsService');
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    this.logger.log(`Finding product by SKU: ${sku}`, 'ProductsService');

    return this.productRepository.findOne({
      where: { sku },
      relations: ['categories', 'media', 'pricing'],
    });
  }

  async findIdentitiesByIds(productIds: string[]): Promise<Array<Pick<Product, 'id' | 'sku' | 'title'>>> {
    if (!productIds.length) {
      return [];
    }

    return this.productRepository.find({
      where: { id: In(productIds) },
      select: ['id', 'sku', 'title'],
    });
  }

  async findByIdsWithProjectionRelations(productIds: string[]): Promise<Product[]> {
    if (!productIds.length) {
      return [];
    }

    return this.productRepository.find({
      where: { id: In(productIds) },
      relations: ["categories", "media", "pricing"],
    });
  }

  /**
   * Update a product
   */
  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    this.logger.log(`Updating product: ${id}`, 'ProductsService');

    const product = await this.findOne(id);
    Object.assign(product, this.withLifecycleDefaults(updateProductDto, product));

    const updated = await this.productRepository.save(product);
    this.logger.log(`Product updated: ${id}`, 'ProductsService');

    return updated;
  }


  async getReadiness(id: string): Promise<ProductReadiness> {
    const product = await this.findOne(id);
    const duplicateSummary = await this.getDuplicateSummaryForProduct(product);
    return this.buildReadiness(product, duplicateSummary);
  }

  async getQualityAudit(): Promise<ProductIdentifierAudit> {
    const missingEanRows = await this.productRepository
      .createQueryBuilder("product")
      .select(["product.id", "product.sku", "product.title"])
      .where("product.ean IS NULL OR length(btrim(product.ean)) = 0")
      .orderBy("product.createdAt", "DESC")
      .getMany();

    const duplicateSkus = await this.productRepository
      .createQueryBuilder("product")
      .select("product.sku", "sku")
      .addSelect("COUNT(*)", "count")
      .where("product.sku IS NOT NULL AND length(btrim(product.sku)) > 0")
      .groupBy("product.sku")
      .having("COUNT(*) > 1")
      .getRawMany<{ sku: string; count: string }>();

    const duplicateEans = await this.productRepository
      .createQueryBuilder("product")
      .select("product.ean", "ean")
      .addSelect("COUNT(*)", "count")
      .where("product.ean IS NOT NULL AND length(btrim(product.ean)) > 0")
      .groupBy("product.ean")
      .having("COUNT(*) > 1")
      .getRawMany<{ ean: string; count: string }>();

    return {
      missingEan: missingEanRows.map((product) => ({
        id: product.id,
        sku: product.sku,
        title: product.title,
      })),
      duplicateSkus: duplicateSkus.map((row) => ({ sku: row.sku, count: Number(row.count) })),
      duplicateEans: duplicateEans.map((row) => ({ ean: row.ean, count: Number(row.count) })),
    };
  }

  private withLifecycleDefaults<T extends Partial<Product>>(data: T, current?: Product): T {
    const next = { ...data };

    if (!next.lifecycle) {
      if (next.isActive === false) {
        next.lifecycle = "archived";
      } else if (next.isActive === true && current?.lifecycle === "archived") {
        next.lifecycle = "active";
      } else if (!current) {
        next.lifecycle = "active";
      }
    }

    if (next.lifecycle === "archived") {
      next.isActive = false;
    } else if (next.lifecycle === "active" && next.isActive === undefined) {
      next.isActive = true;
    }

    return next;
  }

  private resolveLifecycle(product: Product): ProductLifecycle {
    if (product.lifecycle) {
      return product.lifecycle;
    }
    return product.isActive === false ? "archived" : "active";
  }

  private buildReadiness(
    product: Product,
    duplicateSummary: { duplicateSku: boolean; duplicateEan: boolean },
  ): ProductReadiness {
    const lifecycle = this.resolveLifecycle(product);
    const hasEan = Boolean(product.ean?.trim());
    const hasMedia = Boolean(product.media?.length);
    const hasPlaceholderMedia = Boolean(product.media?.some((media) => this.isPlaceholderMedia(media)));
    const hasCurrentPrice = Boolean(
      product.pricing?.some((price) => price.isActive && Number(price.salePrice ?? price.basePrice) > 0),
    );
    const hasCategory = Boolean(product.categories?.length);
    const hasDescription = Boolean(product.description?.trim());
    const issues: ProductQualityIssue[] = [];

    if (lifecycle === "archived") {
      issues.push({ code: "archived_product", field: "lifecycle", severity: "blocking", message: "Archived products are not sellable or publishable." });
    }
    if (lifecycle === "draft") {
      issues.push({ code: "draft_product", field: "lifecycle", severity: "blocking", message: "Draft products need review before publication." });
    }
    if (lifecycle === "needs_review") {
      issues.push({ code: "needs_review", field: "lifecycle", severity: "warning", message: "Product is flagged for catalog review." });
    }
    if (!product.isActive) {
      issues.push({ code: "inactive_product", field: "isActive", severity: "blocking", message: "Inactive products are not sellable." });
    }
    if (!hasEan) {
      issues.push({ code: "missing_ean", field: "ean", severity: "warning", message: "EAN is missing." });
    }
    if (duplicateSummary.duplicateEan) {
      issues.push({ code: "duplicate_ean", field: "ean", severity: "blocking", message: "EAN is shared by multiple products." });
    }
    if (duplicateSummary.duplicateSku) {
      issues.push({ code: "duplicate_sku", field: "sku", severity: "blocking", message: "SKU is shared by multiple products." });
    }
    if (!hasDescription) {
      issues.push({ code: "missing_description", field: "description", severity: "warning", message: "Description is missing." });
    }
    if (!hasCategory) {
      issues.push({ code: "missing_category", field: "categories", severity: "warning", message: "Product has no category." });
    }
    if (!hasMedia) {
      issues.push({ code: "missing_media", field: "media", severity: "warning", message: "Product has no media." });
    }
    if (hasPlaceholderMedia) {
      issues.push({ code: "placeholder_media", field: "media", severity: "warning", message: "Product media appears to use a placeholder reference." });
    }
    if (!hasCurrentPrice) {
      issues.push({ code: "missing_current_price", field: "pricing", severity: "blocking", message: "Product has no active positive price." });
    }

    const hasBlockingIssue = issues.some((issue) => issue.severity === "blocking");
    return {
      productId: product.id,
      sku: product.sku,
      lifecycle,
      sellable: !hasBlockingIssue,
      publishable: !hasBlockingIssue && lifecycle === "active",
      issues,
      checks: {
        hasEan,
        hasMedia,
        hasPlaceholderMedia,
        hasCurrentPrice,
        hasCategory,
        hasDescription,
        duplicateSku: duplicateSummary.duplicateSku,
        duplicateEan: duplicateSummary.duplicateEan,
      },
    };
  }

  private isPlaceholderMedia(media: { url?: string; title?: string; altText?: string }): boolean {
    const value = [media.url, media.title, media.altText].filter(Boolean).join(" ").toLowerCase();
    return ["placeholder", "no-image", "missing-image", "image-coming-soon"].some((marker) => value.includes(marker));
  }

  private async getDuplicateSummaryForProduct(product: Product): Promise<{ duplicateSku: boolean; duplicateEan: boolean }> {
    const duplicateSku = product.sku
      ? await this.productRepository.count({ where: { sku: product.sku } }) > 1
      : false;
    const duplicateEan = product.ean?.trim()
      ? await this.productRepository.count({ where: { ean: product.ean } }) > 1
      : false;

    return { duplicateSku, duplicateEan };
  }


  async requestBazosDraft(id: string, data: any = {}, authorization?: string) {
    const product = await this.findOne(id);

    if (!product.isActive) {
      return this.blockedBazosDraft(id, 'inactive_product', 'Only active catalog products can be sent to Bazos draft review.');
    }

    if (!authorization) {
      return this.blockedBazosDraft(id, 'auth_required', 'Authentication is required before requesting a Bazos draft.');
    }

    const identityId = String(data.identityId || '').trim();
    if (!identityId) {
      return this.blockedBazosDraft(id, 'identity_required', 'Choose a Bazos identity before requesting a draft.');
    }

    const category = String(data.category || product.categories?.[0]?.name || '').trim();
    if (!category) {
      return this.blockedBazosDraft(id, 'category_required', 'Choose a Bazos category before requesting a draft.');
    }

    const currentPrice = await this.resolveCurrentPrice(product);
    if (!currentPrice) {
      return this.blockedBazosDraft(id, 'price_required', 'A current catalog price is required before requesting a Bazos draft.');
    }

    const bazosBaseUrl = (process.env.BAZOS_SERVICE_URL || 'http://bazos-service:3000').replace(/\/$/, '');
    const draftPayload = {
      identityId,
      title: data.title || product.title,
      description: data.description ?? product.description ?? undefined,
      price: currentPrice,
      category,
      location: data.location,
      stockQuantity: data.stockQuantity ?? 0,
    };

    try {
      const response = await axios.post(
        `${bazosBaseUrl}/api/bazos/catalog/products/${id}/sell-action`,
        draftPayload,
        { headers: { Authorization: authorization, 'Content-Type': 'application/json' } },
      );
      const bazosAction = response.data?.data || response.data;
      return this.bazosDraftResponse(id, bazosAction);
    } catch (error: any) {
      return {
        ...this.blockedBazosDraft(id, 'bazos_draft_request_failed', 'Bazos draft request failed. Resolve the Bazos-owned action reason before retrying.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async sellOnBazos(id: string, data: any = {}, authorization?: string) {
    return this.requestBazosDraft(id, data, authorization);
  }

  private async resolveCurrentPrice(product: Product): Promise<number | null> {
    const price = this.pricingService
      ? await this.pricingService.getCurrentPrice(product.id)
      : product.pricing?.find((row: any) => row.isActive) || product.pricing?.[0];
    if (!price) {
      return null;
    }

    const amount = Number(price.salePrice ?? price.basePrice);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  private blockedBazosDraft(productId: string, reason: string, message: string) {
    return {
      success: false,
      action: 'create_bazos_draft',
      productId,
      blocked: true,
      reason,
      message,
      authority: 'bazos',
      policyAuthority: 'bazos',
      publishAuthority: 'bazos',
      requiresHumanAction: {
        required: true,
        reason,
        policyFailures: [],
        error: message,
      },
      nextAction: 'resolve_bazos_draft_requirements',
    };
  }

  private bazosDraftResponse(productId: string, bazosAction: any) {
    return {
      success: true,
      action: 'create_bazos_draft',
      productId,
      authority: 'bazos',
      policyAuthority: 'bazos',
      publishAuthority: 'bazos',
      draft: bazosAction?.draft ?? null,
      identity: bazosAction?.identity ?? null,
      categoryMapping: bazosAction?.categoryMapping ?? null,
      policyStatus: bazosAction?.policyStatus ?? null,
      requiresConfirmation: Boolean(bazosAction?.requiresConfirmation),
      canQueueAfterConfirmation: Boolean(bazosAction?.canQueueAfterConfirmation),
      requiresHumanAction: bazosAction?.requiresHumanAction ?? {
        required: false,
        reason: null,
        policyFailures: [],
        error: null,
      },
      nextAction: bazosAction?.nextAction ?? 'resolve_policy_failures',
      bazosAction,
    };
  }

  /**
   * Delete a product (soft delete by setting isActive = false)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing product: ${id}`, 'ProductsService');

    const product = await this.findOne(id);
    product.isActive = false;
    product.lifecycle = "archived";
    await this.productRepository.save(product);

    this.logger.log(`Product deactivated: ${id}`, 'ProductsService');
  }

  /**
   * Hard delete a product
   */
  async hardRemove(id: string): Promise<void> {
    this.logger.log(`Hard deleting product: ${id}`, 'ProductsService');

    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    this.logger.log(`Product deleted: ${id}`, 'ProductsService');
  }
}

