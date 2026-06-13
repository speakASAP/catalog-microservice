import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';
import { Product, ProductLifecycle } from "./product.entity";
import { LoggerService } from '../logger/logger.service';
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


  async sellOnBazos(id: string, data: any = {}, authorization?: string) {
    const product = await this.findOne(id);

    if (!product.isActive) {
      return {
        success: false,
        blocked: true,
        reason: 'inactive_product',
        message: 'Only active catalog products can be sent to Bazos.',
      };
    }

    const activePrice = product.pricing?.find((price: any) => price.isActive) || product.pricing?.[0];
    if (!activePrice?.basePrice) {
      return {
        success: false,
        blocked: true,
        reason: 'price_required',
        message: 'A current catalog price is required before publishing to Bazos.',
      };
    }

    if (!authorization) {
      return {
        success: false,
        blocked: true,
        reason: 'auth_required',
        message: 'Please log in before starting Bazos publishing.',
      };
    }

    const bazosBaseUrl = process.env.BAZOS_SERVICE_URL || 'http://bazos-service:3000';
    const headers = { Authorization: authorization };
    const phoneNumber = String(data.phoneNumber || '').trim();
    const displayName = String(data.displayName || data.sellerName || '').trim();
    const location = String(data.location || '').trim();
    const category = String(data.category || product.categories?.[0]?.name || '').trim();

    if (!phoneNumber) {
      return {
        success: false,
        blocked: true,
        reason: 'phone_required',
        message: 'Enter the phone number you want to use on Bazos.',
      };
    }

    if (!displayName) {
      return {
        success: false,
        blocked: true,
        reason: 'seller_name_required',
        message: 'Enter the seller name shown with the Bazos ad.',
      };
    }

    if (!location) {
      return {
        success: false,
        blocked: true,
        reason: 'location_required',
        message: 'Choose the location for the Bazos advertisement.',
      };
    }

    if (!category) {
      return {
        success: false,
        blocked: true,
        reason: 'category_required',
        message: 'Choose a Bazos category for the advertisement.',
      };
    }

    const normalizedPhone = phoneNumber.replace(/\s+/g, '');
    const safePhone = normalizedPhone.replace(/[^0-9+]/g, '').replace(/^\+/, 'plus');
    const accountEmail = `${safePhone || 'seller'}@bazos.local`;
    let account: any;

    const accountsResponse = await axios.get(`${bazosBaseUrl}/accounts`, { headers });
    const accounts = accountsResponse.data?.data || accountsResponse.data || [];
    account = Array.isArray(accounts)
      ? accounts.find((item: any) => item.email === accountEmail || item.name === displayName)
      : undefined;

    if (!account) {
      const accountResponse = await axios.post(
        `${bazosBaseUrl}/accounts`,
        {
          name: displayName,
          email: accountEmail,
          isActive: true,
        },
        { headers },
      );
      account = accountResponse.data?.data || accountResponse.data;
    }

    const identitiesResponse = await axios.get(`${bazosBaseUrl}/identities?accountId=${account.id}`, { headers });
    const identities = identitiesResponse.data?.data || identitiesResponse.data || [];
    let identity = Array.isArray(identities)
      ? identities.find((item: any) => item.phoneNumber === phoneNumber || item.phoneNumber === normalizedPhone)
      : undefined;

    if (!identity) {
      const identityResponse = await axios.post(
        `${bazosBaseUrl}/identities`,
        {
          accountId: account.id,
          phoneNumber,
          displayName,
          contactName: displayName,
          contactPhone: phoneNumber,
          defaultLocation: location,
          sessionState: 'missing',
          status: 'draft',
          reviewState: 'clear',
        },
        { headers },
      );
      identity = identityResponse.data?.data || identityResponse.data;
    }

    let verificationSession: any = null;
    if (identity.sessionState !== 'ready' || identity.status !== 'verified') {
      const verificationResponse = await axios.post(
        `${bazosBaseUrl}/verification-sessions`,
        {
          identityId: identity.id,
          operatorUserId: data.operatorUserId,
          notes: 'Started from catalog Sell on Bazos guided flow',
        },
        { headers },
      );
      verificationSession = verificationResponse.data?.data || verificationResponse.data;
    }

    const offerPayload = {
      accountId: account.id,
      identityId: identity.id,
      productId: product.id,
      title: data.title || product.title,
      description: data.description || product.description,
      price: Number(activePrice.basePrice),
      category,
      location,
      stockQuantity: data.stockQuantity ?? 1,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const offerResponse = await axios.post(`${bazosBaseUrl}/offers`, offerPayload, { headers });
    const offer = offerResponse.data?.data || offerResponse.data;
    const offerId = offer?.id;

    if (!offerId) {
      throw new Error('Bazos service did not return an offer id.');
    }

    const queueResponse = await axios.post(
      `${bazosBaseUrl}/offers/${offerId}/enqueue-publish`,
      { identityId: identity.id },
      { headers },
    );

    return {
      success: true,
      productId: product.id,
      account,
      identity,
      verificationSession,
      bazosOffer: offer,
      queue: queueResponse.data,
      nextStep: verificationSession
        ? {
            type: 'human_verification_required',
            message: 'Open the Bazos verification page and complete phone/SMS/CAPTCHA/bank checks manually. After verification, mark the identity verified in Bazos service before final publishing.',
            verificationUrl: verificationSession.verificationUrl,
          }
        : {
            type: 'queued',
            message: 'The verified identity was accepted and the offer is queued for compliant publishing.',
          },
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

