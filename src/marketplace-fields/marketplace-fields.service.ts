import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../logger/logger.service';
import { Product } from '../products/product.entity';
import { ProductMarketplaceProfile } from './marketplace-profile.entity';

type FieldSource = 'canonical' | 'override' | 'externalRef' | 'sourceData';

type ManualOverrideMetadata = {
  manual: true;
  field: string;
  updatedAt: string;
  productUpdatedAt: string | null;
};

type MarketplaceFieldDefinition = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'json';
  source: FieldSource;
  canonicalPath?: string;
  marketplacePath?: string;
  aliases?: string[];
  editable?: boolean;
  description?: string;
};

type MarketplaceDefinition = {
  marketplace: string;
  label: string;
  description: string;
  fields: MarketplaceFieldDefinition[];
};

type UpdateMarketplaceFieldsInput = {
  canonical?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  externalRefs?: Record<string, unknown>;
  sourceData?: Record<string, unknown> | null;
  status?: string;
};

const COMMON_CANONICAL_FIELDS: MarketplaceFieldDefinition[] = [
  {
    key: 'title',
    label: 'Product name',
    type: 'text',
    source: 'canonical',
    canonicalPath: 'title',
    aliases: ['name', 'productName', 'product', 'název', 'название'],
    editable: true,
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    source: 'canonical',
    canonicalPath: 'description',
    aliases: ['description', 'longDescription', 'popis', 'описание'],
    editable: true,
  },
  {
    key: 'brand',
    label: 'Brand',
    type: 'text',
    source: 'canonical',
    canonicalPath: 'brand',
    aliases: ['brand', 'značka', 'марка'],
    editable: true,
  },
  {
    key: 'manufacturer',
    label: 'Manufacturer',
    type: 'text',
    source: 'canonical',
    canonicalPath: 'manufacturer',
    aliases: ['manufacturer', 'manufacturerCode', 'výrobce', 'производитель'],
    editable: true,
  },
  {
    key: 'ean',
    label: 'EAN / GTIN',
    type: 'text',
    source: 'canonical',
    canonicalPath: 'ean',
    aliases: ['ean', 'gtin', 'EAN (GTIN)', 'barcode'],
    editable: true,
  },
  {
    key: 'sku',
    label: 'SKU',
    type: 'text',
    source: 'canonical',
    canonicalPath: 'sku',
    aliases: ['sku', 'code', 'product_code', 'catalogCode'],
    editable: false,
  },
];

