import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { CatalogActor } from '../auth/catalog-auth.guard';
import { ProductsService } from '../products/products.service';
import { PricingService } from '../pricing/pricing.service';
import { ProductRelation, ProductRelationEvidence } from './product-relation.entity';

type ProductRelationAccessScope = {
  actor?: CatalogActor;
};

const ORDER_AFFINITY_RELATION_TYPE = 'order_affinity';
const MARKETING_ORDER_AFFINITY_SOURCE = 'marketing_order_affinity';
const MAX_ORDER_AFFINITY_BATCH_ITEMS = 500;

type ProductRelationFindOptions = {
  relationType?: string;
  scope?: ProductRelationAccessScope;
};

type ProductBundleCandidateFindOptions = {
  limit?: unknown;
  freeShippingThreshold?: unknown;
  currency?: unknown;
  scope?: ProductRelationAccessScope;
};

export type ProductRelationWriteInput = {
  relationType?: unknown;
  score?: unknown;
  confidence?: unknown;
  source?: unknown;
  evidence?: unknown;
};

type OrderAffinityBatchItemInput = {
  sourceProductId?: unknown;
  targetProductId?: unknown;
  score?: unknown;
  confidence?: unknown;
  evidence?: unknown;
};

export type OrderAffinityBatchInput = {
  source?: unknown;
  idempotencyKey?: unknown;
  generatedAt?: unknown;
  items?: unknown;
};

