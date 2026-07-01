import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';
import { Product, ProductLifecycle } from "./product.entity";
import { LoggerService } from '../logger/logger.service';
import { PricingService } from '../pricing/pricing.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import axios from "axios";
import { ContentRendererService } from '../content-connectors/content-renderer.service';
import {
  cleanPlainText,
  descriptionDocumentFromText,
  descriptionDocumentToPlainText,
  normalizeDescriptionDocument,
} from '../content-connectors/content-document';

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


export type BazosIdentitySummary = {
  id: string;
  displayName?: string | null;
  contactName?: string | null;
  defaultLocation?: string | null;
  status?: string | null;
  reviewState?: string | null;
  sessionState?: string | null;
  activeAdCount?: number | null;
  verificationExpiresAt?: string | null;
  nextPublishNotBefore?: string | null;
  canSell: boolean;
  blockingReasons: string[];
};

export type BazosAccountStatus = {
  connected: boolean;
  active: boolean;
  canSell: boolean;
  authority: 'bazos';
  message: string;
  selectedIdentity: BazosIdentitySummary | null;
  identities: BazosIdentitySummary[];
  nextAction: string;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
};

export type AukroAccountSummary = {
  id: string;
  username?: string | null;
  accountName?: string | null;
  isActive?: boolean | null;
};

export type AukroAccountStatus = {
  connected: boolean;
  active: boolean;
  canSell: boolean;
  authority: 'aukro';
  message: string;
  selectedAccount: AukroAccountSummary | null;
  accounts: AukroAccountSummary[];
  nextAction: string;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
};

export type ProductIdentifierAudit = {
  missingEan: Array<{ id: string; sku: string; title: string }>;
  duplicateSkus: Array<{ sku: string; count: number }>;
  duplicateEans: Array<{ ean: string; count: number }>;
};


export type ProductSalesChannel = {
  productId: string;
  channel: string;
  currency: string;
  orderCount: number;
  quantitySold: number;
  grossSales: number;
  lastOrderedAt: string | null;
  status: 'available' | 'zero' | 'unavailable';
  unavailableReason?: string;
};

export type ProductSalesHistoryEvent = {
  channel: string;
  orderedAt: string | null;
  currency: string;
  quantitySold: number;
  grossSales: number;
  status: string | null;
};

export type ProductSalesStatistics = {
  productId: string;
  source: 'orders';
  sourceStatus: 'available' | 'unavailable';
  allowedChannels: string[];
  currencyStrategy: string;
  conversion: string;
  totals: {
    orderCount: number;
    quantitySold: number;
    grossSalesByCurrency: Array<{ currency: string; amount: number }>;
  };
  channels: ProductSalesChannel[];
  recentHistory: ProductSalesHistoryEvent[];
  unavailableReason?: string;
};

type CatalogStockPreflight = {
  sellable: boolean;
  quantity: number;
  availability: any | null;
  projection: any | null;
};

export type MarketplacePublicationChannel = 'allegro' | 'bazos' | 'aukro' | 'flipflop' | 'heureka';

export type BulkMarketplacePublicationRequest = {
  productIds: string[];
  marketplaces: MarketplacePublicationChannel[];
  options?: Partial<Record<MarketplacePublicationChannel, any>>;
};

export type BulkMarketplacePublicationResult = {
  productId: string;
  marketplace: MarketplacePublicationChannel;
  success: boolean;
  blocked: boolean;
  action?: string | null;
  nextAction?: string | null;
  listingUrl?: string | null;
  message?: string | null;
  reason?: string | null;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
  data?: any;
};

export type BulkMarketplacePublicationResponse = {
  success: boolean;
  action: 'bulk_marketplace_publication';
  requestedProductIds: string[];
  marketplaces: MarketplacePublicationChannel[];
  totals: {
    requested: number;
    succeeded: number;
    failed: number;
    blocked: number;
  };
  results: BulkMarketplacePublicationResult[];
};

const MARKETPLACE_PUBLICATION_CHANNELS: MarketplacePublicationChannel[] = ['allegro', 'bazos', 'aukro', 'flipflop', 'heureka'];