const MARKETPLACE_DEFINITIONS: MarketplaceDefinition[] = [
  {
    marketplace: 'heureka',
    label: 'Heureka',
    description: 'Heureka XML feed fields and product-specific overrides. Catalog keeps canonical JSON and renders platform-specific feed fields at publication time.',
    fields: [
      ...COMMON_CANONICAL_FIELDS,
      { key: 'productName', label: 'PRODUCTNAME', type: 'text', source: 'override', marketplacePath: 'PRODUCTNAME', aliases: ['productName', 'PRODUCTNAME', 'heurekaProductName'], editable: true },
      { key: 'categoryText', label: 'CATEGORYTEXT', type: 'text', source: 'override', marketplacePath: 'CATEGORYTEXT', aliases: ['categoryText', 'CATEGORYTEXT', 'categoryPath', 'heurekaCategory'], editable: true },
      { key: 'deliveryDate', label: 'DELIVERY_DATE', type: 'number', source: 'override', marketplacePath: 'DELIVERY_DATE', aliases: ['deliveryDate', 'DELIVERY_DATE', 'availabilityDays'], editable: true },
      { key: 'deliveryPrice', label: 'DELIVERY price', type: 'number', source: 'override', marketplacePath: 'DELIVERY', aliases: ['deliveryPrice', 'DELIVERY', 'shippingPrice'], editable: true },
      { key: 'feedType', label: 'Feed type', type: 'text', source: 'override', marketplacePath: 'feedType', aliases: ['feedType', 'heurekaFeedType'], editable: true },
      { key: 'feedProductId', label: 'Heureka feed product ID', type: 'text', source: 'externalRef', marketplacePath: 'ITEM_ID', aliases: ['feedProductId', 'ITEM_ID', 'itemId'], editable: false },
    ],
  },
  {
    marketplace: 'allegro',
    label: 'Allegro',
    description: 'Allegro-specific offer, productSet, parameter and policy fields. Canonical product text stays in Catalog.',
    fields: [
      ...COMMON_CANONICAL_FIELDS,
      {
        key: 'categoryId',
        label: 'Allegro category ID',
        type: 'text',
        source: 'override',
        marketplacePath: 'category.id',
        aliases: ['allegroCategoryId', 'categoryId', 'category.id'],
        editable: true,
      },
      {
        key: 'allegroProductId',
        label: 'Allegro product ID',
        type: 'text',
        source: 'externalRef',
        marketplacePath: 'productSet[0].product.id',
        aliases: ['product.id', 'allegroProductId', 'productSet.product.id'],
        editable: false,
      },
      {
        key: 'allegroOfferIds',
        label: 'Allegro offer IDs',
        type: 'json',
        source: 'externalRef',
        marketplacePath: 'id',
        aliases: ['offerId', 'offer.id', 'allegroOfferId', 'listingId'],
        editable: false,
      },
      {
        key: 'parameters',
        label: 'Allegro parameters',
        type: 'json',
        source: 'override',
        marketplacePath: 'parameters',
        aliases: ['attributes', 'product.parameters', 'productSet.product.parameters'],
        editable: true,
      },
      {
        key: 'price',
        label: 'Allegro price',
        type: 'number',
        source: 'override',
        marketplacePath: 'sellingMode.price.amount',
        aliases: ['price', 'sellingPrice', 'sellingMode.price.amount', 'amount'],
        editable: true,
      },
      {
        key: 'currency',
        label: 'Allegro currency',
        type: 'text',
        source: 'override',
        marketplacePath: 'sellingMode.price.currency',
        aliases: ['currency', 'sellingMode.price.currency'],
        editable: true,
      },
      {
        key: 'quantity',
        label: 'Offer quantity',
        type: 'number',
        source: 'override',
        marketplacePath: 'stock.available',
        aliases: ['quantity', 'stock.available', 'availableQuantity'],
        editable: true,
      },
      {
        key: 'images',
        label: 'Allegro image URLs',
        type: 'json',
        source: 'override',
        marketplacePath: 'images',
        aliases: ['images', 'media', 'photos', 'pictures', 'imageUrls'],
        editable: true,
      },
      {
        key: 'sellingMode',
        label: 'Selling mode',
        type: 'json',
        source: 'override',
        marketplacePath: 'sellingMode',
        aliases: ['sellingMode', 'saleMode', 'pricingMode'],
        editable: true,
      },
      {
        key: 'delivery',
        label: 'Delivery options',
        type: 'json',
        source: 'override',
        marketplacePath: 'delivery',
        aliases: ['deliveryOptions', 'shipping'],
        editable: true,
      },
      {
        key: 'payments',
        label: 'Payment options',
        type: 'json',
        source: 'override',
        marketplacePath: 'payments',
        aliases: ['paymentOptions', 'sellingMode.payments'],
        editable: true,
      },
      {
        key: 'location',
        label: 'Offer location',
        type: 'json',
        source: 'override',
        marketplacePath: 'location',
        aliases: ['location', 'pickupLocation'],
        editable: true,
      },
      {
        key: 'responsibleProducer',
        label: 'Responsible producer',
        type: 'json',
        source: 'override',
        marketplacePath: 'productSet[0].responsibleProducer',
        aliases: ['responsibleProducer', 'gpsrProducer'],
        editable: true,
      },
      {
        key: 'publication',
        label: 'Publication settings',
        type: 'json',
        source: 'override',
        marketplacePath: 'publication',
        aliases: ['publication', 'publication.status'],
        editable: true,
      },
      {
        key: 'afterSalesServices',
        label: 'After-sales services',
        type: 'json',
        source: 'override',
        marketplacePath: 'afterSalesServices',
        aliases: ['impliedWarranty', 'returnPolicy', 'warranty'],
        editable: true,
      },
      {
        key: 'taxSettings',
        label: 'Tax settings',
        type: 'json',
        source: 'override',
        marketplacePath: 'taxSettings',
        aliases: ['tax', 'vat'],
        editable: true,
      },
      {
        key: 'external',
        label: 'External refs',
        type: 'json',
        source: 'externalRef',
        marketplacePath: 'external',
        aliases: ['allegroOfferId', 'listingUrl', 'publicUrl'],
        editable: true,
      },
    ],
  },
  {
    marketplace: 'bazos',
    label: 'Bazoš',
    description: 'Bazoš keeps identity, compliance and publishing authority. Catalog stores only reusable draft preferences.',
    fields: [
      ...COMMON_CANONICAL_FIELDS,
      { key: 'rubric', label: 'Rubric', type: 'text', source: 'override', aliases: ['bazosRubric', 'category'], editable: true },
      { key: 'priceOption', label: 'Price option', type: 'text', source: 'override', aliases: ['priceOption', 'priceType'], editable: true },
      { key: 'location', label: 'Location', type: 'json', source: 'override', aliases: ['defaultLocation', 'region'], editable: true },
      { key: 'identityId', label: 'Bazoš identity', type: 'text', source: 'externalRef', aliases: ['identityId', 'sellerIdentity'], editable: true },
    ],
  },
  {
    marketplace: 'aukro',
    label: 'Aukro',
    description: 'Aukro-specific draft, category and policy evidence fields for product publication.',
    fields: [
      ...COMMON_CANONICAL_FIELDS,
      { key: 'categoryId', label: 'Aukro category ID', type: 'text', source: 'override', aliases: ['aukroCategoryId', 'categoryId'], editable: true },
      { key: 'parameters', label: 'Aukro parameters', type: 'json', source: 'override', aliases: ['requiredParameters', 'attributes'], editable: true },
      { key: 'shipping', label: 'Shipping', type: 'json', source: 'override', aliases: ['delivery', 'transport'], editable: true },
      { key: 'accountId', label: 'Aukro account', type: 'text', source: 'externalRef', aliases: ['accountId', 'sellerAccount'], editable: true },
    ],
  },
  {
    marketplace: 'flipflop',
    label: 'FlipFlop',
    description: 'FlipFlop consumes Catalog projection and owns storefront UX. Keep storefront-only hints here.',
    fields: [
      ...COMMON_CANONICAL_FIELDS,
      { key: 'storefrontSlug', label: 'Storefront slug', type: 'text', source: 'override', aliases: ['slug', 'seoSlug'], editable: true },
      { key: 'merchandisingTags', label: 'Merchandising tags', type: 'json', source: 'override', aliases: ['tags', 'badges'], editable: true },
      { key: 'projectionFlags', label: 'Projection flags', type: 'json', source: 'override', aliases: ['storefrontFlags'], editable: true },
    ],
  },
];

