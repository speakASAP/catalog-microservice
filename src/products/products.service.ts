import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In, IsNull, SelectQueryBuilder, EntityManager, Brackets } from 'typeorm';
import { Product, ProductLifecycle } from "./product.entity";
import { LoggerService } from '../logger/logger.service';
import { PricingService, type PricingWriteInput } from '../pricing/pricing.service';
import { AttributesService } from '../attributes/attributes.service';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/category.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductQualityReviewActivateDto,
  ProductQualityReviewBulkUpdateDto,
  ProductQualityReviewExportQueryDto,
  ProductQualityReviewQueryDto,
  type ProductCatalogScope,
  type ProductCatalogSource,
} from './dto';
import type { CatalogActor } from '../auth/catalog-auth.guard';
import { CatalogAccessService, type CatalogSourceSettings } from '../catalog-access/catalog-access.service';
import axios from "axios";
import { ContentRendererService } from '../content-connectors/content-renderer.service';
import {
  cleanPlainText,
  descriptionDocumentFromText,
  descriptionDocumentToPlainText,
  normalizeDescriptionDocument,
} from '../content-connectors/content-document';
import { ProductEventPublisherService } from '../product-events/product-event-publisher.service';
import type {
  CatalogProductEventInput,
  CatalogProductEventProductSnapshot,
  CatalogProductEventType,
} from '../product-events/product-event.types';

type ProductQualitySeverity = "blocking" | "warning";

type ProductQualityAttributePatchEntry = {
  attributeId: string;
  value: string;
};

type ProductQualityCategoryPatch = {
  mode: 'replace' | 'add';
  categoryIds: string[];
};

type ResolvedProductQualityCategoryPatch = {
  mode: 'replace' | 'add';
  categories: Category[];
};

export type ProductQualityIssue = {
  code: string;
  message: string;
  severity: ProductQualitySeverity;
  field?: string;
};

const PRODUCT_QUALITY_POLICY_ID = 'catalog.product_quality.v1';
const PRODUCT_QUALITY_GENERATED_DESCRIPTION_STATE_CONTRACT = 'catalog.generated_description_state.v1';

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
    hasSku: boolean;
    hasTitle: boolean;
    hasDescriptionRich: boolean;
    hasNonPlaceholderImage: boolean;
  };
  descriptionState: {
    contract: typeof PRODUCT_QUALITY_GENERATED_DESCRIPTION_STATE_CONTRACT;
    source: 'description' | 'descriptionRich' | 'missing';
    status: 'present' | 'generated' | 'missing';
    coversMissingDescription: boolean;
  };
};

export type ProductQualityReviewIssue = ProductQualityIssue & {
  source: typeof PRODUCT_QUALITY_POLICY_ID | 'goal02-readiness';
};

export type ProductQualityReviewItem = {
  productId: string;
  sku: string;
  title: string;
  ownerScope: string;
  sourceScope: ProductCatalogSource;
  lifecycle: ProductLifecycle;
  isActive: boolean;
  publishable: boolean;
  canActivate: boolean;
  completionScore: number;
  blockingIssues: ProductQualityReviewIssue[];
  blockingMissingFields: string[];
  optionalOpportunities: ProductQualityReviewIssue[];
  nextAction: string;
  readiness: ProductReadiness;
};

export type ProductQualityReviewResponse = {
  policyId: typeof PRODUCT_QUALITY_POLICY_ID;
  blockers: string[];
  items: ProductQualityReviewItem[];
  total: number;
  page: number;
  limit: number;
};

export type ProductQualityReviewExport = {
  policyId: typeof PRODUCT_QUALITY_POLICY_ID;
  format: 'json' | 'csv' | 'markdown';
  generatedAt: string;
  contentType: string;
  blockers: string[];
  items: ProductQualityReviewItem[];
  content: ProductQualityReviewItem[] | string;
};

export type ProductQualityActivationResult = {
  productId: string;
  sku: string;
  title: string;
  success: boolean;
  activated: boolean;
  blocked: boolean;
  lifecycleBefore: ProductLifecycle;
  lifecycleAfter: ProductLifecycle;
  blockingIssues: ProductQualityReviewIssue[];
  nextAction: string;
  quality: ProductQualityReviewItem;
};

export type ProductQualityActivationResponse = {
  success: boolean;
  policyId: typeof PRODUCT_QUALITY_POLICY_ID;
  requestedProductIds: string[];
  blockers: string[];
  totals: {
    requested: number;
    activated: number;
    blocked: number;
    unchanged: number;
  };
  results: ProductQualityActivationResult[];
};

export type ProductQualityBulkUpdateResult = {
  productId: string;
  sku: string;
  title: string;
  success: boolean;
  updated: boolean;
  blocked: boolean;
  skipped: boolean;
  blockingIssues: ProductQualityReviewIssue[];
  nextAction: string;
  quality: ProductQualityReviewItem;
};