export type ProductRelationResponse = {
  id: string;
  sourceProductId: string;
  targetProductId: string;
  relationType: string;
  score: number;
  confidence: number;
  source: string;
  evidence: ProductRelationEvidence;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderAffinityBatchItemResult = {
  index: number;
  sourceProductId?: string;
  targetProductId?: string;
  status: 'upserted' | 'updated' | 'failed';
  relation?: ProductRelationResponse;
  error?: string;
};

export type OrderAffinityBatchResponse = {
  source: typeof MARKETING_ORDER_AFFINITY_SOURCE;
  idempotencyKey?: string;
  generatedAt?: string;
  summary: {
    total: number;
    upserted: number;
    updated: number;
    failed: number;
  };
  items: OrderAffinityBatchItemResult[];
};

type BundleCandidateProductSummary = {
  productId: string;
  sku: string;
  title: string;
  price: {
    amount: number;
    currency: string;
    source: 'sale' | 'base';
  } | null;
};

export type ProductBundleCandidate = {
  candidateId: string;
  productIds: string[];
  items: BundleCandidateProductSummary[];
  relation: {
    relationId: string;
    relationType: typeof ORDER_AFFINITY_RELATION_TYPE;
    source: typeof MARKETING_ORDER_AFFINITY_SOURCE | string;
    score: number;
    confidence: number;
  };
  pricing: {
    currency?: string;
    subtotal: number | null;
    freeShippingThreshold?: number;
    suggestedBundlePrice: number | null;
    topUpAmount: number | null;
    freeShippingEligible: boolean;
    blockers: string[];
  };
};

export type ProductBundleCandidateResponse = {
  sourceProductId: string;
  relationType: typeof ORDER_AFFINITY_RELATION_TYPE;
  source: typeof MARKETING_ORDER_AFFINITY_SOURCE;
  freeShippingThreshold?: number;
  candidates: ProductBundleCandidate[];
  blockers: string[];
};

@Injectable()
export class ProductRelationsService {
  private readonly relationTypePattern = /^[a-z][a-z0-9_-]{0,59}$/;
  private readonly sourcePattern = /^[a-z][a-z0-9_-]{0,79}$/;
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private readonly allProductAccessRoles = [
    'global:superadmin',
    'global:platform_admin',
    'app:catalog-microservice:admin',
    'internal:catalog-microservice:admin',
  ];

  constructor(
    @InjectRepository(ProductRelation)
    private readonly relationRepository: Repository<ProductRelation>,
    private readonly productsService: ProductsService,
    @Optional()
    private readonly pricingService?: PricingService,
  ) {}

  async findRelated(
    sourceProductId: string,
    options: ProductRelationFindOptions = {},
  ): Promise<ProductRelationResponse[]> {
    const scope = options.scope ?? {};
    await this.productsService.findOne(sourceProductId, scope as any);

    const relationType = this.normalizeOptionalRelationType(options.relationType);
    const where: FindOptionsWhere<ProductRelation> = { sourceProductId };
    if (relationType) {
      where.relationType = relationType;
    }

    const relations = await this.relationRepository.find({
      where,
      order: { score: 'DESC', confidence: 'DESC', targetProductId: 'ASC' },
    });
    const visibleRelations = await this.filterVisibleTargets(relations, scope);
    return visibleRelations
      .sort((left, right) => this.compareRelations(left, right))
      .map((relation) => this.toResponse(relation));
  }

  async findBundleCandidates(
    sourceProductId: string,
    options: ProductBundleCandidateFindOptions = {},
  ): Promise<ProductBundleCandidateResponse> {
    const scope = options.scope ?? {};
    const limit = this.normalizeBundleCandidateLimit(options.limit);
    const freeShippingThreshold = this.normalizeOptionalBundleAmount(
      options.freeShippingThreshold,
      'freeShippingThreshold',
    );
    const requestedCurrency = this.normalizeOptionalCurrency(options.currency);
    const sourceProduct = await this.productsService.findOne(sourceProductId, scope as any);
    const relations = (await this.findRelated(sourceProductId, {
      relationType: ORDER_AFFINITY_RELATION_TYPE,
      scope,
    })).slice(0, limit);

    const blockers: string[] = [];
    if (freeShippingThreshold === undefined) {
      blockers.push('[MISSING: free-shipping threshold contract]');
    }

    const candidates: ProductBundleCandidate[] = [];
    for (const relation of relations) {
      const targetProduct = await this.productsService.findOne(relation.targetProductId, scope as any);
      const sourcePrice = await this.bundlePriceSummary(sourceProduct.id);
      const targetPrice = await this.bundlePriceSummary(targetProduct.id);
      const pricing = this.bundlePricingSummary(
        [sourcePrice, targetPrice],
        requestedCurrency,
        freeShippingThreshold,
      );
      candidates.push({
        candidateId: `order_affinity:${sourceProduct.id}:${targetProduct.id}`,
        productIds: [sourceProduct.id, targetProduct.id],
        items: [
          this.bundleProductSummary(sourceProduct, sourcePrice),
          this.bundleProductSummary(targetProduct, targetPrice),
        ],
        relation: {
          relationId: relation.id,
          relationType: ORDER_AFFINITY_RELATION_TYPE,
          source: relation.source,
          score: relation.score,
          confidence: relation.confidence,
        },
        pricing,
      });
    }

    return {
      sourceProductId,
      relationType: ORDER_AFFINITY_RELATION_TYPE,
      source: MARKETING_ORDER_AFFINITY_SOURCE,
      freeShippingThreshold,
      candidates,
      blockers,
    };
  }

  async upsertRelation(
    sourceProductId: string,
    targetProductId: string,
    data: ProductRelationWriteInput,
    scope: ProductRelationAccessScope = {},
  ): Promise<ProductRelationResponse> {
    const normalized = this.normalizeRelationInput(sourceProductId, targetProductId, data);

    await this.productsService.findOne(sourceProductId, scope as any);
    await this.productsService.findOne(targetProductId, scope as any);

    const result = await this.upsertRelationWithStatus(sourceProductId, targetProductId, data, scope);
    return result.relation;
  }

  async upsertOrderAffinityBatch(
    data: OrderAffinityBatchInput,
    scope: ProductRelationAccessScope = {},
  ): Promise<OrderAffinityBatchResponse> {
    const batch = this.normalizeOrderAffinityBatchInput(data);
    const items: OrderAffinityBatchItemResult[] = [];

    for (const [index, item] of batch.items.entries()) {
      let sourceProductId: string | undefined;
      let targetProductId: string | undefined;
      try {
        sourceProductId = this.normalizeUuid(item.sourceProductId, 'items.sourceProductId');
        targetProductId = this.normalizeUuid(item.targetProductId, 'items.targetProductId');
        const result = await this.upsertRelationWithStatus(sourceProductId, targetProductId, {
          relationType: ORDER_AFFINITY_RELATION_TYPE,
          source: MARKETING_ORDER_AFFINITY_SOURCE,
          score: item.score,
          confidence: item.confidence,
          evidence: item.evidence,
        }, scope);
        items.push({
          index,
          sourceProductId,
          targetProductId,
          status: result.status,
          relation: result.relation,
        });
      } catch (error) {
        items.push({
          index,
          sourceProductId,
          targetProductId,
          status: 'failed',
          error: this.errorMessage(error),
        });
      }
    }

    return {
      source: MARKETING_ORDER_AFFINITY_SOURCE,
      idempotencyKey: batch.idempotencyKey,
      generatedAt: batch.generatedAt,
      summary: {
        total: items.length,
        upserted: items.filter((item) => item.status === 'upserted').length,
        updated: items.filter((item) => item.status === 'updated').length,
        failed: items.filter((item) => item.status === 'failed').length,
      },
      items,
    };
  }

  private async upsertRelationWithStatus(
    sourceProductId: string,
    targetProductId: string,
    data: ProductRelationWriteInput,
    scope: ProductRelationAccessScope,
  ): Promise<{ relation: ProductRelationResponse; status: 'upserted' | 'updated' }> {
    const normalized = this.normalizeRelationInput(sourceProductId, targetProductId, data);

    await this.productsService.findOne(sourceProductId, scope as any);
    await this.productsService.findOne(targetProductId, scope as any);

    const existing = await this.relationRepository.findOne({
      where: {
        sourceProductId,
        targetProductId,
        relationType: normalized.relationType,
        source: normalized.source,
      },
    });

    const relation = existing ?? this.relationRepository.create({
      sourceProductId,
      targetProductId,
      relationType: normalized.relationType,
      source: normalized.source,
    });

    relation.score = normalized.score;
    relation.confidence = normalized.confidence;
    relation.evidence = normalized.evidence;

    return {
      relation: this.toResponse(await this.relationRepository.save(relation)),
      status: existing ? 'updated' : 'upserted',
    };
  }


  private normalizeBundleCandidateLimit(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return 3;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      throw new BadRequestException('limit must be an integer between 1 and 10');
    }
    return parsed;
  }

  private normalizeOptionalBundleAmount(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException(`${field} must be a finite non-negative number`);
    }
    return amount;
  }

  private normalizeOptionalCurrency(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value.trim())) {
      throw new BadRequestException('currency must be a three-letter uppercase code');
    }
    return value.trim();
  }

  private async bundlePriceSummary(productId: string): Promise<BundleCandidateProductSummary['price']> {
    if (!this.pricingService) {
      return null;
    }
    const price = await this.pricingService.getCurrentPrice(productId);
    if (!price) {
      return null;
    }
    const salePrice = price.salePrice === null || price.salePrice === undefined ? null : this.numberValue(price.salePrice);
    const basePrice = this.numberValue(price.basePrice);
    return {
      amount: salePrice ?? basePrice,
      currency: price.currency,
      source: salePrice === null ? 'base' : 'sale',
    };
  }

  private bundleProductSummary(product: { id: string; sku: string; title: string }, price: BundleCandidateProductSummary['price']): BundleCandidateProductSummary {
    return {
      productId: product.id,
      sku: product.sku,
      title: product.title,
      price,
    };
  }

  private bundlePricingSummary(
    prices: Array<BundleCandidateProductSummary['price']>,
    requestedCurrency: string | undefined,
    freeShippingThreshold: number | undefined,
  ): ProductBundleCandidate['pricing'] {
    const blockers: string[] = [];
    if (prices.some((price) => !price)) {
      blockers.push('[MISSING: current product price]');
    }
    const currencies = Array.from(new Set(prices.filter((price): price is NonNullable<typeof price> => !!price).map((price) => price.currency)));
    const currency = requestedCurrency ?? currencies[0];
    if (requestedCurrency && currencies.some((item) => item !== requestedCurrency)) {
      blockers.push('bundle_currency_mismatch');
    }
    if (currencies.length > 1) {
      blockers.push('bundle_currency_mismatch');
    }
    if (freeShippingThreshold === undefined) {
      blockers.push('[MISSING: free-shipping threshold contract]');
    }
    const subtotal = blockers.some((blocker) => blocker === '[MISSING: current product price]' || blocker === 'bundle_currency_mismatch')
      ? null
      : prices.reduce((sum, price) => sum + (price?.amount ?? 0), 0);
    const suggestedBundlePrice = subtotal === null
      ? null
      : freeShippingThreshold === undefined
        ? subtotal
        : Math.max(subtotal, freeShippingThreshold);
    const topUpAmount = subtotal === null || freeShippingThreshold === undefined
      ? null
      : Math.max(0, freeShippingThreshold - subtotal);

    return {
      currency,
      subtotal,
      freeShippingThreshold,
      suggestedBundlePrice,
      topUpAmount,
      freeShippingEligible: suggestedBundlePrice !== null && freeShippingThreshold !== undefined && suggestedBundlePrice >= freeShippingThreshold,
      blockers,
    };
  }

  private normalizeOrderAffinityBatchInput(data: OrderAffinityBatchInput) {
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      throw new BadRequestException('Order affinity batch payload must be an object');
    }
    if (
      data.source !== undefined &&
      data.source !== null &&
      data.source !== '' &&
      data.source !== MARKETING_ORDER_AFFINITY_SOURCE
    ) {
      throw new BadRequestException('source must be marketing_order_affinity');
    }
    if (!Array.isArray(data.items)) {
      throw new BadRequestException('items must be an array');
    }
    if (data.items.length === 0) {
      throw new BadRequestException('items must not be empty');
    }
    if (data.items.length > MAX_ORDER_AFFINITY_BATCH_ITEMS) {
      throw new BadRequestException(`items must contain at most ${MAX_ORDER_AFFINITY_BATCH_ITEMS} entries`);
    }

    return {
      idempotencyKey: this.normalizeOptionalString(data.idempotencyKey, 'idempotencyKey'),
      generatedAt: this.normalizeOptionalIsoTimestamp(data.generatedAt, 'generatedAt'),
      items: data.items.map((item) => this.normalizeOrderAffinityBatchItem(item)),
    };
  }

  private normalizeOrderAffinityBatchItem(value: unknown): OrderAffinityBatchItemInput {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw new BadRequestException('items entries must be objects');
    }
    return value as OrderAffinityBatchItemInput;
  }

  private normalizeUuid(value: unknown, field: string): string {
    if (typeof value !== 'string' || !this.uuidPattern.test(value.trim())) {
      throw new BadRequestException(`${field} must be a UUID`);
    }
    return value.trim();
  }

  private normalizeOptionalString(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) {
      throw new BadRequestException(`${field} must be a non-empty string up to 200 characters`);
    }
    return value.trim();
  }

  private normalizeOptionalIsoTimestamp(value: unknown, field: string): string | undefined {
    const normalized = this.normalizeOptionalString(value, field);
    if (!normalized) {
      return undefined;
    }
    const timestamp = Date.parse(normalized);
    if (!Number.isFinite(timestamp)) {
      throw new BadRequestException(`${field} must be an ISO timestamp`);
    }
    return normalized;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as { message?: unknown }).message;
        return Array.isArray(message) ? message.join('; ') : String(message);
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'unknown_error';
  }

  private normalizeRelationInput(
    sourceProductId: string,
    targetProductId: string,
    data: ProductRelationWriteInput,
  ) {
    if (sourceProductId === targetProductId) {
      throw new BadRequestException('Product relation cannot target the same product');
    }
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      throw new BadRequestException('Product relation payload must be an object');
    }

    const relationType = this.normalizeToken(
      data.relationType,
      'relationType',
      this.relationTypePattern,
      'relationType must be a lowercase relation type token',
    );
    const score = this.validateFiniteNonNegative(data.score, 'score');
    const confidence =
      data.confidence === undefined || data.confidence === null
        ? 1
        : this.validateFiniteNonNegative(data.confidence, 'confidence');
    if (confidence > 1) {
      throw new BadRequestException('confidence must be between zero and one');
    }

    const source =
      data.source === undefined || data.source === null || data.source === ''
        ? 'manual'
        : this.normalizeToken(
            data.source,
            'source',
            this.sourcePattern,
            'source must be a lowercase source token',
          );

    return {
      relationType,
      score,
      confidence,
      source,
      evidence: this.validateEvidence(data.evidence),
    };
  }

  private normalizeOptionalRelationType(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return this.normalizeToken(
      value,
      'relationType',
      this.relationTypePattern,
      'relationType must be a lowercase relation type token',
    );
  }

  private normalizeToken(
    value: unknown,
    field: string,
    pattern: RegExp,
    message: string,
  ): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} is required`);
    }
    const normalized = value.trim();
    if (!pattern.test(normalized)) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private validateFiniteNonNegative(value: unknown, field: string): number {
    const score = Number(value);
    if (!Number.isFinite(score)) {
      throw new BadRequestException(`${field} must be a finite number`);
    }
    if (score < 0) {
      throw new BadRequestException(`${field} must not be negative`);
    }
    return score;
  }

  private validateEvidence(value: unknown): ProductRelationEvidence {
    if (value === undefined || value === null) {
      return {};
    }
    if (Array.isArray(value) || typeof value !== 'object') {
      throw new BadRequestException('evidence must be a JSON object');
    }
    return value as ProductRelationEvidence;
  }

  private async filterVisibleTargets(
    relations: ProductRelation[],
    scope: ProductRelationAccessScope,
  ): Promise<ProductRelation[]> {
    if (this.canAccessAllProducts(scope.actor)) {
      return relations;
    }

    const checks = await Promise.all(relations.map(async (relation) => {
      try {
        await this.productsService.findOne(relation.targetProductId, scope as any);
        return relation;
      } catch (error) {
        if (error instanceof NotFoundException) {
          return null;
        }
        throw error;
      }
    }));

    return checks.filter((relation): relation is ProductRelation => relation !== null);
  }

  private canAccessAllProducts(actor?: CatalogActor): boolean {
    if (!actor || actor.type === 'service') {
      return true;
    }
    return actor.roles.some((role) => this.allProductAccessRoles.includes(role));
  }

  private compareRelations(left: ProductRelation, right: ProductRelation): number {
    const score = this.numberValue(right.score) - this.numberValue(left.score);
    if (score !== 0) {
      return score;
    }
    const confidence = this.numberValue(right.confidence) - this.numberValue(left.confidence);
    if (confidence !== 0) {
      return confidence;
    }
    return left.targetProductId.localeCompare(right.targetProductId);
  }

  private toResponse(relation: ProductRelation): ProductRelationResponse {
    return {
      id: relation.id,
      sourceProductId: relation.sourceProductId,
      targetProductId: relation.targetProductId,
      relationType: relation.relationType,
      score: this.numberValue(relation.score),
      confidence: this.numberValue(relation.confidence),
      source: relation.source,
      evidence: relation.evidence ?? {},
      createdAt: relation.createdAt,
      updatedAt: relation.updatedAt,
    };
  }

  private numberValue(value: unknown): number {
    return Number(value);
  }
}