const DEFAULT_SALES_CHANNELS = ['flipflop', 'allegro', 'aukro', 'bazos', 'heureka'];

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly logger: LoggerService,
    private readonly pricingService?: PricingService,
    @Optional()
    private readonly contentRendererService?: ContentRendererService,
  ) {}

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`, 'ProductsService');

    const product = this.productRepository.create(this.withLifecycleDefaults(this.withCanonicalContentDefaults(createProductDto)));
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


  async getSalesStatistics(id: string): Promise<ProductSalesStatistics> {
    await this.findOne(id);

    const serviceToken = this.getOrdersServiceToken();
    if (!serviceToken) {
      return this.unavailableSalesStatistics(
        id,
        '[MISSING: Catalog-to-Orders service credential; configure ORDERS_SERVICE_TOKEN, ORDERS_INTERNAL_SERVICE_TOKEN, CATALOG_INTERNAL_SERVICE_TOKEN, or INTERNAL_SERVICE_TOKEN]',
      );
    }

    const ordersBaseUrl = this.getOrdersBaseUrl();
    try {
      const response = await axios.get(
        `${ordersBaseUrl}/api/orders/statistics/products/${encodeURIComponent(id)}`,
        {
          timeout: this.getOrdersTimeoutMs(),
          headers: {
            Authorization: this.asBearerToken(serviceToken),
            'x-internal-service-token': serviceToken,
            'x-service-name': 'catalog-microservice',
            'Content-Type': 'application/json',
          },
        },
      );
      const payload = response.data?.data ?? response.data;
      return this.normalizeOrdersSalesStatistics(id, payload);
    } catch (error: any) {
      this.logger.warn(
        `Orders product sales statistics unavailable for ${id}: ${error?.response?.status ?? error?.message ?? 'unknown error'}`,
        'ProductsService',
      );
      return this.unavailableSalesStatistics(
        id,
        'Orders product sales statistics are unavailable. Try again after the Orders-owned read model is reachable.',
      );
    }
  }

  /**
   * Update a product
   */
  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    this.logger.log(`Updating product: ${id}`, 'ProductsService');

    const product = await this.findOne(id);
    Object.assign(product, this.withLifecycleDefaults(this.withCanonicalContentDefaults(updateProductDto, product), product));

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

  private withCanonicalContentDefaults<T extends Partial<Product>>(data: T, current?: Product): T {
    const next = { ...data } as any;
    const hasDescriptionRich = Object.prototype.hasOwnProperty.call(next, 'descriptionRich');
    const hasDescription = Object.prototype.hasOwnProperty.call(next, 'description');

    if (hasDescriptionRich) {
      const normalized = normalizeDescriptionDocument(next.descriptionRich, next.description ?? current?.description);
      next.descriptionRich = normalized;
      if (!hasDescription && normalized) {
        next.description = descriptionDocumentToPlainText(normalized) || undefined;
      } else if (hasDescription) {
        next.description = cleanPlainText(next.description);
      }
      return next;
    }

    if (hasDescription) {
      next.description = cleanPlainText(next.description);
      if (!current?.descriptionRich && next.description) {
        next.descriptionRich = descriptionDocumentFromText(next.description);
      }
    }

    return next;
  }

  private async renderMarketplaceDescription(
    product: Product,
    marketplace: 'allegro' | 'bazos' | 'aukro' | 'flipflop' | 'heureka',
  ): Promise<string | null> {
    if (!this.contentRendererService) {
      return product.description ? cleanPlainText(product.description) : null;
    }

    try {
      const preview = await this.contentRendererService.renderProductContent(product, marketplace);
      if (marketplace === 'allegro') {
        return preview.content.html || preview.content.plainText || null;
      }
      return preview.content.plainText || null;
    } catch (error: any) {
      this.logger.warn(
        `Marketplace description rendering failed for ${marketplace}/${product.id}: ${error?.message ?? 'unknown error'}`,
        'ProductsService',
      );
      return product.description ? cleanPlainText(product.description) : null;
    }
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


  async publishProductsToMarketplaces(
    request: BulkMarketplacePublicationRequest,
    authorization?: string,
  ): Promise<BulkMarketplacePublicationResponse> {
    const productIds = this.normalizeBulkProductIds(request?.productIds);
    const marketplaces = this.normalizePublicationMarketplaces(request?.marketplaces);
    const options = request?.options || {};
    const results: BulkMarketplacePublicationResult[] = [];

    for (const productId of productIds) {
      for (const marketplace of marketplaces) {
        results.push(await this.dispatchMarketplacePublication(productId, marketplace, options[marketplace] || {}, authorization));
      }
    }

    const succeeded = results.filter((result) => result.success).length;
    const blocked = results.filter((result) => result.blocked).length;

    return {
      success: results.length > 0 && results.every((result) => result.success),
      action: 'bulk_marketplace_publication',
      requestedProductIds: productIds,
      marketplaces,
      totals: {
        requested: results.length,
        succeeded,
        failed: results.length - succeeded,
        blocked,
      },
      results,
    };
  }

  private normalizeBulkProductIds(productIds: string[] = []): string[] {
    return Array.from(new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean)));
  }

  private normalizePublicationMarketplaces(marketplaces: MarketplacePublicationChannel[] = []): MarketplacePublicationChannel[] {
    return Array.from(new Set(marketplaces.map((marketplace) => String(marketplace || '').trim().toLowerCase())))
      .filter((marketplace): marketplace is MarketplacePublicationChannel => MARKETPLACE_PUBLICATION_CHANNELS.includes(marketplace as MarketplacePublicationChannel));
  }

  private async dispatchMarketplacePublication(
    productId: string,
    marketplace: MarketplacePublicationChannel,
    options: any,
    authorization?: string,
  ): Promise<BulkMarketplacePublicationResult> {
    try {
      const data = await this.runMarketplacePublication(productId, marketplace, options, authorization);
      return this.marketplacePublicationResult(productId, marketplace, data);
    } catch (error: any) {
      return {
        productId,
        marketplace,
        success: false,
        blocked: true,
        reason: 'marketplace_publication_failed',
        message: error?.message || 'Marketplace publication request failed.',
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? null,
      };
    }
  }

  private runMarketplacePublication(
    productId: string,
    marketplace: MarketplacePublicationChannel,
    options: any,
    authorization?: string,
  ): Promise<any> {
    const requestedBy = options?.requestedBy || 'catalog-bulk-publication';

    if (marketplace === 'bazos') {
      return this.requestBazosDraft(productId, {
        ...options,
        requestedBy,
        useCallerBazosIdentity: options?.useCallerBazosIdentity !== false,
      }, authorization);
    }
    if (marketplace === 'allegro') {
      return this.prepareAllegroSale(productId, { ...options, requestedBy }, authorization);
    }
    if (marketplace === 'aukro') {
      return this.requestAukroDraft(productId, { ...options, requestedBy }, authorization);
    }
    if (marketplace === 'heureka') {
      return this.prepareHeurekaSale(productId, { ...options, requestedBy });
    }
    return this.prepareFlipFlopSale(productId, authorization);
  }

  private marketplacePublicationResult(
    productId: string,
    marketplace: MarketplacePublicationChannel,
    data: any,
  ): BulkMarketplacePublicationResult {
    const blocked = Boolean(data?.blocked || data?.requiresHumanAction?.required || data?.success === false);
    const success = data?.success !== false && !blocked;

    return {
      productId,
      marketplace,
      success,
      blocked,
      action: data?.action ?? null,
      nextAction: data?.nextAction ?? null,
      listingUrl: data?.listingUrl ?? data?.draft?.listingUrl ?? null,
      message: data?.message ?? null,
      reason: data?.reason ?? data?.requiresHumanAction?.reason ?? null,
      dependencyStatus: data?.dependencyStatus ?? null,
      dependencyMessage: data?.dependencyMessage ?? null,
      data,
    };
  }


  async getBazosStatus(id: string, authorization?: string) {
    await this.findOne(id);

    if (!authorization) {
      return this.blockedBazosDraft(id, 'auth_required', 'Authentication is required before reading Bazos listing status.');
    }

    const bazosBaseUrl = this.getBazosBaseUrl();
    const bazosAuthorization = this.resolveBazosAuthorization(authorization, true);

    try {
      const response = await axios.get(
        `${bazosBaseUrl}/api/bazos/catalog/products/${id}/sell-action/status`,
        { headers: { Authorization: bazosAuthorization, 'Content-Type': 'application/json' } },
      );
      const bazosStatus = response.data?.data || response.data;
      return this.bazosStatusResponse(id, bazosStatus);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return this.bazosStatusResponse(id, null);
      }
      return {
        ...this.blockedBazosDraft(id, 'bazos_status_request_failed', 'Bazos listing status check failed. Try again after resolving the Bazos-owned dependency.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async getBazosAccountStatus(authorization?: string): Promise<BazosAccountStatus> {
    if (!authorization) {
      return this.blockedBazosAccountStatus('Catalog login is required before checking Bazos account status.', 'login_to_catalog');
    }

    const bazosBaseUrl = this.getBazosBaseUrl();

    try {
      const response = await axios.get(`${bazosBaseUrl}/api/bazos/identities`, {
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      });
      const rawIdentities = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      const identities = rawIdentities.map((identity: any) => this.summarizeBazosIdentity(identity));
      const selectedIdentity =
        identities.find((identity) => identity.canSell) ||
        identities.find((identity) => identity.status === 'verified') ||
        identities[0] ||
        null;

      return {
        connected: identities.length > 0,
        active: identities.some((identity) => identity.status === 'verified' && identity.sessionState === 'active'),
        canSell: Boolean(selectedIdentity?.canSell),
        authority: 'bazos',
        message: this.bazosAccountStatusMessage(identities, selectedIdentity),
        selectedIdentity,
        identities,
        nextAction: selectedIdentity?.canSell ? 'create_bazos_draft' : 'connect_or_verify_bazos_identity',
      };
    } catch (error: any) {
      return {
        ...this.blockedBazosAccountStatus('Bazos account status is unavailable. Sign in to Catalog again or reconnect Bazos.', 'bazos_status_unavailable'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
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

    const bazosBaseUrl = this.getBazosBaseUrl();
    const bazosAuthorization = this.resolveBazosAuthorization(authorization, data.useCallerBazosIdentity === true);
    const renderedDescription = await this.renderMarketplaceDescription(product, 'bazos');
    const draftPayload = {
      identityId,
      title: data.title || product.title,
      description: data.description ?? renderedDescription ?? product.description ?? undefined,
      price: currentPrice,
      category,
      location: data.location,
      stockQuantity: data.stockQuantity ?? 0,
    };

    try {
      const response = await axios.post(
        `${bazosBaseUrl}/api/bazos/catalog/products/${id}/sell-action`,
        draftPayload,
        { headers: { Authorization: bazosAuthorization, 'Content-Type': 'application/json' } },
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

  async getAukroStatus(id: string, authorization?: string) {
    await this.findOne(id);

    if (!authorization && !this.getAukroServiceToken()) {
      return this.blockedAukroDraft(id, 'auth_required', 'Authentication is required before reading Aukro draft status.');
    }

    const accountStatus = await this.getAukroAccountStatus(authorization);
    const selectedAccount = accountStatus.selectedAccount;
    if (!selectedAccount) {
      return {
        ...this.blockedAukroDraft(id, 'account_required', accountStatus.message),
        dependencyStatus: accountStatus.dependencyStatus ?? null,
        dependencyMessage: accountStatus.dependencyMessage ?? null,
      };
    }

    try {
      const response = await axios.get(
        `${this.getAukroBaseUrl()}/aukro/offers?accountId=${encodeURIComponent(selectedAccount.id)}`,
        { headers: this.aukroHeaders(authorization) },
      );
      const offers = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      const offer = offers.find((candidate: any) => String(candidate?.productId) === id) ?? null;
      return this.aukroStatusResponse(id, selectedAccount, offer);
    } catch (error: any) {
      return {
        ...this.blockedAukroDraft(id, 'aukro_status_request_failed', 'Aukro draft status check failed. Resolve the Aukro-owned dependency before retrying.'),
        account: selectedAccount,
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async getAukroAccountStatus(authorization?: string): Promise<AukroAccountStatus> {
    if (!authorization && !this.getAukroServiceToken()) {
      return this.blockedAukroAccountStatus('Catalog login is required before checking Aukro account status.', 'login_to_catalog');
    }

    try {
      const response = await axios.get(`${this.getAukroBaseUrl()}/aukro/accounts`, {
        headers: this.aukroHeaders(authorization),
      });
      const rawAccounts = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      const accounts = rawAccounts.map((account: any) => this.summarizeAukroAccount(account));
      const selectedAccount = accounts.find((account) => account.isActive !== false) || accounts[0] || null;

      return {
        connected: accounts.length > 0,
        active: Boolean(selectedAccount && selectedAccount.isActive !== false),
        canSell: Boolean(selectedAccount && selectedAccount.isActive !== false),
        authority: 'aukro',
        message: selectedAccount
          ? 'Aukro account is connected and ready for catalog draft preparation.'
          : 'No Aukro account is connected. Connect an Aukro account before preparing a draft.',
        selectedAccount,
        accounts,
        nextAction: selectedAccount ? 'create_aukro_draft' : 'connect_aukro_account',
      };
    } catch (error: any) {
      return {
        ...this.blockedAukroAccountStatus('Aukro account status is unavailable. Sign in to Catalog again or reconnect Aukro.', 'aukro_status_unavailable'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async requestAukroDraft(id: string, data: any = {}, authorization?: string) {
    const product = await this.findOne(id);

    if (!product.isActive) {
      return this.blockedAukroDraft(id, 'inactive_product', 'Only active catalog products can be sent to Aukro draft review.');
    }

    if (!authorization && !this.getAukroServiceToken()) {
      return this.blockedAukroDraft(id, 'auth_required', 'Authentication is required before requesting an Aukro draft.');
    }

    const accountStatus = await this.getAukroAccountStatus(authorization);
    const accountId = String(data.accountId || accountStatus.selectedAccount?.id || '').trim();
    if (!accountId) {
      return this.blockedAukroDraft(id, 'account_required', accountStatus.message);
    }

    try {
      const response = await axios.post(
        `${this.getAukroBaseUrl()}/aukro/offers/from-catalog`,
        {
          accountId,
          productId: id,
          requestedBy: data.requestedBy || 'catalog-dashboard',
          policyEvidence: data.policyEvidence,
        },
        { headers: this.aukroHeaders(authorization) },
      );
      const aukroAction = response.data?.data || response.data;
      return this.aukroDraftResponse(id, aukroAction, accountStatus.accounts.find((account) => account.id === accountId) || null);
    } catch (error: any) {
      return {
        ...this.blockedAukroDraft(id, 'aukro_draft_request_failed', 'Aukro draft request failed. Resolve the Aukro-owned action reason before retrying.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async sellOnAukro(id: string, data: any = {}, authorization?: string) {
    return this.requestAukroDraft(id, data, authorization);
  }

  async prepareAllegroSale(id: string, data: any = {}, authorization?: string) {
    const product = await this.findOne(id);

    if (!authorization) {
      return this.blockedChannelAction('allegro', id, 'auth_required', 'Authentication is required before preparing an Allegro offer.');
    }

    if (!product.isActive) {
      return this.blockedChannelAction('allegro', id, 'inactive_product', 'Only active catalog products can be prepared for Allegro.');
    }

    const currentPrice = await this.resolveCurrentPrice(product);
    if (!currentPrice) {
      return this.blockedChannelAction('allegro', id, 'price_required', 'A current catalog price is required before preparing an Allegro offer.');
    }

    const stockPreflight = await this.getCatalogStockPreflight(id);
    if (!stockPreflight.sellable) {
      return this.blockedChannelAction('allegro', id, 'warehouse_stock_unavailable', 'Warehouse has no sellable stock for this product. Import or reconcile physical stock before preparing an Allegro offer.');
    }

    const allegroBaseUrl = this.getAllegroBaseUrl();
    const requestedQuantity = this.toPositiveInteger(data.quantity);
    const renderedDescription = await this.renderMarketplaceDescription(product, 'allegro');
    const payload = {
      catalogProductId: id,
      categoryId: data.categoryId || product.categories?.[0]?.id,
      title: data.title || product.title,
      description: data.description ?? renderedDescription ?? product.description ?? undefined,
      price: data.price ?? currentPrice,
      quantity: requestedQuantity ? Math.min(requestedQuantity, stockPreflight.quantity) : stockPreflight.quantity,
      idempotencyKey: data.idempotencyKey || `catalog:${id}:allegro`,
      forceNewDraft: Boolean(data.forceNewDraft),
    };

    try {
      const response = await axios.post(
        `${allegroBaseUrl}/allegro/catalog-sell/prepare`,
        payload,
        { headers: { Authorization: authorization, 'Content-Type': 'application/json' } },
      );
      const allegroAction = response.data?.data || response.data;
      return this.allegroSaleResponse(id, allegroAction);
    } catch (error: any) {
      return {
        ...this.blockedChannelAction('allegro', id, 'allegro_prepare_failed', 'Allegro offer preparation failed. Resolve the Allegro-owned dependency before retrying.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async getAllegroStatus(id: string, authorization?: string) {
    await this.findOne(id);

    if (!authorization) {
      return this.blockedChannelAction('allegro', id, 'auth_required', 'Authentication is required before reading Allegro offer status.');
    }

    const allegroBaseUrl = this.getAllegroBaseUrl();
    try {
      const response = await axios.get(
        `${allegroBaseUrl}/allegro/catalog-sell/products/${id}/status`,
        { headers: { Authorization: authorization, 'Content-Type': 'application/json' } },
      );
      const allegroStatus = response.data?.data || response.data;
      return this.allegroSaleResponse(id, allegroStatus);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return this.allegroSaleResponse(id, null);
      }
      return {
        ...this.blockedChannelAction('allegro', id, 'allegro_status_failed', 'Allegro offer status is unavailable. Try again after resolving the Allegro-owned dependency.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async updateAllegroDraft(id: string, data: any = {}, authorization?: string) {
    const product = await this.findOne(id);

    if (!authorization) {
      return this.blockedChannelAction('allegro', id, 'auth_required', 'Authentication is required before editing an Allegro draft.');
    }

    const allegroBaseUrl = this.getAllegroBaseUrl();
    const renderedDescription = data.description === undefined
      ? await this.renderMarketplaceDescription(product, 'allegro')
      : null;
    const payload = {
      catalogProductId: id,
      offerId: data.offerId,
      title: data.title,
      description: data.description ?? renderedDescription ?? undefined,
      categoryId: data.categoryId,
      price: data.price,
      quantity: data.quantity,
    };

    try {
      const response = await axios.put(
        `${allegroBaseUrl}/allegro/catalog-sell/products/${id}/draft`,
        payload,
        { headers: { Authorization: authorization, 'Content-Type': 'application/json' } },
      );
      const allegroAction = response.data?.data || response.data;
      return this.allegroSaleResponse(id, allegroAction);
    } catch (error: any) {
      return {
        ...this.blockedChannelAction('allegro', id, 'allegro_draft_update_failed', 'Allegro draft update failed. Resolve the Allegro-owned dependency before retrying.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async confirmAllegroPublish(id: string, authorization?: string) {
    await this.findOne(id);

    if (!authorization) {
      return this.blockedChannelAction('allegro', id, 'auth_required', 'Authentication is required before confirming Allegro publication.');
    }

    const allegroBaseUrl = this.getAllegroBaseUrl();
    try {
      const response = await axios.post(
        `${allegroBaseUrl}/allegro/catalog-sell/products/${id}/confirm`,
        {},
        { headers: { Authorization: authorization, 'Content-Type': 'application/json' } },
      );
      const allegroAction = response.data?.data || response.data;
      return this.allegroSaleResponse(id, allegroAction);
    } catch (error: any) {
      return {
        ...this.blockedChannelAction('allegro', id, 'allegro_confirm_failed', 'Allegro publish confirmation failed. Resolve the Allegro-owned dependency before retrying.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async getHeurekaStatus(id: string, feedType = 'heureka_cz') {
    await this.findOne(id);
    try {
      const response = await axios.get(
        `${this.getHeurekaBaseUrl()}/heureka/products/${encodeURIComponent(id)}/status?feedType=${encodeURIComponent(feedType || 'heureka_cz')}`,
      );
      return this.heurekaPublishResponse(id, response.data?.data || response.data);
    } catch (error: any) {
      return {
        ...this.blockedChannelAction('heureka', id, 'heureka_status_unavailable', 'Heureka product status is unavailable. Check Heureka service routing and readiness.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async prepareHeurekaSale(id: string, data: any = {}) {
    const product = await this.findOne(id);
    const feedType = data?.feedType || 'heureka_cz';
    const snapshot = await this.getHeurekaFeedSnapshot(id, feedType, product);

    try {
      const response = await axios.post(
        `${this.getHeurekaBaseUrl()}/heureka/products/${encodeURIComponent(id)}/include`,
        {
          feedType,
          requestedBy: data?.requestedBy || 'catalog-marketplace-publication',
          sourceHash: snapshot.sourceHash,
        },
        { headers: this.heurekaHeaders() },
      );
      return this.heurekaPublishResponse(id, response.data?.data || response.data, snapshot);
    } catch (error: any) {
      return {
        ...this.blockedChannelAction('heureka', id, 'heureka_publish_unavailable', 'Heureka feed inclusion failed. Resolve Heureka readiness blockers before retrying.'),
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
        readiness: error?.response?.data?.readiness ?? error?.response?.data?.readinessItem ?? null,
        snapshot,
      };
    }
  }

  async getHeurekaFeedSnapshot(id: string, feedType = 'heureka_cz', loadedProduct?: Product) {
    const product = loadedProduct || await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'media', 'pricing'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const preview = this.contentRendererService
      ? await this.contentRendererService.renderProductContent(product, 'heureka')
      : null;
    const currentPrice = await this.resolveCurrentPrice(product);
    const feedFields = {
      ...(preview?.content?.feedFields || {}),
      ITEM_ID: preview?.content?.feedFields?.ITEM_ID || product.sku || product.id,
      PRICE_VAT: currentPrice,
    };

    return {
      contractVersion: 'catalog-heureka-feed-snapshot.v1',
      productId: product.id,
      marketplace: 'heureka',
      feedType: feedType || 'heureka_cz',
      sourceHash: preview?.source?.sourceHash || `catalog:${product.id}:${product.updatedAt?.toISOString?.() || ''}`,
      generatedAt: new Date().toISOString(),
      feedFields,
      overridesApplied: preview?.overridesApplied || [],
      warnings: preview?.warnings || [],
    };
  }

  async getFlipFlopStatus(id: string, authorization?: string) {
    await this.findOne(id);
    const listingUrl = `${this.getFlipFlopPublicUrl()}/products/${encodeURIComponent(id)}`;

    if (!authorization) {
      return {
        ...this.blockedChannelAction('flipflop', id, 'auth_required', 'Authentication is required before reading FlipFlop publication status.'),
        listingUrl,
      };
    }

    try {
      const response = await axios.get(
        `${this.getFlipFlopServiceBaseUrl()}/products/publish/${encodeURIComponent(id)}/status`,
        { headers: this.flipFlopHeaders(authorization) },
      );
      return this.flipFlopPublishResponse(id, response.data?.data || response.data);
    } catch (error: any) {
      return {
        ...this.blockedChannelAction('flipflop', id, 'flipflop_status_unavailable', 'FlipFlop publication status is unavailable. Check FlipFlop product-service routing and auth.'),
        listingUrl,
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }

  async prepareFlipFlopSale(id: string, authorization?: string) {
    await this.findOne(id);
    const listingUrl = `${this.getFlipFlopPublicUrl()}/products/${encodeURIComponent(id)}`;

    if (!authorization) {
      return {
        ...this.blockedChannelAction('flipflop', id, 'auth_required', 'Authentication is required before publishing to FlipFlop.'),
        listingUrl,
      };
    }

    try {
      const response = await axios.post(
        `${this.getFlipFlopServiceBaseUrl()}/products/publish/bulk`,
        {
          productIds: [id],
          requestedBy: 'catalog-marketplace-publication',
          requestId: `catalog-flipflop-${id}-${Date.now()}`,
        },
        { headers: this.flipFlopHeaders(authorization) },
      );
      const result = response.data?.data || response.data;
      const item = result?.results?.find((entry: any) => entry?.catalogProductId === id || entry?.productId === id) || result?.results?.[0] || result;
      return this.flipFlopPublishResponse(id, item);
    } catch (error: any) {
      return {
        ...this.blockedChannelAction('flipflop', id, 'flipflop_publish_unavailable', 'FlipFlop native publish endpoint is unavailable. Check FlipFlop product-service routing and auth.'),
        listingUrl,
        dependencyStatus: error?.response?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? error?.message ?? null,
      };
    }
  }


  private getOrdersBaseUrl(): string {
    return (process.env.ORDERS_SERVICE_URL || process.env.ORDERS_BASE_URL || 'http://orders-microservice:3203').replace(/\/$/, '');
  }

  private getOrdersServiceToken(): string | null {
    const token =
      process.env.ORDERS_SERVICE_TOKEN ||
      process.env.ORDERS_INTERNAL_SERVICE_TOKEN ||
      process.env.CATALOG_INTERNAL_SERVICE_TOKEN ||
      process.env.INTERNAL_SERVICE_TOKEN;
    return token?.trim() || null;
  }

  private async getFlipFlopCatalogProjection(productId: string): Promise<any> {
    const catalogInternalToken = this.getCatalogInternalServiceToken();
    if (!catalogInternalToken) {
      throw new Error('[MISSING: Catalog internal service token; configure CATALOG_INTERNAL_SERVICE_TOKEN or INTERNAL_SERVICE_TOKEN]');
    }

    const response = await axios.post(
      `${this.getCatalogInternalBaseUrl()}/api/products/projections/flipflop/batch`,
      { productIds: [productId], includeUnavailable: true },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-token': catalogInternalToken,
          'x-service-name': 'catalog-microservice',
        },
      },
    );
    const items = response.data?.data?.items || response.data?.items || [];
    return items.find((item: any) => item?.id === productId || item?.productId === productId) || items[0] || null;
  }

  private async getCatalogStockPreflight(productId: string): Promise<CatalogStockPreflight> {
    const projection = await this.getFlipFlopCatalogProjection(productId);
    return this.stockPreflightFromProjection(projection);
  }

  private stockPreflightFromProjection(projection: any): CatalogStockPreflight {
    const availability = projection?.availability ?? projection?.warehouse ?? null;
    const quantity = this.toPositiveInteger(
      projection?.stockQuantity ?? availability?.totalAvailable ?? availability?.available,
    );
    const hasWarehouses = Array.isArray(availability?.warehouses)
      ? availability.warehouses.length > 0
      : Array.isArray(projection?.warehouses)
        ? projection.warehouses.length > 0
        : quantity > 0;
    const source = String(availability?.source ?? projection?.warehouse?.source ?? '').toLowerCase();

    return {
      sellable: quantity > 0 && hasWarehouses && (!source || source === 'warehouse'),
      quantity,
      availability,
      projection: projection ?? null,
    };
  }

  private getCatalogInternalBaseUrl(): string {
    return (process.env.CATALOG_SERVICE_URL || process.env.CATALOG_BASE_URL || 'http://catalog-microservice:3200').replace(/\/$/, '');
  }

  private getCatalogInternalServiceToken(): string | null {
    const token = process.env.CATALOG_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN;
    return token?.trim() || null;
  }

  private getOrdersTimeoutMs(): number {
    const timeout = Number(process.env.ORDERS_STATISTICS_TIMEOUT_MS || 5000);
    return Number.isFinite(timeout) && timeout > 0 ? timeout : 5000;
  }

  private asBearerToken(token: string): string {
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  private normalizeOrdersSalesStatistics(productId: string, payload: any): ProductSalesStatistics {
    const allowedChannels = Array.isArray(payload?.allowedChannels) && payload.allowedChannels.length
      ? payload.allowedChannels.map((channel: unknown) => String(channel))
      : DEFAULT_SALES_CHANNELS;
    const rawChannels = Array.isArray(payload?.channels) ? payload.channels : [];
    const channelRows = allowedChannels.map((channel) => {
      const row = rawChannels.find((candidate: any) => String(candidate?.channel) === channel);
      return this.normalizeSalesChannel(productId, channel, row);
    });

    return {
      productId,
      source: 'orders',
      sourceStatus: 'available',
      allowedChannels,
      currencyStrategy: String(payload?.currencyStrategy || 'per_currency_no_fx_conversion'),
      conversion: String(payload?.conversion || '[UNKNOWN: conversion]'),
      totals: this.sumSalesTotals(channelRows),
      channels: channelRows,
      recentHistory: this.normalizeSalesHistory(payload),
    };
  }

  private normalizeSalesChannel(productId: string, channel: string, row: any): ProductSalesChannel {
    const orderCount = this.toNonNegativeNumber(row?.orderCount);
    const quantitySold = this.toNonNegativeNumber(row?.quantitySold);
    const grossSales = this.toNonNegativeNumber(row?.grossSales);
    const currency = String(row?.currency || 'CZK');
    const hasSales = orderCount > 0 || quantitySold > 0 || grossSales > 0;

    return {
      productId,
      channel,
      currency,
      orderCount,
      quantitySold,
      grossSales,
      lastOrderedAt: row?.lastOrderedAt ? String(row.lastOrderedAt) : null,
      status: hasSales ? 'available' : 'zero',
    };
  }

  private normalizeSalesHistory(payload: any): ProductSalesHistoryEvent[] {
    const rawHistory = Array.isArray(payload?.recentHistory)
      ? payload.recentHistory
      : Array.isArray(payload?.history)
        ? payload.history
        : Array.isArray(payload?.recentOrders)
          ? payload.recentOrders
          : [];

    return rawHistory.slice(0, 10).map((event: any) => ({
      channel: String(event?.channel ?? event?.source ?? 'unknown'),
      orderedAt: event?.orderedAt || event?.createdAt || event?.lastOrderedAt
        ? String(event.orderedAt || event.createdAt || event.lastOrderedAt)
        : null,
      currency: String(event?.currency || 'CZK'),
      quantitySold: this.toNonNegativeNumber(event?.quantitySold ?? event?.quantity ?? event?.itemsQuantity),
      grossSales: this.toNonNegativeNumber(event?.grossSales ?? event?.amount ?? event?.total),
      status: event?.status ? String(event.status) : null,
    }));
  }

  private sumSalesTotals(channels: ProductSalesChannel[]): ProductSalesStatistics['totals'] {
    const grossSales = new Map<string, number>();
    let orderCount = 0;
    let quantitySold = 0;

    for (const channel of channels) {
      orderCount += channel.orderCount;
      quantitySold += channel.quantitySold;
      grossSales.set(channel.currency, (grossSales.get(channel.currency) || 0) + channel.grossSales);
    }

    return {
      orderCount,
      quantitySold,
      grossSalesByCurrency: Array.from(grossSales.entries()).map(([currency, amount]) => ({ currency, amount })),
    };
  }

  private unavailableSalesStatistics(productId: string, unavailableReason: string): ProductSalesStatistics {
    const channels = DEFAULT_SALES_CHANNELS.map((channel) => ({
      productId,
      channel,
      currency: 'CZK',
      orderCount: 0,
      quantitySold: 0,
      grossSales: 0,
      lastOrderedAt: null,
      status: 'unavailable' as const,
      unavailableReason,
    }));

    return {
      productId,
      source: 'orders',
      sourceStatus: 'unavailable',
      allowedChannels: DEFAULT_SALES_CHANNELS,
      currencyStrategy: 'per_currency_no_fx_conversion',
      conversion: '[UNKNOWN: conversion]',
      totals: this.sumSalesTotals(channels),
      channels,
      recentHistory: [],
      unavailableReason,
    };
  }

  private toNonNegativeNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  private toPositiveInteger(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
  }

  private getBazosBaseUrl(): string {
    return (process.env.BAZOS_SERVICE_URL || 'http://bazos-service:3000').replace(/\/$/, '');
  }

  private getAllegroBaseUrl(): string {
    return (process.env.ALLEGRO_SERVICE_URL || 'http://allegro-service:3000').replace(/\/$/, '');
  }

  private getAukroBaseUrl(): string {
    return (process.env.AUKRO_SERVICE_URL || 'http://aukro-service:3700').replace(/\/$/, '');
  }

  private getAukroServiceToken(): string | null {
    const token = process.env.AUKRO_SERVICE_TOKEN || process.env.AUKRO_INTERNAL_SERVICE_TOKEN;
    return token?.trim() || null;
  }

  private resolveAukroAuthorization(callerAuthorization?: string): string {
    const token = this.getAukroServiceToken();
    if (token) {
      return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return callerAuthorization || '';
  }

  private aukroHeaders(callerAuthorization?: string): Record<string, string> {
    const authorization = this.resolveAukroAuthorization(callerAuthorization);
    return authorization
      ? { Authorization: authorization, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }

  private getHeurekaBaseUrl(): string {
    return (process.env.HEUREKA_SERVICE_URL || process.env.HEUREKA_BASE_URL || 'http://heureka-service:3800').replace(/\/$/, '');
  }

  private getHeurekaServiceToken(): string | null {
    const token = process.env.HEUREKA_INTERNAL_SERVICE_TOKEN || process.env.HEUREKA_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || process.env.CATALOG_INTERNAL_SERVICE_TOKEN;
    return token?.trim() || null;
  }

  private heurekaHeaders(): Record<string, string> {
    const token = this.getHeurekaServiceToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'x-internal-service-token': token } : {}),
      'x-service-name': 'catalog-microservice',
    };
  }

  private heurekaPublishResponse(productId: string, heurekaAction: any, snapshot?: any) {
    const blocked = Boolean(heurekaAction?.blocked || heurekaAction?.success === false);
    return {
      success: !blocked,
      action: heurekaAction?.action || 'include_heureka_product',
      productId,
      authority: 'heureka',
      publishAuthority: 'heureka',
      feedType: heurekaAction?.feedType || snapshot?.feedType || 'heureka_cz',
      included: Boolean(heurekaAction?.included),
      blocked,
      reason: heurekaAction?.reason ?? null,
      message: heurekaAction?.message ?? null,
      nextAction: heurekaAction?.nextAction || (blocked ? 'resolve_heureka_readiness_blockers' : 'view_heureka_feed'),
      feedUrl: heurekaAction?.feedUrl || `${this.getHeurekaBaseUrl()}/heureka/feed?type=${encodeURIComponent(heurekaAction?.feedType || snapshot?.feedType || 'heureka_cz')}`,
      readiness: heurekaAction?.readiness ?? null,
      readinessItem: heurekaAction?.readinessItem ?? null,
      snapshot: snapshot ?? null,
      data: heurekaAction,
    };
  }

  private getFlipFlopPublicUrl(): string {
    return (process.env.FLIPFLOP_PUBLIC_URL || 'https://flipflop.alfares.cz').replace(/\/$/, '');
  }

  private getFlipFlopServiceBaseUrl(): string {
    return (
      process.env.FLIPFLOP_PRODUCT_SERVICE_URL ||
      process.env.FLIPFLOP_SERVICE_URL ||
      'http://flipflop-product-service:3002'
    ).replace(/\/$/, '');
  }

  private flipFlopHeaders(authorization: string): Record<string, string> {
    return {
      Authorization: authorization,
      'Content-Type': 'application/json',
    };
  }

  private flipFlopPublishResponse(productId: string, flipflopAction: any) {
    const listingUrl = flipflopAction?.listingUrl || `${this.getFlipFlopPublicUrl()}/products/${encodeURIComponent(productId)}`;
    const blocked = Boolean(flipflopAction?.blocked || flipflopAction?.success === false);
    return {
      success: !blocked,
      action: flipflopAction?.action || 'publish_flipflop_listing',
      productId,
      authority: 'flipflop',
      listingUrl,
      availableOnFlipFlop: !blocked && (flipflopAction?.status === 'published' || flipflopAction?.published !== false),
      blocked,
      reason: flipflopAction?.reason ?? null,
      message: flipflopAction?.message ?? null,
      nextAction: flipflopAction?.nextAction || (blocked ? 'resolve_flipflop_requirements' : 'view_flipflop_listing'),
      flipflopProductId: flipflopAction?.flipflopProductId ?? null,
      status: flipflopAction?.status ?? null,
      availableStock: flipflopAction?.availableStock ?? null,
      data: flipflopAction,
    };
  }

  private resolveBazosAuthorization(callerAuthorization?: string, preferCaller = false): string {
    if (preferCaller && callerAuthorization) {
      return callerAuthorization;
    }

    const token = process.env.BAZOS_SERVICE_TOKEN || process.env.BAZOS_INTERNAL_SERVICE_TOKEN;
    if (token?.trim()) {
      return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return callerAuthorization || '';
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

  private blockedBazosAccountStatus(message: string, nextAction: string): BazosAccountStatus {
    return {
      connected: false,
      active: false,
      canSell: false,
      authority: 'bazos',
      message,
      selectedIdentity: null,
      identities: [],
      nextAction,
    };
  }

  private summarizeBazosIdentity(identity: any): BazosIdentitySummary {
    const blockingReasons: string[] = [];
    const activeAdCount = Number(identity.activeAdCount ?? 0);
    const nextPublishNotBefore = identity.nextPublishNotBefore ? new Date(identity.nextPublishNotBefore) : null;
    const verificationExpiresAt = identity.verificationExpiresAt ? new Date(identity.verificationExpiresAt) : null;

    if (identity.status !== 'verified') blockingReasons.push('Bazos phone identity is not verified.');
    if (identity.reviewState !== 'clear') blockingReasons.push('Bazos review state requires manual action.');
    if (identity.sessionState !== 'active') blockingReasons.push('Bazos session is missing, expired, or blocked by a challenge.');
    if (Number.isFinite(activeAdCount) && activeAdCount >= 50) blockingReasons.push('Bazos active ad limit is reached for this identity.');
    if (nextPublishNotBefore && nextPublishNotBefore.getTime() > Date.now()) blockingReasons.push('Bazos publish pacing delay is still active.');
    if (verificationExpiresAt && verificationExpiresAt.getTime() <= Date.now()) blockingReasons.push('Bazos verification session is expired.');

    return {
      id: String(identity.id),
      displayName: identity.displayName ?? null,
      contactName: identity.contactName ?? null,
      defaultLocation: identity.defaultLocation ?? null,
      status: identity.status ?? null,
      reviewState: identity.reviewState ?? null,
      sessionState: identity.sessionState ?? null,
      activeAdCount: Number.isFinite(activeAdCount) ? activeAdCount : null,
      verificationExpiresAt: identity.verificationExpiresAt ?? null,
      nextPublishNotBefore: identity.nextPublishNotBefore ?? null,
      canSell: blockingReasons.length === 0,
      blockingReasons,
    };
  }

  private bazosAccountStatusMessage(identities: BazosIdentitySummary[], selectedIdentity: BazosIdentitySummary | null): string {
    if (identities.length === 0) {
      return 'No Bazos phone identity is connected. Connect and verify a Bazos phone identity before publishing.';
    }
    if (selectedIdentity?.canSell) {
      return 'Bazos account is connected and ready for a catalog draft.';
    }
    return selectedIdentity?.blockingReasons[0] || 'Bazos account needs manual verification before publishing.';
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

  private blockedChannelAction(channel: 'allegro' | 'flipflop' | 'heureka', productId: string, reason: string, message: string) {
    return {
      success: false,
      action: channel === 'allegro' ? 'prepare_allegro_sale' : 'prepare_flipflop_sale',
      productId,
      blocked: true,
      reason,
      message,
      authority: channel,
      requiresHumanAction: {
        required: true,
        reason,
        error: message,
      },
      nextAction: `resolve_${channel}_requirements`,
    };
  }

  private bazosStatusResponse(productId: string, bazosStatus: any) {
    const draft = bazosStatus?.draft ?? null;
    const listingUrl = bazosStatus?.listingUrl ?? draft?.listingUrl ?? null;
    const publishedOnBasus = Boolean(bazosStatus?.publishedOnBasus ?? draft?.publishedOnBasus ?? bazosStatus?.publishedOnBazos ?? draft?.publishedOnBazos);

    return {
      success: true,
      action: 'read_bazos_listing_status',
      productId,
      authority: 'bazos',
      policyAuthority: 'bazos',
      publishAuthority: 'bazos',
      publishedOnBasus,
      publishedOnBazos: publishedOnBasus,
      listingUrl,
      draft,
      identity: bazosStatus?.identity ?? null,
      latestAttempt: bazosStatus?.latestAttempt ?? null,
      requiresConfirmation: Boolean(bazosStatus?.requiresConfirmation),
      requiresHumanAction: bazosStatus?.requiresHumanAction ?? {
        required: false,
        reason: null,
        policyFailures: [],
        error: null,
      },
      nextAction: publishedOnBasus ? 'view_bazos_listing' : (bazosStatus?.nextAction ?? 'create_bazos_draft'),
      bazosStatus,
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

  private blockedAukroAccountStatus(message: string, nextAction: string): AukroAccountStatus {
    return {
      connected: false,
      active: false,
      canSell: false,
      authority: 'aukro',
      message,
      selectedAccount: null,
      accounts: [],
      nextAction,
    };
  }

  private summarizeAukroAccount(account: any): AukroAccountSummary {
    return {
      id: String(account.id),
      username: account.username ?? null,
      accountName: account.accountName ?? account.name ?? account.displayName ?? null,
      isActive: account.isActive ?? null,
    };
  }

  private blockedAukroDraft(productId: string, reason: string, message: string) {
    return {
      success: false,
      action: 'create_aukro_draft',
      productId,
      blocked: true,
      reason,
      message,
      authority: 'aukro',
      policyAuthority: 'aukro',
      publishAuthority: 'aukro',
      requiresHumanAction: {
        required: true,
        reason,
        policyFailures: [],
        error: message,
      },
      nextAction: 'resolve_aukro_draft_requirements',
    };
  }

  private aukroStatusResponse(productId: string, account: AukroAccountSummary, offer: any) {
    const rawData = offer?.rawData ?? {};
    const draft = rawData?.draft ?? null;
    const draftStatus = draft?.draftStatus ?? null;
    const offerId = offer?.id ?? null;

    return {
      success: true,
      action: 'read_aukro_draft_status',
      productId,
      authority: 'aukro',
      policyAuthority: 'aukro',
      publishAuthority: 'aukro',
      account,
      offer,
      draft,
      draftStatus,
      offerId,
      blockers: Array.isArray(draft?.policyReasonCodes) ? draft.policyReasonCodes : [],
      compliancePolicy: offer?.compliancePolicy ?? null,
      requiresConfirmation: draftStatus === 'ready_for_review',
      requiresHumanAction: {
        required: draftStatus === 'blocked',
        reason: draftStatus === 'blocked' ? 'policy_blocked' : null,
        policyFailures: Array.isArray(draft?.policyReasonCodes) ? draft.policyReasonCodes : [],
        error: null,
      },
      nextAction: offerId
        ? (draftStatus === 'ready_for_review' ? 'review_aukro_draft' : 'resolve_aukro_policy_blockers')
        : 'create_aukro_draft',
    };
  }

  private aukroDraftResponse(productId: string, aukroAction: any, account: AukroAccountSummary | null) {
    const offer = aukroAction?.offer ?? null;
    const draft = offer?.rawData?.draft ?? null;
    const draftStatus = aukroAction?.draftStatus ?? draft?.draftStatus ?? null;
    const blockers = Array.isArray(aukroAction?.blockers) ? aukroAction.blockers : [];

    return {
      success: aukroAction?.success !== false,
      action: 'create_aukro_draft',
      productId,
      authority: 'aukro',
      policyAuthority: 'aukro',
      publishAuthority: 'aukro',
      account,
      offer,
      offerId: offer?.id ?? null,
      draft,
      draftStatus,
      sourceSnapshot: aukroAction?.sourceSnapshot ?? draft?.sourceSnapshot ?? null,
      compliancePolicy: aukroAction?.compliancePolicy ?? null,
      blockers,
      requiresConfirmation: draftStatus === 'ready_for_review',
      canQueueAfterConfirmation: draftStatus === 'ready_for_review',
      requiresHumanAction: {
        required: draftStatus === 'blocked' || blockers.length > 0,
        reason: blockers.length > 0 ? 'policy_blocked' : null,
        policyFailures: blockers,
        error: null,
      },
      nextAction: draftStatus === 'ready_for_review' ? 'review_aukro_draft' : 'resolve_aukro_policy_blockers',
      aukroAction,
    };
  }

  private allegroSaleResponse(productId: string, allegroAction: any) {
    const draft = allegroAction?.draft ?? null;
    const listingUrl = allegroAction?.listingUrl ?? draft?.publicUrl ?? draft?.listingUrl ?? null;

    return {
      success: true,
      action: 'prepare_allegro_sale',
      productId,
      authority: 'allegro',
      draft,
      attempt: allegroAction?.attempt ?? null,
      status: allegroAction?.status ?? allegroAction?.attempt?.status ?? null,
      listingUrl,
      categoryChoice: allegroAction?.categoryChoice ?? null,
      accountChoices: allegroAction?.accountChoices ?? [],
      requiresConfirmation: allegroAction?.nextAction === 'confirm_publish' || Boolean(allegroAction?.canConfirmPublish),
      canEditDraft: Boolean(allegroAction?.canEditDraft),
      canConfirmPublish: Boolean(allegroAction?.canConfirmPublish),
      nextAction: listingUrl ? 'view_allegro_listing' : (allegroAction?.nextAction ?? 'confirm_publish'),
      allegroAction,
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