export type ProductQualityBulkUpdateResponse = {
  success: boolean;
  policyId: typeof PRODUCT_QUALITY_POLICY_ID;
  requestedProductIds: string[];
  blockers: string[];
  totals: {
    requested: number;
    updated: number;
    blocked: number;
    skipped: number;
  };
  results: ProductQualityBulkUpdateResult[];
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

export type ProductSalesOrderStatus = {
  status: string;
  currency: string;
  orderCount: number;
  quantitySold: number;
  grossSales: number;
  lastOrderedAt: string | null;
};

export type ProductSalesCountMetric = {
  key: string;
  label: string;
  count: number;
  status: 'available' | 'zero' | 'unavailable';
  unavailableReason?: string;
};

export type ProductDeliveryExceptionMetrics = {
  notReceived: number;
  returned: number;
  delayed: number;
  unfulfilled: number;
};

export type ProductChannelOrderDeliveryStatistics = {
  channel: string;
  lifecycleStages: ProductSalesCountMetric[];
  deliveryExceptions: ProductDeliveryExceptionMetrics;
};

export type ProductOrderDeliveryStatistics = {
  source: 'orders';
  sourceStatus: 'available' | 'unavailable';
  unavailableReason?: string;
  lifecycleStages: ProductSalesCountMetric[];
  paymentStatuses: ProductSalesCountMetric[];
  deliveryStatuses: ProductSalesCountMetric[];
  deliveryExceptions: ProductDeliveryExceptionMetrics;
  channelLifecycle: ProductChannelOrderDeliveryStatistics[];
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
  orderStatuses: ProductSalesOrderStatus[];
  recentHistory: ProductSalesHistoryEvent[];
  orderDelivery: ProductOrderDeliveryStatistics;
  unavailableReason?: string;
};

type CatalogStockPreflight = {
  sellable: boolean;
  quantity: number;
  availability: any | null;
  projection: any | null;
};

type ProductAccessScope = {
  actor?: CatalogActor;
  catalogScope?: ProductCatalogScope;
  catalogSources?: ProductCatalogSource[];
};

type ProductAccessIntent = 'read' | 'mutate';

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
const MISSING_ORDERS_STATS_ENDPOINT = '[MISSING: Orders stats endpoint]';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly logger: LoggerService,
    private readonly pricingService?: PricingService,
    @Optional()
    private readonly contentRendererService?: ContentRendererService,
    @Optional()
    private readonly productEventPublisher?: ProductEventPublisherService,
    @Optional()
    private readonly catalogAccessService?: CatalogAccessService,
    @Optional()
    private readonly attributesService?: AttributesService,
    @Optional()
    private readonly categoriesService?: CategoriesService,
  ) {}

  private canAccessAllProducts(actor?: CatalogActor): boolean {
    if (!actor || actor.type === 'service') {
      return true;
    }
    return actor.roles.some((role) => [
      'global:superadmin',
      'global:platform_admin',
      'app:catalog-microservice:admin',
      'internal:catalog-microservice:admin',
    ].includes(role));
  }

  private resolveOwnerUserId(actor?: CatalogActor): string | null {
    if (!actor || actor.type === 'service') {
      return null;
    }
    return actor.sub;
  }

  private productWhereWithOwner(
    where: FindOptionsWhere<Product>,
    actor?: CatalogActor,
  ): FindOptionsWhere<Product> {
    if (this.canAccessAllProducts(actor)) {
      return where;
    }
    return { ...where, ownerUserId: actor?.sub };
  }

  private applyOwnerScope(queryBuilder: SelectQueryBuilder<Product>, actor?: CatalogActor): void {
    if (this.canAccessAllProducts(actor)) {
      return;
    }
    queryBuilder.andWhere('product.ownerUserId = :ownerUserId', { ownerUserId: actor?.sub });
  }

  private async applyProductReadScope(
    queryBuilder: SelectQueryBuilder<Product>,
    scope: ProductAccessScope = {},
    alias = 'product',
  ): Promise<void> {
    const actor = scope.actor;
    const requestedScope = this.normalizeCatalogScope(scope.catalogScope, actor);
    const requestedSources = this.normalizeCatalogSources(scope.catalogSources);

    if (this.canAccessAllProducts(actor)) {
      this.applyAdminRequestedSourceScope(queryBuilder, requestedScope, alias, requestedSources);
      return;
    }

    const settings = await this.resolveCatalogSettings(actor);
    const ownerParam = `${alias}OwnerUserId`;
    const conditions: string[] = [];
    const parameters: Record<string, unknown> = { [ownerParam]: actor?.sub };

    const addOwn = () => conditions.push(`${alias}.ownerUserId = :${ownerParam}`);
    const addAlfares = () => {
      if (settings.includeAlfaresCatalog) {
        conditions.push(`${alias}.ownerUserId IS NULL`);
      }
    };
    const addCommunity = () => {
      if (settings.includeCommunityCatalog) {
        conditions.push(`(${alias}.ownerUserId IS NOT NULL AND ${alias}.ownerUserId != :${ownerParam} AND ${alias}.resaleEnabled = true)`);
      }
    };

    if (requestedScope === 'own') {
      addOwn();
    } else if (requestedScope === 'alfares') {
      addAlfares();
    } else if (requestedScope === 'community') {
      addCommunity();
    } else {
      addOwn();
      addAlfares();
      addCommunity();
    }

    if (!conditions.length) {
      queryBuilder.andWhere('1 = 0');
      return;
    }

    queryBuilder.andWhere(new Brackets((qb) => {
      conditions.forEach((condition, index) => {
        if (index === 0) {
          qb.where(condition, parameters);
        } else {
          qb.orWhere(condition, parameters);
        }
      });
    }));
  }

  private applyAdminRequestedSourceScope(
    queryBuilder: SelectQueryBuilder<Product>,
    requestedScope: ProductCatalogScope,
    alias: string,
    requestedSources?: ProductCatalogSource[] | null,
  ): void {
    const sourceSet = requestedSources ? new Set(requestedSources) : null;
    const shouldFilter = sourceSet || requestedScope === 'own' || requestedScope === 'alfares' || requestedScope === 'community';

    if (!shouldFilter) {
      return;
    }

    const conditions: string[] = [];
    if ((sourceSet && sourceSet.has('own')) || (!sourceSet && requestedScope === 'own')) {
      conditions.push(`${alias}.ownerUserId IS NOT NULL AND ${alias}.resaleEnabled = false`);
    }
    if ((sourceSet && sourceSet.has('alfares')) || (!sourceSet && requestedScope === 'alfares')) {
      conditions.push(`${alias}.ownerUserId IS NULL`);
    }
    if ((sourceSet && sourceSet.has('community')) || (!sourceSet && requestedScope === 'community')) {
      conditions.push(`${alias}.ownerUserId IS NOT NULL AND ${alias}.resaleEnabled = true`);
    }

    if (!conditions.length) {
      queryBuilder.andWhere('1 = 0');
      return;
    }

    queryBuilder.andWhere(new Brackets((qb) => {
      conditions.forEach((condition, index) => {
        if (index === 0) qb.where(condition);
        else qb.orWhere(condition);
      });
    }));
  }

  private normalizeCatalogSources(sources?: ProductCatalogSource[]): ProductCatalogSource[] | null {
    if (!Array.isArray(sources)) {
      return null;
    }
    const normalized = sources.filter((source): source is ProductCatalogSource => source === 'own' || source === 'alfares' || source === 'community');
    return normalized.length ? Array.from(new Set(normalized)) : [];
  }

  private normalizeCatalogScope(scope: ProductCatalogScope | undefined, actor?: CatalogActor): ProductCatalogScope {
    if (scope === 'own' || scope === 'effective' || scope === 'alfares' || scope === 'community') {
      return scope;
    }
    if (scope === 'all' && this.canAccessAllProducts(actor)) {
      return 'all';
    }
    return this.canAccessAllProducts(actor) ? 'all' : 'effective';
  }

  private async resolveCatalogSettings(actor?: CatalogActor): Promise<CatalogSourceSettings> {
    if (actor?.type === 'jwt' && this.catalogAccessService) {
      return this.catalogAccessService.getSettings(actor);
    }
    return this.catalogAccessService?.defaultSettings(actor) ?? {
      userId: actor?.sub ?? 'anonymous',
      includeAlfaresCatalog: false,
      includeCommunityCatalog: false,
      sourceApplication: null,
      created: false,
    };
  }

  private assertCanMutateProduct(product: Product, scope: ProductAccessScope = {}): void {
    if (this.canAccessAllProducts(scope.actor)) {
      return;
    }
    if (scope.actor?.type === 'jwt' && product.ownerUserId === scope.actor.sub) {
      return;
    }
    throw new ForbiddenException('Only the product owner can modify this catalog product.');
  }

  private async withProductTransaction<T>(
    work: (repository: Repository<Product>, manager?: EntityManager) => Promise<T>,
  ): Promise<T> {
    const manager = (this.productRepository as any).manager as EntityManager | undefined;
    if (manager?.transaction && manager?.getRepository) {
      return manager.transaction(async (transactionManager) =>
        work(transactionManager.getRepository(Product), transactionManager),
      );
    }

    return work(this.productRepository, undefined);
  }

  private async findOneWithRepository(
    repository: Repository<Product>,
    id: string,
    scope: ProductAccessScope = {},
    intent: ProductAccessIntent = 'read',
  ): Promise<Product> {
    if (typeof (repository as any).createQueryBuilder !== 'function') {
      const product = await repository.findOne({
        where: this.productWhereWithOwner({ id }, scope.actor),
        relations: ['categories', 'attributes', 'attributes.attribute', 'media', 'pricing'],
      });
      if (!product) {
        this.logger.warn(`Product not found: ${id}`, 'ProductsService');
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      if (intent === 'mutate') {
        this.assertCanMutateProduct(product, scope);
      }
      return product;
    }

    const queryBuilder = repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.attributes', 'attributes')
      .leftJoinAndSelect('attributes.attribute', 'attribute')
      .leftJoinAndSelect('product.media', 'media')
      .leftJoinAndSelect('product.pricing', 'pricing')
      .where('product.id = :id', { id });

    if (intent === 'mutate') {
      this.applyOwnerScope(queryBuilder, scope.actor);
    } else {
      await this.applyProductReadScope(queryBuilder, scope);
    }

    const product = await queryBuilder.getOne();

    if (!product) {
      this.logger.warn(`Product not found: ${id}`, 'ProductsService');
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (intent === 'mutate') {
      this.assertCanMutateProduct(product, scope);
    }

    return product;
  }

  private async recordProductEvents(
    manager: EntityManager | undefined,
    events: CatalogProductEventInput[],
  ): Promise<void> {
    if (!this.productEventPublisher || events.length === 0) {
      return;
    }

    await this.productEventPublisher.recordProductEvents(manager, events);
  }

  private productEventInput(
    eventType: CatalogProductEventType,
    product: CatalogProductEventProductSnapshot,
    scope: ProductAccessScope,
    changedFields: string[],
    change: Record<string, unknown>,
  ): CatalogProductEventInput {
    return {
      eventType,
      productId: product.id,
      product,
      actor: scope.actor,
      changedFields: Array.from(new Set(changedFields)).sort(),
      change,
    };
  }

  private productUpdateEvents(
    before: CatalogProductEventProductSnapshot,
    after: CatalogProductEventProductSnapshot,
    changedFields: string[],
    scope: ProductAccessScope,
    operation: string,
  ): CatalogProductEventInput[] {
    const events: CatalogProductEventInput[] = [
      this.productEventInput('catalog.product.updated.v1', after, scope, changedFields, {
        operation,
        before,
        after,
      }),
    ];

    const archivedTransition = !this.isArchivedForEvent(before) && this.isArchivedForEvent(after);
    if (archivedTransition) {
      events.push(...this.productArchiveEvents(before, after, scope, operation));
    }

    if (!this.sameCategoryIds(before.categoryIds, after.categoryIds)) {
      events.push(this.productEventInput('catalog.product.category_changed.v1', after, scope, ['categories'], {
        operation,
        beforeCategoryIds: before.categoryIds,
        afterCategoryIds: after.categoryIds,
        addedCategoryIds: after.categoryIds.filter((id) => !before.categoryIds.includes(id)),
        removedCategoryIds: before.categoryIds.filter((id) => !after.categoryIds.includes(id)),
      }));
    }

    if (!archivedTransition && this.isSellableForEvent(before) !== this.isSellableForEvent(after)) {
      events.push(this.sellabilityChangedEvent(before, after, scope, operation));
    }

    return events;
  }

  private productArchiveEvents(
    before: CatalogProductEventProductSnapshot,
    after: CatalogProductEventProductSnapshot,
    scope: ProductAccessScope,
    operation: string,
  ): CatalogProductEventInput[] {
    const events = [
      this.productEventInput('catalog.product.archived.v1', after, scope, ['isActive', 'lifecycle'], {
        operation,
        before,
        after,
      }),
    ];

    if (this.isSellableForEvent(before) !== this.isSellableForEvent(after)) {
      events.push(this.sellabilityChangedEvent(before, after, scope, operation));
    }

    return events;
  }

  private sellabilityChangedEvent(
    before: CatalogProductEventProductSnapshot,
    after: CatalogProductEventProductSnapshot,
    scope: ProductAccessScope,
    operation: string,
  ): CatalogProductEventInput {
    return this.productEventInput('catalog.product.sellability_changed.v1', after, scope, ['isActive', 'lifecycle'], {
      operation,
      beforeSellable: this.isSellableForEvent(before),
      afterSellable: this.isSellableForEvent(after),
      beforeLifecycle: before.lifecycle,
      afterLifecycle: after.lifecycle,
      beforeIsActive: before.isActive,
      afterIsActive: after.isActive,
    });
  }

  private snapshotProductForEvent(product: Product): CatalogProductEventProductSnapshot {
    return {
      id: product.id,
      sku: product.sku,
      title: product.title,
      ownerUserId: product.ownerUserId ?? null,
      lifecycle: product.lifecycle ?? null,
      isActive: product.isActive !== false,
      categoryIds: (product.categories || []).map((category) => category.id).filter(Boolean).sort(),
      updatedAt: product.updatedAt instanceof Date
        ? product.updatedAt.toISOString()
        : product.updatedAt
          ? String(product.updatedAt)
          : null,
    };
  }

  private changedProductFields(
    updateProductDto: UpdateProductDto,
    before: CatalogProductEventProductSnapshot,
    after: CatalogProductEventProductSnapshot,
  ): string[] {
    const fields = new Set(Object.keys(updateProductDto));
    if (before.lifecycle !== after.lifecycle) {
      fields.add('lifecycle');
    }
    if (before.isActive !== after.isActive) {
      fields.add('isActive');
    }
    if (!this.sameCategoryIds(before.categoryIds, after.categoryIds)) {
      fields.add('categories');
    }
    return Array.from(fields).sort();
  }

  private isArchivedForEvent(product: CatalogProductEventProductSnapshot): boolean {
    return product.lifecycle === 'archived' || product.isActive === false;
  }

  private isSellableForEvent(product: CatalogProductEventProductSnapshot): boolean {
    return product.isActive !== false && product.lifecycle === 'active';
  }

  private sameCategoryIds(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index]);
  }

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto, scope: ProductAccessScope = {}): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`, 'ProductsService');

    const saved = await this.withProductTransaction(async (repository, manager) => {
      const product = repository.create({
        ...this.withResaleDefaults(this.withLifecycleDefaults(this.withCanonicalContentDefaults(createProductDto))),
        ownerUserId: this.resolveOwnerUserId(scope.actor),
      });
      const created = await repository.save(product);
      const snapshot = this.snapshotProductForEvent(created);
      await this.recordProductEvents(manager, [
        this.productEventInput('catalog.product.upserted.v1', snapshot, scope, Object.keys(createProductDto), {
          operation: 'create',
          before: null,
          after: snapshot,
        }),
      ]);
      return created;
    });

    this.logger.log(`Product created: ${saved.id}`, 'ProductsService');
    return saved;
  }

  /**
   * Find all products with pagination and filters
   */
  async findAll(query: ProductQueryDto, scope: ProductAccessScope = {}): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, search, isActive, lifecycle, categoryId, catalogScope, catalogSources, supplierId } = query;
    const skip = (page - 1) * limit;

    this.logger.log(`Finding products: page=${page}, limit=${limit}, search=${search}`, 'ProductsService');

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

    await this.applyProductReadScope(queryBuilder, { ...scope, catalogScope, catalogSources });

    // Filter by category
    if (categoryId) {
      queryBuilder
        .innerJoin('product.categories', 'category')
        .andWhere('category.id = :categoryId', { categoryId });
    }

    if (supplierId) {
      const candidateRows = await queryBuilder
        .clone()
        .select('product.id', 'id')
        .orderBy('product.createdAt', 'DESC')
        .getRawMany<{ id: string }>();
      const supplierProductIds = await this.filterProductIdsBySupplier(
        candidateRows.map((row) => row.id).filter(Boolean),
        supplierId,
      );

      if (supplierProductIds.length === 0) {
        return { items: [], total: 0, page, limit };
      }

      queryBuilder.andWhere('product.id IN (:...supplierProductIds)', { supplierProductIds });
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

    this.logger.log(`Found ${total} products`);

    return { items, total, page, limit };
  }

  /**
   * Find one product by ID
   */
  async findOne(id: string, scope: ProductAccessScope = {}): Promise<Product> {
    this.logger.log(`Finding product: ${id}`, 'ProductsService');
    return this.findOneWithRepository(this.productRepository, id, scope);
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string, scope: ProductAccessScope = {}): Promise<Product | null> {
    this.logger.log(`Finding product by SKU: ${sku}`, 'ProductsService');

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.media', 'media')
      .leftJoinAndSelect('product.pricing', 'pricing')
      .where('product.sku = :sku', { sku });
    await this.applyProductReadScope(queryBuilder, scope);
    return queryBuilder.getOne();
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


  async getSalesStatistics(id: string, scope: ProductAccessScope = {}): Promise<ProductSalesStatistics> {
    await this.findOne(id, scope);

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
  async update(id: string, updateProductDto: UpdateProductDto, scope: ProductAccessScope = {}): Promise<Product> {
    this.logger.log(`Updating product: ${id}`, 'ProductsService');

    const updated = await this.withProductTransaction(async (repository, manager) => {
      const product = await this.findOneWithRepository(repository, id, scope, 'mutate');
      const before = this.snapshotProductForEvent(product);
      Object.assign(product, this.withResaleDefaults(this.withLifecycleDefaults(this.withCanonicalContentDefaults(updateProductDto, product), product), product));
      await this.assertProductQualityAllowsActivation(product, updateProductDto);

      const saved = await repository.save(product);
      const after = this.snapshotProductForEvent(saved);
      const changedFields = this.changedProductFields(updateProductDto, before, after);
      await this.recordProductEvents(manager, this.productUpdateEvents(before, after, changedFields, scope, 'update'));
      return saved;
    });
    this.logger.log(`Product updated: ${id}`, 'ProductsService');

    return updated;
  }


  async getReadiness(id: string, scope: ProductAccessScope = {}): Promise<ProductReadiness> {
    const product = await this.findOne(id, scope);
    const duplicateSummary = await this.getDuplicateSummaryForProduct(product);
    return this.buildReadiness(product, duplicateSummary);
  }

  async getProductQualityReview(
    query: ProductQualityReviewQueryDto = {},
    scope: ProductAccessScope = {},
  ): Promise<ProductQualityReviewResponse> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(Math.max(1, Number(query.limit || 50)), 200);
    const products = await this.findProductsForQualityReview(query, scope);
    const items: ProductQualityReviewItem[] = [];

    for (const product of products) {
      items.push(await this.buildProductQualityReviewItem(product));
    }

    const filtered = items.filter((item) => this.matchesProductQualityReviewFilter(item, query));
    const start = (page - 1) * limit;

    return {
      policyId: PRODUCT_QUALITY_POLICY_ID,
      blockers: [],
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  async exportProductQualityReview(
    query: ProductQualityReviewExportQueryDto = {},
    scope: ProductAccessScope = {},
  ): Promise<ProductQualityReviewExport> {
    const format = query.format || 'json';
    const review = await this.getProductQualityReview({ ...query, page: 1, limit: 200 }, scope);
    const generatedAt = new Date().toISOString();

    if (format === 'csv') {
      return {
        policyId: PRODUCT_QUALITY_POLICY_ID,
        format,
        generatedAt,
        contentType: 'text/csv',
        blockers: review.blockers,
        items: review.items,
        content: this.productQualityReviewCsv(review.items),
      };
    }

    if (format === 'markdown') {
      return {
        policyId: PRODUCT_QUALITY_POLICY_ID,
        format,
        generatedAt,
        contentType: 'text/markdown',
        blockers: review.blockers,
        items: review.items,
        content: this.productQualityReviewMarkdown(review.items, generatedAt),
      };
    }

    return {
      policyId: PRODUCT_QUALITY_POLICY_ID,
      format: 'json',
      generatedAt,
      contentType: 'application/json',
      blockers: review.blockers,
      items: review.items,
      content: review.items,
    };
  }

  async bulkUpdateProductsAfterQualityReview(
    data: ProductQualityReviewBulkUpdateDto,
    scope: ProductAccessScope = {},
  ): Promise<ProductQualityBulkUpdateResponse> {
    const productIds = this.normalizeBulkProductIds(data?.productIds || []);
    if (!productIds.length) {
      throw new BadRequestException('Product quality bulk update requires at least one product id');
    }

    if (productIds.length > 50 && data?.humanReview !== 'explicit') {
      throw new BadRequestException('Updating more than 50 products requires humanReview: explicit');
    }

    const patch = this.allowedProductQualityBulkPatch(data?.patch || {});
    const pricingPatch = this.normalizeProductQualityPricingPatch(data?.pricingPatch);
    const attributePatch = this.normalizeProductQualityAttributePatch(data?.attributePatch);
    const categoryPatch = this.normalizeProductQualityCategoryPatch(data?.categoryPatch);
    const hasProductPatch = Object.keys(patch).length > 0;
    const hasPricingPatch = Boolean(pricingPatch);
    const hasAttributePatch = attributePatch.length > 0;
    const hasCategoryPatch = Boolean(categoryPatch);

    if (!hasProductPatch && !hasPricingPatch && !hasAttributePatch && !hasCategoryPatch) {
      throw new BadRequestException('Product quality bulk update requires at least one allowlisted product, category, attribute, or pricing patch field');
    }

    const pricingService = hasPricingPatch ? this.requireProductQualityPricingService() : undefined;
    const resolvedCategoryPatch = categoryPatch ? await this.resolveProductQualityCategoryPatch(categoryPatch) : undefined;
    if (hasAttributePatch) {
      await this.assertProductQualityAttributePatchSupported(attributePatch);
    }

    const results: Array<ProductQualityBulkUpdateResult | undefined> = [];
    const candidates: Array<{ index: number; product: Product }> = [];

    for (const [index, productId] of productIds.entries()) {
      const product = await this.findOneWithRepository(this.productRepository, productId, scope, 'mutate');
      const beforeQuality = await this.buildProductQualityReviewItem(product);
      if (data?.expectedMissingField && !this.qualityItemHasField(beforeQuality, data.expectedMissingField)) {
        results[index] = {
          productId: product.id,
          sku: product.sku,
          title: product.title,
          success: false,
          updated: false,
          blocked: false,
          skipped: true,
          blockingIssues: beforeQuality.blockingIssues,
          nextAction: `skipped_expected_missing_field:${data.expectedMissingField}`,
          quality: beforeQuality,
        };
        continue;
      }

      candidates.push({ index, product });
    }

    const pricingUpdatedProductIds = new Set<string>();
    if (pricingPatch && candidates.length > 0) {
      const pricingEntries = candidates.map(({ product }) => ({
        ...pricingPatch,
        productId: product.id,
      }));
      await pricingService!.bulkUpsert(pricingEntries, data?.humanReview);
      for (const { product } of candidates) {
        pricingUpdatedProductIds.add(product.id);
      }
    }

    for (const { index, product } of candidates) {
      let latest = product;
      if (hasProductPatch) {
        latest = await this.update(product.id, patch, scope);
      }
      if (resolvedCategoryPatch) {
        latest = await this.applyProductQualityCategoryPatch(product.id, resolvedCategoryPatch, scope);
      }
      if (hasAttributePatch) {
        await this.applyProductQualityAttributePatch(product.id, attributePatch);
      }

      latest = await this.findOneWithRepository(this.productRepository, product.id, scope);
      const quality = await this.buildProductQualityReviewItem(latest);
      results[index] = {
        productId: latest.id,
        sku: latest.sku,
        title: latest.title,
        success: true,
        updated: hasProductPatch || hasCategoryPatch || hasAttributePatch || pricingUpdatedProductIds.has(product.id),
        blocked: false,
        skipped: false,
        blockingIssues: quality.blockingIssues,
        nextAction: quality.nextAction,
        quality,
      };
    }

    const finalResults = results.filter((result): result is ProductQualityBulkUpdateResult => Boolean(result));

    return {
      success: finalResults.every((result) => result.success || result.skipped),
      policyId: PRODUCT_QUALITY_POLICY_ID,
      requestedProductIds: productIds,
      blockers: [],
      totals: {
        requested: productIds.length,
        updated: finalResults.filter((result) => result.updated).length,
        blocked: finalResults.filter((result) => result.blocked).length,
        skipped: finalResults.filter((result) => result.skipped).length,
      },
      results: finalResults,
    };
  }

  async activateProductsAfterQualityReview(
    data: ProductQualityReviewActivateDto,
    scope: ProductAccessScope = {},
  ): Promise<ProductQualityActivationResponse> {
    const productIds = this.normalizeBulkProductIds(data?.productIds || []);
    if (!productIds.length) {
      throw new BadRequestException('Product quality activation requires at least one product id');
    }

    if (productIds.length > 10 && data?.humanReview !== 'explicit') {
      throw new BadRequestException('Activating more than 10 products requires humanReview: explicit');
    }

    const results: ProductQualityActivationResult[] = [];
    for (const productId of productIds) {
      const product = await this.findOneWithRepository(this.productRepository, productId, scope, 'mutate');
      const quality = await this.buildProductQualityReviewItem(product);
      const lifecycleBefore = this.resolveLifecycle(product);

      if (!quality.canActivate) {
        results.push({
          productId: product.id,
          sku: product.sku,
          title: product.title,
          success: false,
          activated: false,
          blocked: true,
          lifecycleBefore,
          lifecycleAfter: lifecycleBefore,
          blockingIssues: quality.blockingIssues,
          nextAction: quality.nextAction,
          quality,
        });
        continue;
      }

      const alreadyActive = lifecycleBefore === 'active' && product.isActive !== false;
      const saved = alreadyActive
        ? product
        : await this.update(product.id, { lifecycle: 'active', isActive: true }, scope);
      const refreshedQuality = alreadyActive ? quality : await this.buildProductQualityReviewItem(saved);
      const lifecycleAfter = this.resolveLifecycle(saved);

      results.push({
        productId: saved.id,
        sku: saved.sku,
        title: saved.title,
        success: true,
        activated: !alreadyActive,
        blocked: false,
        lifecycleBefore,
        lifecycleAfter,
        blockingIssues: [],
        nextAction: alreadyActive ? 'already_active' : 'activated',
        quality: refreshedQuality,
      });
    }

    const activated = results.filter((result) => result.activated).length;
    const blocked = results.filter((result) => result.blocked).length;
    return {
      success: blocked === 0,
      policyId: PRODUCT_QUALITY_POLICY_ID,
      requestedProductIds: productIds,
      blockers: [],
      totals: {
        requested: productIds.length,
        activated,
        blocked,
        unchanged: results.filter((result) => result.success && !result.activated).length,
      },
      results,
    };
  }

  async getQualityAudit(scope: ProductAccessScope = {}): Promise<ProductIdentifierAudit> {
    const missingEanRows = await this.productRepository
      .createQueryBuilder("product")
      .select(["product.id", "product.sku", "product.title"])
      .where("product.ean IS NULL OR length(btrim(product.ean)) = 0")
    this.applyOwnerScope(missingEanRows, scope.actor);
    const missingEanProducts = await missingEanRows
      .orderBy("product.createdAt", "DESC")
      .getMany();

    const duplicateSkuRows = this.productRepository
      .createQueryBuilder("product")
      .select("product.sku", "sku")
      .addSelect("COUNT(*)", "count")
      .where("product.sku IS NOT NULL AND length(btrim(product.sku)) > 0")
    this.applyOwnerScope(duplicateSkuRows, scope.actor);
    const duplicateSkus = await duplicateSkuRows
      .groupBy("product.sku")
      .addGroupBy("product.ownerUserId")
      .having("COUNT(*) > 1")
      .getRawMany<{ sku: string; count: string }>();

    const duplicateEanRows = this.productRepository
      .createQueryBuilder("product")
      .select("product.ean", "ean")
      .addSelect("COUNT(*)", "count")
      .where("product.ean IS NOT NULL AND length(btrim(product.ean)) > 0")
    this.applyOwnerScope(duplicateEanRows, scope.actor);
    const duplicateEans = await duplicateEanRows
      .groupBy("product.ean")
      .addGroupBy("product.ownerUserId")
      .having("COUNT(*) > 1")
      .getRawMany<{ ean: string; count: string }>();

    return {
      missingEan: missingEanProducts.map((product) => ({
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

    if (!current) {
      next.lifecycle = "draft";
      next.isActive = false;
      return next;
    }

    if (!next.lifecycle) {
      if (next.isActive === false) {
        next.lifecycle = "archived";
      } else if (next.isActive === true && current.lifecycle === "archived") {
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

  private withResaleDefaults<T extends Partial<Product>>(data: T, current?: Product): T {
    const next = { ...data };
    if (!current && next.resaleEnabled === undefined) {
      next.resaleEnabled = false;
    }
    if (current?.ownerUserId === null && next.resaleEnabled === undefined) {
      next.resaleEnabled = false;
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

  private async buildReadiness(
    product: Product,
    duplicateSummary: { duplicateSku: boolean; duplicateEan: boolean },
  ): Promise<ProductReadiness> {
    const lifecycle = this.resolveLifecycle(product);
    const descriptionRichText = descriptionDocumentToPlainText(product.descriptionRich);
    const hasSku = Boolean(product.sku?.trim());
    const hasTitle = Boolean(product.title?.trim());
    const hasEan = Boolean(product.ean?.trim());
    const hasMedia = Boolean(product.media?.length);
    const hasPlaceholderMedia = Boolean(product.media?.some((media) => this.isPlaceholderMedia(media)));
    const hasNonPlaceholderImage = Boolean(product.media?.some((media) => this.isProductImageMedia(media) && !this.isPlaceholderMedia(media)));
    const hasCurrentPrice = await this.hasPositiveCurrentPrice(product);
    const hasCategory = Boolean(product.categories?.length);
    const hasDescriptionRich = Boolean(descriptionRichText.trim());
    const descriptionState = this.resolveGeneratedDescriptionState(product, descriptionRichText);
    const hasDescription = descriptionState.coversMissingDescription;
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
    if (!hasSku) {
      issues.push({ code: "missing_sku", field: "sku", severity: "blocking", message: "SKU is required for activation and publishability." });
    }
    if (!hasTitle) {
      issues.push({ code: "missing_title", field: "title", severity: "blocking", message: "Title is required for activation and publishability." });
    }
    if (!hasEan) {
      issues.push({ code: "missing_ean", field: "ean", severity: "warning", message: "EAN is missing." });
    }
    if (duplicateSummary.duplicateEan) {
      issues.push({ code: "duplicate_ean", field: "ean", severity: "warning", message: "EAN is shared by multiple products." });
    }
    if (duplicateSummary.duplicateSku) {
      issues.push({ code: "duplicate_sku", field: "sku", severity: "blocking", message: "SKU is shared by multiple products." });
    }
    if (!hasDescription) {
      issues.push({ code: "missing_description", field: "description", severity: "blocking", message: `Description is required unless covered by ${PRODUCT_QUALITY_GENERATED_DESCRIPTION_STATE_CONTRACT}.` });
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
    if (!hasNonPlaceholderImage && hasPlaceholderMedia) {
      issues.push({ code: "placeholder_image_only", field: "media", severity: "blocking", message: "Placeholder image media cannot satisfy product quality activation." });
    } else if (!hasNonPlaceholderImage) {
      issues.push({ code: "missing_image", field: "media", severity: "blocking", message: "At least one non-placeholder image is required for activation and publishability." });
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
        hasSku,
        hasTitle,
        hasDescriptionRich,
        hasNonPlaceholderImage,
      },
      descriptionState,
    };
  }

  private resolveGeneratedDescriptionState(
    product: Product,
    descriptionRichText: string,
  ): ProductReadiness['descriptionState'] {
    if (descriptionRichText.trim()) {
      return {
        contract: PRODUCT_QUALITY_GENERATED_DESCRIPTION_STATE_CONTRACT,
        source: 'descriptionRich',
        status: 'generated',
        coversMissingDescription: true,
      };
    }

    if (product.description?.trim()) {
      return {
        contract: PRODUCT_QUALITY_GENERATED_DESCRIPTION_STATE_CONTRACT,
        source: 'description',
        status: 'present',
        coversMissingDescription: true,
      };
    }

    return {
      contract: PRODUCT_QUALITY_GENERATED_DESCRIPTION_STATE_CONTRACT,
      source: 'missing',
      status: 'missing',
      coversMissingDescription: false,
    };
  }

  private async findProductsForQualityReview(
    query: ProductQualityReviewQueryDto,
    scope: ProductAccessScope,
  ): Promise<Product[]> {
    const { search, isActive, lifecycle, categoryId, catalogScope, catalogSources } = query;
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (search) {
      queryBuilder.where(
        '(product.title ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive });
    }

    if (lifecycle) {
      queryBuilder.andWhere('product.lifecycle = :lifecycle', { lifecycle });
    }

    await this.applyProductReadScope(queryBuilder, { ...scope, catalogScope, catalogSources });

    if (categoryId) {
      queryBuilder
        .innerJoin('product.categories', 'category')
        .andWhere('category.id = :categoryId', { categoryId });
    }

    return queryBuilder
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.media', 'media')
      .leftJoinAndSelect('product.pricing', 'pricing')
      .orderBy('product.updatedAt', 'DESC')
      .getMany();
  }

  private async buildProductQualityReviewItem(product: Product): Promise<ProductQualityReviewItem> {
    const duplicateSummary = await this.getDuplicateSummaryForProduct(product);
    const readiness = await this.buildReadiness(product, duplicateSummary);
    const blockingIssues = this.productQualityActivationBlockers(readiness).map((issue) => this.asProductQualityReviewIssue(issue));
    const optionalOpportunities = this.productQualityOptionalOpportunities(product, readiness);
    const blockingMissingFields = Array.from(new Set(blockingIssues.map((issue) => this.productQualityFieldKey(issue))));

    return {
      productId: product.id,
      sku: product.sku,
      title: product.title,
      ownerScope: this.maskOwnerScope(product.ownerUserId),
      sourceScope: this.productSourceScope(product),
      lifecycle: readiness.lifecycle,
      isActive: product.isActive !== false,
      publishable: readiness.publishable,
      canActivate: blockingIssues.length === 0,
      completionScore: this.productQualityCompletionScore(blockingIssues, optionalOpportunities),
      blockingIssues,
      blockingMissingFields,
      optionalOpportunities,
      nextAction: this.productQualityNextAction(blockingIssues),
      readiness,
    };
  }

  private productQualityActivationBlockers(readiness: ProductReadiness): ProductQualityIssue[] {
    return readiness.issues.filter((issue) => {
      if (issue.severity !== 'blocking') {
        return false;
      }
      return !['draft_product', 'needs_review', 'inactive_product'].includes(issue.code);
    });
  }

  private productQualityOptionalOpportunities(product: Product, readiness: ProductReadiness): ProductQualityReviewIssue[] {
    const opportunities = readiness.issues
      .filter((issue) => issue.severity !== 'blocking')
      .map((issue) => this.asProductQualityReviewIssue(issue, 'goal02-readiness'));

    if (!product.brand?.trim()) {
      opportunities.push(this.asProductQualityReviewIssue({
        code: 'missing_brand',
        field: 'brand',
        severity: 'warning',
        message: 'Brand is missing.',
      }));
    }
    if (!product.manufacturer?.trim()) {
      opportunities.push(this.asProductQualityReviewIssue({
        code: 'missing_manufacturer',
        field: 'manufacturer',
        severity: 'warning',
        message: 'Manufacturer is missing.',
      }));
    }
    if (!Array.isArray(product.tags) || product.tags.length === 0) {
      opportunities.push(this.asProductQualityReviewIssue({
        code: 'missing_tags',
        field: 'tags',
        severity: 'warning',
        message: 'Tags are missing.',
      }));
    }

    return opportunities;
  }

  private asProductQualityReviewIssue(
    issue: ProductQualityIssue,
    source: typeof PRODUCT_QUALITY_POLICY_ID | 'goal02-readiness' = PRODUCT_QUALITY_POLICY_ID,
  ): ProductQualityReviewIssue {
    return { ...issue, source };
  }

  private matchesProductQualityReviewFilter(item: ProductQualityReviewItem, query: ProductQualityReviewQueryDto): boolean {
    const missingField = String(query.missingField || '').trim();
    if (missingField && missingField !== 'any') {
      const issues = query.severity === 'optional' ? item.optionalOpportunities : item.blockingIssues;
      if (!issues.some((issue) => issue.code === missingField || issue.field === missingField || this.productQualityFieldKey(issue) === missingField)) {
        return false;
      }
    }

    if (query.severity === 'blocking') {
      return item.blockingIssues.length > 0;
    }
    if (query.severity === 'optional') {
      return item.optionalOpportunities.length > 0;
    }
    return true;
  }

  private productQualityCompletionScore(
    blockingIssues: ProductQualityReviewIssue[],
    optionalOpportunities: ProductQualityReviewIssue[],
  ): number {
    const requiredFields = new Set(['sku', 'title', 'description', 'price', 'image']);
    for (const issue of blockingIssues) {
      requiredFields.delete(this.productQualityFieldKey(issue));
    }
    const requiredScore = (requiredFields.size / 5) * 85;
    const optionalPenalty = Math.min(optionalOpportunities.length * 3, 15);
    return Math.max(0, Math.round(requiredScore + 15 - optionalPenalty));
  }

  private productQualityNextAction(blockingIssues: ProductQualityReviewIssue[]): string {
    if (!blockingIssues.length) {
      return 'ready_for_activation';
    }
    const fields = Array.from(new Set(blockingIssues.map((issue) => this.productQualityFieldKey(issue)))).join(',');
    return `resolve_blockers:${fields}`;
  }

  private productQualityFieldKey(issue: ProductQualityIssue): string {
    if (issue.code === 'missing_current_price') {
      return 'price';
    }
    if (issue.code === 'missing_image' || issue.code === 'placeholder_image_only') {
      return 'image';
    }
    return issue.field || issue.code;
  }

  private maskOwnerScope(ownerUserId: string | null | undefined): string {
    if (!ownerUserId) {
      return 'alfares';
    }
    const value = String(ownerUserId);
    if (value.length <= 8) {
      return 'owner:masked';
    }
    return `owner:${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  private productSourceScope(product: Product): ProductCatalogSource {
    if (!product.ownerUserId) {
      return 'alfares';
    }
    return product.resaleEnabled ? 'community' : 'own';
  }

  private allowedProductQualityBulkPatch(patch: Partial<UpdateProductDto>): Partial<UpdateProductDto> {
    const allowedKeys: Array<keyof UpdateProductDto> = [
      'title',
      'description',
      'descriptionRich',
      'brand',
      'manufacturer',
      'ean',
      'weightKg',
      'dimensionsCm',
      'seoData',
      'tags',
      'resaleEnabled',
      'lifecycle',
      'isActive',
    ];
    const allowed: Partial<UpdateProductDto> = {};
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        (allowed as any)[key] = (patch as any)[key];
      }
    }
    return allowed;
  }

  private normalizeProductQualityPricingPatch(patch: Record<string, unknown> | undefined): Partial<PricingWriteInput> | null {
    const payload = this.nonEmptyProductQualityPatchObject(patch, 'pricingPatch');
    if (!payload) {
      return null;
    }

    const allowedKeys = new Set([
      'basePrice',
      'costPrice',
      'salePrice',
      'currency',
      'priceType',
      'validFrom',
      'validTo',
      'isActive',
      'marginPercent',
    ]);
    const normalized: Partial<PricingWriteInput> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Product quality pricingPatch field is not allowlisted: ${key}`);
      }
      (normalized as Record<string, unknown>)[key] = value;
    }

    return normalized;
  }

  private normalizeProductQualityAttributePatch(patch: Record<string, unknown> | undefined): ProductQualityAttributePatchEntry[] {
    const payload = this.nonEmptyProductQualityPatchObject(patch, 'attributePatch');
    if (!payload) {
      return [];
    }

    const values = this.attributePatchValues(payload);
    return Object.entries(values).map(([attributeId, rawValue]) => {
      const id = attributeId.trim();
      if (!id) {
        throw new BadRequestException('Product quality attributePatch attribute id must be non-empty');
      }
      if (rawValue === null || rawValue === undefined || typeof rawValue === 'object') {
        throw new BadRequestException('Product quality attributePatch values must be string, number, or boolean');
      }
      const value = String(rawValue).trim();
      if (!value) {
        throw new BadRequestException('Product quality attributePatch values must be non-empty');
      }
      return { attributeId: id, value };
    });
  }

  private attributePatchValues(payload: Record<string, unknown>): Record<string, unknown> {
    if (Object.prototype.hasOwnProperty.call(payload, 'values')) {
      const keys = Object.keys(payload);
      if (keys.length !== 1 || !this.isProductQualityPatchObject(payload.values)) {
        throw new BadRequestException('Product quality attributePatch.values must be the only field and must be an object');
      }
      return payload.values;
    }
    return payload;
  }

  private normalizeProductQualityCategoryPatch(patch: Record<string, unknown> | undefined): ProductQualityCategoryPatch | null {
    const payload = this.nonEmptyProductQualityPatchObject(patch, 'categoryPatch');
    if (!payload) {
      return null;
    }

    const allowedKeys = new Set(['categoryId', 'categoryIds', 'mode']);
    for (const key of Object.keys(payload)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Product quality categoryPatch field is not allowlisted: ${key}`);
      }
    }

    const mode = payload.mode === undefined ? 'replace' : String(payload.mode).trim();
    if (mode !== 'replace' && mode !== 'add') {
      throw new BadRequestException('Product quality categoryPatch.mode must be replace or add');
    }

    const ids: string[] = [];
    if (payload.categoryId !== undefined) {
      ids.push(this.normalizeProductQualityCategoryId(payload.categoryId));
    }
    if (payload.categoryIds !== undefined) {
      if (!Array.isArray(payload.categoryIds)) {
        throw new BadRequestException('Product quality categoryPatch.categoryIds must be an array');
      }
      ids.push(...payload.categoryIds.map((categoryId) => this.normalizeProductQualityCategoryId(categoryId)));
    }

    const categoryIds = Array.from(new Set(ids.filter(Boolean)));
    if (categoryIds.length === 0) {
      throw new BadRequestException('Product quality categoryPatch requires categoryId or categoryIds');
    }

    return { mode, categoryIds };
  }

  private normalizeProductQualityCategoryId(categoryId: unknown): string {
    if (typeof categoryId !== 'string') {
      throw new BadRequestException('Product quality category ids must be strings');
    }
    const normalized = categoryId.trim();
    if (!normalized) {
      throw new BadRequestException('Product quality category ids must be non-empty');
    }
    return normalized;
  }

  private nonEmptyProductQualityPatchObject(value: Record<string, unknown> | undefined, field: string): Record<string, unknown> | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (!this.isProductQualityPatchObject(value)) {
      throw new BadRequestException(`Product quality ${field} must be an object`);
    }
    return Object.keys(value).length > 0 ? value : null;
  }

  private isProductQualityPatchObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private requireProductQualityPricingService(): PricingService {
    if (!this.pricingService) {
      throw new BadRequestException('Product quality pricingPatch cannot be applied because PricingService is unavailable. [MISSING: Goal 25 pricing bulk delegation dependency]');
    }
    return this.pricingService;
  }

  private requireProductQualityAttributesService(): AttributesService {
    if (!this.attributesService) {
      throw new BadRequestException('Product quality attributePatch cannot be applied because AttributesService is unavailable. [MISSING: Goal 25 attribute bulk delegation dependency]');
    }
    return this.attributesService;
  }

  private requireProductQualityCategoriesService(): CategoriesService {
    if (!this.categoriesService) {
      throw new BadRequestException('Product quality categoryPatch cannot be applied because CategoriesService is unavailable. [MISSING: Goal 25 category bulk delegation dependency]');
    }
    return this.categoriesService;
  }

  private async assertProductQualityAttributePatchSupported(entries: ProductQualityAttributePatchEntry[]): Promise<void> {
    const attributesService = this.requireProductQualityAttributesService();
    for (const entry of entries) {
      const attribute = await attributesService.findOne(entry.attributeId);
      if (attribute.isActive === false) {
        throw new BadRequestException(`Product quality attributePatch cannot use inactive attribute: ${entry.attributeId}`);
      }
    }
  }

  private async applyProductQualityAttributePatch(
    productId: string,
    entries: ProductQualityAttributePatchEntry[],
  ): Promise<void> {
    const attributesService = this.requireProductQualityAttributesService();
    for (const entry of entries) {
      await attributesService.setProductAttribute(productId, entry.attributeId, entry.value);
    }
  }

  private async resolveProductQualityCategoryPatch(
    patch: ProductQualityCategoryPatch,
  ): Promise<ResolvedProductQualityCategoryPatch> {
    const categoriesService = this.requireProductQualityCategoriesService();
    const categories: Category[] = [];
    for (const categoryId of patch.categoryIds) {
      const category = await categoriesService.findOne(categoryId);
      if (category.isActive === false) {
        throw new BadRequestException(`Product quality categoryPatch cannot use inactive category: ${categoryId}`);
      }
      categories.push(category);
    }
    return { mode: patch.mode, categories };
  }

  private async applyProductQualityCategoryPatch(
    productId: string,
    patch: ResolvedProductQualityCategoryPatch,
    scope: ProductAccessScope,
  ): Promise<Product> {
    return this.withProductTransaction(async (repository, manager) => {
      const product = await this.findOneWithRepository(repository, productId, scope, 'mutate');
      const before = this.snapshotProductForEvent(product);
      const existingCategories = product.categories || [];
      const categoryMap = new Map<string, Category>();

      if (patch.mode === 'add') {
        for (const category of existingCategories) {
          if (category.id) {
            categoryMap.set(category.id, category);
          }
        }
      }
      for (const category of patch.categories) {
        categoryMap.set(category.id, category);
      }

      const nextCategories = Array.from(categoryMap.values());
      const nextCategoryIds = nextCategories.map((category) => category.id).filter(Boolean).sort();
      if (this.sameCategoryIds(before.categoryIds, nextCategoryIds)) {
        return product;
      }

      product.categories = nextCategories;
      const saved = await repository.save(product);
      const after = this.snapshotProductForEvent(saved);
      const changedFields = this.changedProductFields({}, before, after);
      if (changedFields.length > 0) {
        await this.recordProductEvents(manager, this.productUpdateEvents(before, after, changedFields, scope, 'product_quality_review_bulk_category_patch'));
      }
      return saved;
    });
  }

  private qualityItemHasField(item: ProductQualityReviewItem, expectedMissingField: string): boolean {
    const expected = expectedMissingField.trim();
    return [...item.blockingIssues, ...item.optionalOpportunities].some((issue) =>
      issue.code === expected || issue.field === expected || this.productQualityFieldKey(issue) === expected,
    );
  }

  private async assertProductQualityAllowsActivation(product: Product, patch: Partial<UpdateProductDto>): Promise<void> {
    const requestsActivation = patch.lifecycle === 'active' || patch.isActive === true;
    if (!requestsActivation) {
      return;
    }
    const quality = await this.buildProductQualityReviewItem(product);
    if (!quality.canActivate) {
      throw new BadRequestException(`Product cannot be activated until quality blockers are resolved: ${quality.blockingMissingFields.join(',')}`);
    }
  }

  private productQualityReviewCsv(items: ProductQualityReviewItem[]): string {
    const rows = [
      ['productId', 'sku', 'title', 'ownerScope', 'sourceScope', 'lifecycle', 'blockingMissingFields', 'optionalOpportunities', 'completionScore', 'canActivate', 'nextAction'],
      ...items.map((item) => [
        item.productId,
        item.sku,
        item.title,
        item.ownerScope,
        item.sourceScope,
        item.lifecycle,
        item.blockingMissingFields.join('|'),
        item.optionalOpportunities.map((issue) => issue.code).join('|'),
        String(item.completionScore),
        String(item.canActivate),
        item.nextAction,
      ]),
    ];
    return rows.map((row) => row.map((value) => this.csvCell(value)).join(',')).join('\n');
  }

  private productQualityReviewMarkdown(items: ProductQualityReviewItem[], generatedAt: string): string {
    const lines = [
      '# Product Quality Review',
      '',
      `Generated at: ${generatedAt}`,
      '',
      '| Product | SKU | Lifecycle | Blockers | Next action |',
      '|---|---|---|---|---|',
    ];
    for (const item of items) {
      lines.push(`| ${this.markdownCell(item.title)} | ${this.markdownCell(item.sku)} | ${item.lifecycle} | ${this.markdownCell(item.blockingMissingFields.join(', ') || 'none')} | ${this.markdownCell(item.nextAction)} |`);
    }
    return lines.join('\n');
  }

  private csvCell(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private markdownCell(value: unknown): string {
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  private isPlaceholderMedia(media: { url?: string; title?: string; altText?: string }): boolean {
    const value = [media.url, media.title, media.altText].filter(Boolean).join(" ").toLowerCase();
    return ["placeholder", "no-image", "missing-image", "image-coming-soon"].some((marker) => value.includes(marker));
  }

  private isProductImageMedia(media: { type?: string; url?: string; thumbnailUrl?: string }): boolean {
    return String(media.type || '').toLowerCase() === 'image' && Boolean((media.url || media.thumbnailUrl || '').trim());
  }

  private async hasPositiveCurrentPrice(product: Product): Promise<boolean> {
    const price = await this.resolveCurrentPrice(product);
    return Number.isFinite(price) && Number(price) > 0;
  }

  private async getDuplicateSummaryForProduct(product: Product): Promise<{ duplicateSku: boolean; duplicateEan: boolean }> {
    const duplicateSku = product.sku
      ? await this.productRepository.count({ where: { sku: product.sku, ownerUserId: product.ownerUserId ?? IsNull() } }) > 1
      : false;
    const duplicateEan = product.ean?.trim()
      ? await this.productRepository.count({ where: { ean: product.ean, ownerUserId: product.ownerUserId ?? IsNull() } }) > 1
      : false;

    return { duplicateSku, duplicateEan };
  }


  async publishProductsToMarketplaces(
    request: BulkMarketplacePublicationRequest,
    authorization?: string,
    scope: ProductAccessScope = {},
  ): Promise<BulkMarketplacePublicationResponse> {
    const productIds = this.normalizeBulkProductIds(request?.productIds);
    const marketplaces = this.normalizePublicationMarketplaces(request?.marketplaces);
    const options = request?.options || {};
    const results: BulkMarketplacePublicationResult[] = [];

    for (const productId of productIds) {
      for (const marketplace of marketplaces) {
        results.push(await this.dispatchMarketplacePublication(productId, marketplace, options[marketplace] || {}, authorization, scope));
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
    scope: ProductAccessScope = {},
  ): Promise<BulkMarketplacePublicationResult> {
    try {
      const data = await this.runMarketplacePublication(productId, marketplace, options, authorization, scope);
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
    scope: ProductAccessScope = {},
  ): Promise<any> {
    const requestedBy = options?.requestedBy || 'catalog-bulk-publication';

    if (marketplace === 'bazos') {
      return this.requestBazosDraft(productId, {
        ...options,
        requestedBy,
        useCallerBazosIdentity: options?.useCallerBazosIdentity !== false,
      }, authorization, scope);
    }
    if (marketplace === 'allegro') {
      return this.prepareAllegroSale(productId, { ...options, requestedBy }, authorization, scope);
    }
    if (marketplace === 'aukro') {
      return this.requestAukroDraft(productId, { ...options, requestedBy }, authorization, scope);
    }
    if (marketplace === 'heureka') {
      return this.prepareHeurekaSale(productId, { ...options, requestedBy }, scope);
    }
    return this.prepareFlipFlopSale(productId, authorization, scope);
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


  async getBazosStatus(id: string, authorization?: string, scope: ProductAccessScope = {}) {
    await this.findOne(id, scope);

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

  async requestBazosDraft(id: string, data: any = {}, authorization?: string, scope: ProductAccessScope = {}) {
    const product = await this.findOne(id, scope);

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

  async sellOnBazos(id: string, data: any = {}, authorization?: string, scope: ProductAccessScope = {}) {
    return this.requestBazosDraft(id, data, authorization, scope);
  }

  async getAukroStatus(id: string, authorization?: string, scope: ProductAccessScope = {}) {
    await this.findOne(id, scope);

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

  async requestAukroDraft(id: string, data: any = {}, authorization?: string, scope: ProductAccessScope = {}) {
    const product = await this.findOne(id, scope);

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

  async sellOnAukro(id: string, data: any = {}, authorization?: string, scope: ProductAccessScope = {}) {
    return this.requestAukroDraft(id, data, authorization, scope);
  }

  async prepareAllegroSale(id: string, data: any = {}, authorization?: string, scope: ProductAccessScope = {}) {
    const product = await this.findOne(id, scope);

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

  async getAllegroStatus(id: string, authorization?: string, scope: ProductAccessScope = {}) {
    await this.findOne(id, scope);

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

  async updateAllegroDraft(id: string, data: any = {}, authorization?: string, scope: ProductAccessScope = {}) {
    const product = await this.findOne(id, scope);

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

  async confirmAllegroPublish(id: string, authorization?: string, scope: ProductAccessScope = {}) {
    await this.findOne(id, scope);

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

  async getHeurekaStatus(id: string, feedType = 'heureka_cz', scope: ProductAccessScope = {}) {
    await this.findOne(id, scope);
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

  async prepareHeurekaSale(id: string, data: any = {}, scope: ProductAccessScope = {}) {
    const product = await this.findOne(id, scope);
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

  async getFlipFlopStatus(id: string, authorization?: string, scope: ProductAccessScope = {}) {
    await this.findOne(id, scope);
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

  async prepareFlipFlopSale(id: string, authorization?: string, scope: ProductAccessScope = {}) {
    await this.findOne(id, scope);
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


  private async filterProductIdsBySupplier(productIds: string[], supplierId: string): Promise<string[]> {
    const normalizedSupplierId = String(supplierId || '').trim();
    if (!normalizedSupplierId || productIds.length === 0) {
      return [];
    }

    const matched = new Set<string>();
    for (let index = 0; index < productIds.length; index += 100) {
      const chunk = productIds.slice(index, index + 100);
      const rows = await this.fetchWarehouseAvailabilityRows(chunk);
      for (const row of rows) {
        const warehouses = Array.isArray(row?.warehouses) ? row.warehouses : [];
        const supplied = warehouses.some((warehouse: any) => {
          const rowSupplierId = String(warehouse?.supplierId || '').trim();
          const quantity = this.toPositiveInteger(warehouse?.quantity ?? warehouse?.available ?? 0);
          return rowSupplierId === normalizedSupplierId && quantity > 0;
        });
        if (supplied && typeof row?.productId === 'string') {
          matched.add(row.productId);
        }
      }
    }
    return productIds.filter((productId) => matched.has(productId));
  }

  private async fetchWarehouseAvailabilityRows(productIds: string[]): Promise<any[]> {
    const token = this.getWarehouseServiceToken();
    if (!token) {
      throw new BadRequestException('[MISSING: Catalog-to-Warehouse service credential for supplier product filtering]');
    }
    const baseUrl = (process.env.WAREHOUSE_SERVICE_URL || process.env.WAREHOUSE_BASE_URL || 'http://warehouse-microservice:3201').replace(/\/$/, '');
    try {
      const response = await axios.post(
        `${baseUrl}/api/stock/availability/batch`,
        { productIds },
        {
          timeout: Number(process.env.WAREHOUSE_AVAILABILITY_TIMEOUT_MS || 5000),
          headers: {
            Authorization: this.asBearerToken(token),
            'Content-Type': 'application/json',
          },
        },
      );
      const rows = response.data?.data ?? response.data;
      return Array.isArray(rows) ? rows : [];
    } catch (error: any) {
      this.logger.warn(
        `Warehouse supplier filter unavailable: ${error?.response?.status ?? error?.message ?? 'unknown error'}`,
        'ProductsService',
      );
      throw new BadRequestException('Warehouse supplier filter is unavailable. Try again after Warehouse availability is reachable.');
    }
  }

  private getWarehouseServiceToken(): string | null {
    const token =
      process.env.WAREHOUSE_SERVICE_TOKEN ||
      process.env.WAREHOUSE_INTERNAL_SERVICE_TOKEN ||
      process.env.CATALOG_INTERNAL_SERVICE_TOKEN ||
      process.env.INTERNAL_SERVICE_TOKEN ||
      process.env.JWT_TOKEN;
    return token?.trim() || null;
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
    const rawChannels = this.arrayFromFirst(payload?.channels, payload?.byChannel);
    const allowedChannels = this.normalizeAllowedSalesChannels(payload, rawChannels);
    const channelRows = allowedChannels.map((channel) => {
      const row = rawChannels.find((candidate: any) => String(candidate?.channel) === channel);
      return this.normalizeSalesChannel(productId, channel, row);
    });
    const orderStatuses = this.normalizeSalesOrderStatuses(
      this.arrayFromFirst(payload?.orderStatuses, payload?.byStatus, payload?.statuses),
    );

    return {
      productId,
      source: 'orders',
      sourceStatus: 'available',
      allowedChannels,
      currencyStrategy: String(payload?.currencyStrategy || 'per_currency_no_fx_conversion'),
      conversion: String(payload?.conversion || '[UNKNOWN: conversion]'),
      totals: this.sumSalesTotals(channelRows),
      channels: channelRows,
      orderStatuses,
      recentHistory: this.normalizeSalesHistory(payload),
      orderDelivery: this.normalizeOrderDeliveryStatistics(payload),
    };
  }

  private normalizeAllowedSalesChannels(payload: any, rawChannels: any[]): string[] {
    const configured = Array.isArray(payload?.allowedChannels) && payload.allowedChannels.length
      ? payload.allowedChannels.map((channel: unknown) => String(channel))
      : DEFAULT_SALES_CHANNELS;
    const observed = rawChannels
      .map((row: any) => row?.channel ? String(row.channel) : '')
      .filter(Boolean);
    return Array.from(new Set([...configured, ...observed]));
  }

  private arrayFromFirst(...values: unknown[]): any[] {
    for (const value of values) {
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  }

  private normalizeSalesChannel(productId: string, channel: string, row: any): ProductSalesChannel {
    const orderCount = this.toNonNegativeNumber(row?.orderCount);
    const quantitySold = this.toNonNegativeNumber(row?.quantitySold);
    const grossSales = this.toNonNegativeNumber(row?.grossSales ?? row?.grossItemRevenue);
    const currency = String(row?.currency || 'CZK');
    const hasSales = orderCount > 0 || quantitySold > 0 || grossSales > 0;

    return {
      productId,
      channel,
      currency,
      orderCount,
      quantitySold,
      grossSales,
      lastOrderedAt: row?.lastOrderedAt || row?.lastOrderAt ? String(row.lastOrderedAt || row.lastOrderAt) : null,
      status: hasSales ? 'available' : 'zero',
    };
  }

  private normalizeSalesOrderStatuses(rawRows: any[]): ProductSalesOrderStatus[] {
    return rawRows.map((row: any) => ({
      status: String(row?.status || 'unknown'),
      currency: String(row?.currency || 'CZK'),
      orderCount: this.toNonNegativeNumber(row?.orderCount),
      quantitySold: this.toNonNegativeNumber(row?.quantitySold),
      grossSales: this.toNonNegativeNumber(row?.grossSales ?? row?.grossItemRevenue),
      lastOrderedAt: row?.lastOrderedAt || row?.lastOrderAt ? String(row.lastOrderedAt || row.lastOrderAt) : null,
    }));
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
      grossSales: this.toNonNegativeNumber(event?.grossSales ?? event?.grossItemRevenue ?? event?.amount ?? event?.total),
      status: event?.status ? String(event.status) : null,
    }));
  }

  private normalizeOrderDeliveryStatistics(payload: any): ProductOrderDeliveryStatistics {
    const source = payload?.orderDeliveryStatistics
      ?? payload?.orderDelivery
      ?? payload?.lifecycleDeliveryStatistics
      ?? payload?.lifecycleStatistics
      ?? payload?.lifecycleAggregates
      ?? null;
    const container = source ?? payload;
    const hasOrderDeliverySource = Boolean(
      source
      || payload?.lifecycleStages
      || payload?.byLifecycleStage
      || payload?.paymentStatuses
      || payload?.byPaymentStatus
      || payload?.deliveryStatuses
      || payload?.byDeliveryStatus
      || payload?.deliveryExceptions
      || payload?.exceptionCounts
      || payload?.channelLifecycle
      || payload?.byChannelLifecycle
    );

    if (!hasOrderDeliverySource) {
      return this.unavailableOrderDeliveryStatistics(MISSING_ORDERS_STATS_ENDPOINT);
    }

    return {
      source: 'orders',
      sourceStatus: 'available',
      lifecycleStages: this.normalizeCountMetrics(container?.lifecycleStages ?? container?.byLifecycleStage ?? payload?.byLifecycleStage, 'lifecycleStage'),
      paymentStatuses: this.normalizeCountMetrics(container?.paymentStatuses ?? container?.byPaymentStatus ?? payload?.byPaymentStatus, 'paymentStatus'),
      deliveryStatuses: this.normalizeCountMetrics(container?.deliveryStatuses ?? container?.byDeliveryStatus ?? payload?.byDeliveryStatus, 'deliveryStatus'),
      deliveryExceptions: this.normalizeDeliveryExceptions(container?.deliveryExceptions ?? container?.exceptionCounts ?? payload?.exceptionCounts),
      channelLifecycle: this.normalizeChannelLifecycle(container?.channelLifecycle ?? container?.byChannelLifecycle),
    };
  }

  private normalizeCountMetrics(input: any, preferredKey: string): ProductSalesCountMetric[] {
    const rows = Array.isArray(input)
      ? input
      : input && typeof input === 'object'
        ? Object.entries(input).map(([key, count]) => ({ [preferredKey]: key, count }))
        : [];

    return rows
      .map((row: any) => {
        const key = String(row?.[preferredKey] ?? row?.key ?? row?.status ?? row?.name ?? '').trim();
        const count = this.toNonNegativeNumber(row?.count ?? row?.orderCount ?? row?.total ?? row?.value);
        return {
          key,
          label: this.humanizeOrderMetricKey(key),
          count,
          status: count > 0 ? 'available' as const : 'zero' as const,
        };
      })
      .filter((metric) => Boolean(metric.key));
  }

  private normalizeDeliveryExceptions(input: any): ProductDeliveryExceptionMetrics {
    const source = input && typeof input === 'object' ? input : {};
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        if (source[key] !== undefined) {
          return this.toNonNegativeNumber(source[key]);
        }
      }
      return 0;
    };

    return {
      notReceived: pick('notReceived', 'not_received', 'deliveryNotReceived', 'delivery_not_received'),
      returned: pick('returned', 'return', 'returns'),
      delayed: pick('delayed', 'delay', 'late', 'deliveryDelayed', 'delivery_delayed'),
      unfulfilled: pick('unfulfilled', 'notFulfilled', 'not_fulfilled', 'fulfillmentBlocked', 'fulfillment_blocked'),
    };
  }

  private normalizeChannelLifecycle(input: any): ProductChannelOrderDeliveryStatistics[] {
    const rows = Array.isArray(input) ? input : [];
    return rows
      .map((row: any) => ({
        channel: String(row?.channel || '').trim(),
        lifecycleStages: this.normalizeCountMetrics(row?.lifecycleStages ?? row?.byLifecycleStage, 'lifecycleStage'),
        deliveryExceptions: this.normalizeDeliveryExceptions(row?.deliveryExceptions ?? row?.exceptionCounts),
      }))
      .filter((row) => Boolean(row.channel));
  }

  private humanizeOrderMetricKey(key: string): string {
    return key
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
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
      orderStatuses: [],
      recentHistory: [],
      orderDelivery: this.unavailableOrderDeliveryStatistics(unavailableReason),
      unavailableReason,
    };
  }

  private unavailableOrderDeliveryStatistics(unavailableReason: string): ProductOrderDeliveryStatistics {
    return {
      source: 'orders',
      sourceStatus: 'unavailable',
      unavailableReason,
      lifecycleStages: [],
      paymentStatuses: [],
      deliveryStatuses: [],
      deliveryExceptions: {
        notReceived: 0,
        returned: 0,
        delayed: 0,
        unfulfilled: 0,
      },
      channelLifecycle: [],
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
  async remove(id: string, scope: ProductAccessScope = {}): Promise<void> {
    this.logger.log(`Removing product: ${id}`, 'ProductsService');

    await this.withProductTransaction(async (repository, manager) => {
      const product = await this.findOneWithRepository(repository, id, scope, 'mutate');
      const before = this.snapshotProductForEvent(product);
      product.isActive = false;
      product.lifecycle = "archived";
      const saved = await repository.save(product);
      const after = this.snapshotProductForEvent(saved);
      await this.recordProductEvents(manager, this.productArchiveEvents(before, after, scope, 'soft_delete'));
    });

    this.logger.log(`Product deactivated: ${id}`, 'ProductsService');
  }

  /**
   * Hard delete a product
   */
  async hardRemove(id: string, scope: ProductAccessScope = {}): Promise<void> {
    this.logger.log(`Hard deleting product: ${id}`, 'ProductsService');

    await this.withProductTransaction(async (repository, manager) => {
      const product = await this.findOneWithRepository(repository, id, scope, 'mutate');
      const before = this.snapshotProductForEvent(product);
      const result = await repository.delete(this.productWhereWithOwner({ id }, scope.actor));
      if (result.affected === 0) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      await this.recordProductEvents(manager, [
        this.productEventInput('catalog.product.deleted.v1', before, scope, ['id'], {
          operation: 'hard_delete',
          before,
          after: null,
        }),
      ]);
    });

    this.logger.log(`Product deleted: ${id}`, 'ProductsService');
  }
}