const EDITABLE_CANONICAL_FIELDS = new Set(['title', 'description', 'brand', 'manufacturer', 'ean']);

@Injectable()
export class MarketplaceFieldsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductMarketplaceProfile)
    private readonly profileRepository: Repository<ProductMarketplaceProfile>,
    private readonly logger: LoggerService,
  ) {}

  getSupportedMarketplaces() {
    return MARKETPLACE_DEFINITIONS.map(({ marketplace, label, description }) => ({ marketplace, label, description }));
  }

  async getProductMarketplaceFields(productId: string, marketplace: string) {
    const definition = this.getDefinition(marketplace);
    const product = await this.loadProduct(productId);
    const profile = await this.findProfile(productId, definition.marketplace);

    return this.toResponse(product, definition, profile);
  }

  async updateProductMarketplaceFields(productId: string, marketplace: string, input: UpdateMarketplaceFieldsInput) {
    const definition = this.getDefinition(marketplace);
    const product = await this.loadProduct(productId);

    const canonicalPatch = this.sanitizeCanonicalPatch(input?.canonical || {});
    let workingProduct = product;
    if (Object.keys(canonicalPatch).length > 0) {
      Object.assign(product, canonicalPatch);
      workingProduct = await this.productRepository.save(product);
    }

    let profile = await this.findProfile(productId, definition.marketplace);
    if (!profile) {
      profile = this.profileRepository.create({
        productId,
        marketplace: definition.marketplace,
        canonicalAliases: this.buildCanonicalAliases(definition),
        overrides: {},
        externalRefs: {},
        sourceData: null,
        manualOverrides: {},
        sourceState: {},
        status: 'draft',
      });
    }

    profile.canonicalAliases = this.buildCanonicalAliases(definition);
    profile.overrides = this.mergeJson(profile.overrides, input?.overrides);
    profile.manualOverrides = this.markManualOverrides(profile.manualOverrides, input?.overrides, workingProduct);
    profile.externalRefs = this.mergeJson(profile.externalRefs, input?.externalRefs);
    profile.sourceState = this.buildSourceState(workingProduct, profile.manualOverrides);
    if (input?.sourceData !== undefined) {
      profile.sourceData = input.sourceData;
    }
    if (typeof input?.status === 'string' && input.status.trim()) {
      profile.status = input.status.trim();
    }

    const savedProfile = await this.profileRepository.save(profile);
    const savedProduct = Object.keys(canonicalPatch).length > 0 ? await this.loadProduct(productId) : workingProduct;

    this.logger.log(`Marketplace fields updated for ${definition.marketplace}: ${productId}`, 'MarketplaceFieldsService');
    return this.toResponse(savedProduct, definition, savedProfile);
  }

  private getDefinition(marketplace: string): MarketplaceDefinition {
    const normalized = String(marketplace || '').trim().toLowerCase();
    const definition = MARKETPLACE_DEFINITIONS.find((item) => item.marketplace === normalized);
    if (!definition) {
      throw new BadRequestException(`Unsupported marketplace: ${marketplace}`);
    }
    return definition;
  }

  private async loadProduct(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['categories', 'media', 'pricing'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    return product;
  }

  private findProfile(productId: string, marketplace: string): Promise<ProductMarketplaceProfile | null> {
    return this.profileRepository.findOne({ where: { productId, marketplace } });
  }

  private sanitizeCanonicalPatch(input: Record<string, unknown>): Partial<Product> {
    const patch: Partial<Product> = {};
    for (const [key, value] of Object.entries(input || {})) {
      if (!EDITABLE_CANONICAL_FIELDS.has(key)) {
        continue;
      }
      if (value === null || value === undefined) {
        (patch as any)[key] = null;
      } else {
        (patch as any)[key] = String(value);
      }
    }
    return patch;
  }

  private mergeJson(current: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null | undefined) {
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      return current || {};
    }
    return {
      ...(current || {}),
      ...next,
    };
  }

  private markManualOverrides(
    current: Record<string, unknown> | null | undefined,
    next: Record<string, unknown> | null | undefined,
    product: Product,
  ) {
    const existing = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      return existing;
    }
    const now = new Date().toISOString();
    const productUpdatedAt = this.toIsoDate(product.updatedAt);
    return Object.keys(next).reduce((manual, field) => ({
      ...manual,
      [field]: {
        manual: true,
        field,
        updatedAt: now,
        productUpdatedAt,
      } satisfies ManualOverrideMetadata,
    }), { ...existing });
  }

  private buildSourceState(product: Product, manualOverrides: Record<string, unknown> | null | undefined) {
    const staleManualFields = this.getStaleManualFields(product, manualOverrides);
    return {
      canonicalProductUpdatedAt: this.toIsoDate(product.updatedAt),
      staleManualFields,
      validationRequired: staleManualFields.length > 0,
      catalogReadinessRequired: staleManualFields.length > 0,
    };
  }

  private getStaleManualFields(product: Product, manualOverrides: Record<string, unknown> | null | undefined) {
    const productUpdatedAt = this.toTime(product.updatedAt);
    if (!productUpdatedAt || !manualOverrides || typeof manualOverrides !== 'object' || Array.isArray(manualOverrides)) {
      return [];
    }
    return Object.entries(manualOverrides)
      .filter(([, value]) => {
        const manual = value as Partial<ManualOverrideMetadata>;
        const manualProductUpdatedAt = this.toTime(manual.productUpdatedAt);
        return Boolean(manual.manual && manualProductUpdatedAt && productUpdatedAt > manualProductUpdatedAt);
      })
      .map(([field]) => field);
  }

  private toIsoDate(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private toTime(value: unknown): number | null {
    const iso = this.toIsoDate(value);
    return iso ? new Date(iso).getTime() : null;
  }

  private toResponse(product: Product, definition: MarketplaceDefinition, profile: ProductMarketplaceProfile | null) {
    const profileData = {
      id: profile?.id || null,
      productId: product.id,
      marketplace: definition.marketplace,
      status: profile?.status || 'draft',
      canonicalAliases: profile?.canonicalAliases || this.buildCanonicalAliases(definition),
      overrides: profile?.overrides || {},
      externalRefs: profile?.externalRefs || {},
      sourceData: profile?.sourceData || null,
      manualOverrides: profile?.manualOverrides || {},
      sourceState: this.buildSourceState(product, profile?.manualOverrides || {}),
      updatedAt: profile?.updatedAt || null,
    };
    const staleManualFields = this.getStaleManualFields(product, profileData.manualOverrides);

    return {
      product: this.toProductSummary(product),
      marketplace: {
        marketplace: definition.marketplace,
        label: definition.label,
        description: definition.description,
      },
      profile: profileData,
      propagation: {
        status: staleManualFields.length > 0 ? 'manual_review_required' : 'current',
        canonicalProductUpdatedAt: this.toIsoDate(product.updatedAt),
        staleManualFields,
        validationRequired: staleManualFields.length > 0,
        catalogReadinessRequired: staleManualFields.length > 0,
      },
      fields: definition.fields.map((field) => {
        const manualOverride = Boolean((profileData.manualOverrides as Record<string, unknown>)?.[field.key]);
        const stale = staleManualFields.includes(field.key);
        return {
          ...field,
          editable: field.editable !== false,
          value: this.resolveFieldValue(product, profileData, field),
          manualOverride,
          stale,
          requiresManualReview: stale,
        };
      }),
    };
  }

  private toProductSummary(product: Product) {
    return {
      id: product.id,
      sku: product.sku,
      title: product.title,
      description: product.description,
      brand: product.brand,
      manufacturer: product.manufacturer,
      ean: product.ean,
      lifecycle: product.lifecycle,
      isActive: product.isActive,
      categories: (product.categories || []).map((category) => ({ id: category.id, name: category.name })),
      mediaCount: product.media?.length || 0,
      pricingCount: product.pricing?.length || 0,
      updatedAt: product.updatedAt,
    };
  }

  private resolveFieldValue(product: Product, profile: any, field: MarketplaceFieldDefinition) {
    if (field.source === 'canonical' && field.canonicalPath) {
      return (product as any)[field.canonicalPath] ?? null;
    }
    if (field.source === 'override') {
      return profile.overrides?.[field.key] ?? null;
    }
    if (field.source === 'externalRef') {
      return profile.externalRefs?.[field.key] ?? null;
    }
    if (field.source === 'sourceData') {
      return profile.sourceData?.[field.key] ?? null;
    }
    return null;
  }

  private buildCanonicalAliases(definition: MarketplaceDefinition) {
    return definition.fields
      .filter((field) => field.source === 'canonical' && field.canonicalPath)
      .reduce((aliases, field) => ({
        ...aliases,
        [field.key]: {
          canonicalPath: field.canonicalPath,
          aliases: field.aliases || [],
        },
      }), {} as Record<string, unknown>);
  }
}
