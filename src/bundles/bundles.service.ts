import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import type { CatalogActor } from '../auth/catalog-auth.guard';
import { LoggerService } from '../logger/logger.service';
import { PricingService } from '../pricing/pricing.service';
import { Product } from '../products/product.entity';
import { ProductsService } from '../products/products.service';
import { CatalogBundleItem } from './catalog-bundle-item.entity';
import {
  CatalogBundle,
  CatalogBundleJson,
  CatalogBundleSource,
  CatalogBundleValidationState,
  CatalogBundleVisibility,
} from './catalog-bundle.entity';
import { CreateCatalogBundleDto, UpdateCatalogBundleDto } from './bundles.dto';

type BundleScope = { actor?: CatalogActor };
type NormalizedItem = { productId: string; quantity: number; position: number; role: 'component' };
type NormalizedPresentation = {
  displayName: string;
  description: string | null;
  pricePolicy: 'checkout_authoritative';
  discountPolicyRef: string | null;
  freeShippingPolicyRef: string | null;
  currencyHint: string | null;
};
type NormalizedBundleInput = {
  contractVersion: 'catalog.bundle.v1';
  idempotencyKey: string;
  source: CatalogBundleSource;
  items: NormalizedItem[];
  presentation: NormalizedPresentation;
  visibility: CatalogBundleVisibility;
  evidence: CatalogBundleJson;
};

const CONTRACT_VERSION = 'catalog.bundle.v1';
const ADMIN_ROLES = new Set([
  'global:superadmin',
  'global:platform_admin',
  'app:catalog-microservice:admin',
  'internal:catalog-microservice:admin',
]);
const SENSITIVE_EVIDENCE_KEYS = [
  'customer',
  'address',
  'payment',
  'provider',
  'token',
  'secret',
  'password',
  'authorization',
  'cookie',
  'session',
  'card',
];

export type CatalogBundleResponse = {
  bundleId: string;
  contractVersion: string;
  status: string;
  source: string;
  idempotencyKey: string;
  idempotencyReplayed?: boolean;
  items: NormalizedItem[];
  presentation: NormalizedPresentation;
  visibility: CatalogBundleVisibility;
  evidence: CatalogBundleJson;
  validation: { state: CatalogBundleValidationState; blockers: string[] };
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

@Injectable()
export class BundlesService {
  constructor(
    @InjectRepository(CatalogBundle)
    private readonly bundleRepository: Repository<CatalogBundle>,
    @InjectRepository(CatalogBundleItem)
    private readonly itemRepository: Repository<CatalogBundleItem>,
    private readonly productsService: ProductsService,
    private readonly pricingService: PricingService,
    private readonly logger: LoggerService,
  ) {}

  async create(data: CreateCatalogBundleDto, scope: BundleScope = {}): Promise<CatalogBundleResponse> {
    const normalized = await this.normalizeCreateInput(data, scope);
    const existing = await this.findByIdempotency(normalized.idempotencyKey);
    const requestHash = this.hashNormalized(normalized);

    if (existing) {
      if (existing.idempotencyRequestHash !== requestHash) {
        throw new ConflictException('idempotency_conflict');
      }
      return { ...this.toResponse(existing), idempotencyReplayed: true };
    }

    const validation = await this.validateBundle(normalized, false, scope);
    const bundle = this.bundleRepository.create({
      contractVersion: normalized.contractVersion,
      status: 'draft',
      source: normalized.source,
      idempotencyKey: normalized.idempotencyKey,
      idempotencyRequestHash: requestHash,
      displayName: normalized.presentation.displayName,
      description: normalized.presentation.description,
      pricePolicy: normalized.presentation.pricePolicy,
      discountPolicyRef: normalized.presentation.discountPolicyRef,
      freeShippingPolicyRef: normalized.presentation.freeShippingPolicyRef,
      currencyHint: normalized.presentation.currencyHint,
      visibility: normalized.visibility,
      evidence: normalized.evidence,
      validation,
      createdBy: this.actorEvidence(scope.actor),
      updatedBy: this.actorEvidence(scope.actor),
      archivedAt: null,
    });
    bundle.items = normalized.items.map((item) => this.itemRepository.create(item));

    return this.toResponse(await this.bundleRepository.save(bundle));
  }

  async get(bundleId: string, scope: BundleScope = {}): Promise<CatalogBundleResponse> {
    const bundle = await this.findOneBundle(bundleId);
    if (!this.canRead(bundle, scope)) {
      throw new NotFoundException(`Bundle ${bundleId} not found`);
    }
    return this.toResponse(bundle);
  }

  async list(query: {
    status?: string;
    source?: string;
    productId?: string;
    channel?: string;
    limit?: number;
    cursor?: string;
  }, scope: BundleScope = {}): Promise<{ items: CatalogBundleResponse[]; nextCursor: string | null }> {
    const limit = Math.max(1, Math.min(Number(query.limit ?? 20), 100));
    const bundles = await this.bundleRepository.find({
      relations: { items: true },
      where: {
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.source ? { source: query.source as any } : {}),
      },
    });

    const cursor = this.decodeCursor(query.cursor);
    const filtered = bundles
      .filter((bundle) => this.canRead(bundle, scope))
      .filter((bundle) => !query.productId || bundle.items?.some((item) => item.productId === query.productId))
      .filter((bundle) => !query.channel || bundle.visibility?.channels?.includes(query.channel))
      .sort((left, right) => this.compareBundles(left, right))
      .filter((bundle) => !cursor || this.isAfterCursor(bundle, cursor));

    const page = filtered.slice(0, limit);
    const nextCursor = filtered.length > limit ? this.encodeCursor(page[page.length - 1]) : null;

    return { items: page.map((bundle) => this.toResponse(bundle)), nextCursor };
  }

  async update(bundleId: string, data: UpdateCatalogBundleDto, scope: BundleScope = {}): Promise<CatalogBundleResponse> {
    const bundle = await this.findOneBundle(bundleId);
    if (bundle.status !== 'draft') {
      throw new BadRequestException('Only draft bundles can be updated');
    }

    const normalized = await this.normalizeUpdateInput(bundle, data, scope);
    const validation = await this.validateBundle(normalized, false, scope);
    const requestHash = this.hashNormalized(normalized);

    Object.assign(bundle, {
      idempotencyRequestHash: requestHash,
      displayName: normalized.presentation.displayName,
      description: normalized.presentation.description,
      pricePolicy: normalized.presentation.pricePolicy,
      discountPolicyRef: normalized.presentation.discountPolicyRef,
      freeShippingPolicyRef: normalized.presentation.freeShippingPolicyRef,
      currencyHint: normalized.presentation.currencyHint,
      visibility: normalized.visibility,
      evidence: normalized.evidence,
      validation,
      updatedBy: this.actorEvidence(scope.actor),
    });
    bundle.items = normalized.items.map((item) => this.itemRepository.create({ ...item, bundleId: bundle.id }));

    return this.toResponse(await this.bundleRepository.save(bundle));
  }

  async activate(bundleId: string, scope: BundleScope = {}): Promise<CatalogBundleResponse> {
    const bundle = await this.findOneBundle(bundleId);
    if (bundle.status !== 'draft') {
      throw new BadRequestException('Only draft bundles can be activated');
    }

    const normalized = this.normalizeExisting(bundle);
    const validation = await this.validateBundle(normalized, true, scope);
    if (validation.blockers.length > 0) {
      bundle.validation = validation;
      bundle.updatedBy = this.actorEvidence(scope.actor);
      await this.bundleRepository.save(bundle);
      throw new BadRequestException({ message: 'bundle_activation_blocked', blockers: validation.blockers });
    }

    bundle.status = 'active';
    bundle.validation = validation;
    bundle.updatedBy = this.actorEvidence(scope.actor);
    return this.toResponse(await this.bundleRepository.save(bundle));
  }

  async archive(bundleId: string, scope: BundleScope = {}): Promise<CatalogBundleResponse> {
    const bundle = await this.findOneBundle(bundleId);
    if (bundle.status === 'archived') {
      return this.toResponse(bundle);
    }
    bundle.status = 'archived';
    bundle.archivedAt = new Date();
    bundle.updatedBy = this.actorEvidence(scope.actor);
    bundle.validation = { state: 'blocked', blockers: ['bundle_archived'] };
    return this.toResponse(await this.bundleRepository.save(bundle));
  }

  private async normalizeCreateInput(data: CreateCatalogBundleDto, scope: BundleScope): Promise<NormalizedBundleInput> {
    if (data.contractVersion !== CONTRACT_VERSION) {
      throw new BadRequestException('contractVersion must equal catalog.bundle.v1');
    }
    if (!data.idempotencyKey || data.idempotencyKey.trim().length < 8) {
      throw new BadRequestException('idempotencyKey is required');
    }
    return this.normalizeInput({
      contractVersion: CONTRACT_VERSION,
      idempotencyKey: data.idempotencyKey.trim(),
      source: data.source,
      items: data.items,
      presentation: data.presentation,
      visibility: data.visibility,
      evidence: data.evidence,
    }, scope);
  }

  private async normalizeUpdateInput(bundle: CatalogBundle, data: UpdateCatalogBundleDto, scope: BundleScope): Promise<NormalizedBundleInput> {
    const current = this.normalizeExisting(bundle);
    return this.normalizeInput({
      contractVersion: CONTRACT_VERSION,
      idempotencyKey: bundle.idempotencyKey,
      source: bundle.source,
      items: data.items ?? current.items,
      presentation: { ...current.presentation, ...(data.presentation ?? {}) },
      visibility: data.visibility ? { ...current.visibility, ...data.visibility } : current.visibility,
      evidence: data.evidence ?? current.evidence,
    }, scope);
  }

  private async normalizeInput(data: any, scope: BundleScope): Promise<NormalizedBundleInput> {
    const items = this.normalizeItems(data.items);
    await this.assertProductsVisible(items.map((item) => item.productId), scope);
    const presentation = this.normalizePresentation(data.presentation);
    const visibility = this.normalizeVisibility(data.visibility);
    const evidence = this.validateEvidence(data.evidence ?? {});
    return {
      contractVersion: CONTRACT_VERSION,
      idempotencyKey: data.idempotencyKey,
      source: data.source,
      items,
      presentation,
      visibility,
      evidence,
    };
  }

  private normalizeItems(items: any[]): NormalizedItem[] {
    if (!Array.isArray(items) || items.length < 2 || items.length > 10) {
      throw new BadRequestException('Bundle items must contain 2 to 10 components');
    }

    const normalized = items.map((item, index) => ({
      productId: item.productId,
      quantity: Number(item.quantity ?? 1),
      position: Number(item.position ?? index + 1),
      role: 'component' as const,
    }));
    const ids = new Set(normalized.map((item) => item.productId));
    if (ids.size !== normalized.length) {
      throw new BadRequestException('Bundle items must reference unique products');
    }
    for (const item of normalized) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new BadRequestException('Bundle item quantity must be an integer from 1 to 99');
      }
      if (!Number.isInteger(item.position) || item.position < 1) {
        throw new BadRequestException('Bundle item position must be a positive integer');
      }
    }
    return normalized.sort((left, right) => left.position - right.position || left.productId.localeCompare(right.productId));
  }

  private normalizePresentation(data: any): NormalizedPresentation {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('presentation is required');
    }
    const displayName = String(data.displayName ?? '').trim();
    if (!displayName) {
      throw new BadRequestException('presentation.displayName is required');
    }
    const currencyHint = data.currencyHint === undefined || data.currencyHint === null || data.currencyHint === ''
      ? null
      : String(data.currencyHint).trim().toUpperCase();
    if (currencyHint && !/^[A-Z]{3}$/.test(currencyHint)) {
      throw new BadRequestException('presentation.currencyHint must be an ISO currency code');
    }
    if (data.pricePolicy && data.pricePolicy !== 'checkout_authoritative') {
      throw new BadRequestException('presentation.pricePolicy must be checkout_authoritative');
    }
    return {
      displayName,
      description: data.description === undefined || data.description === null ? null : String(data.description),
      pricePolicy: 'checkout_authoritative',
      discountPolicyRef: this.nullableTrim(data.discountPolicyRef),
      freeShippingPolicyRef: this.nullableTrim(data.freeShippingPolicyRef),
      currencyHint,
    };
  }

  private normalizeVisibility(data: any): CatalogBundleVisibility {
    const scope = data?.scope ?? 'catalog_internal';
    if (!['catalog_internal', 'storefront', 'channel'].includes(scope)) {
      throw new BadRequestException('visibility.scope is unsupported');
    }
    const channels: string[] = Array.isArray(data?.channels)
      ? [...new Set(data.channels.map((channel: unknown) => String(channel).trim()).filter(Boolean) as string[])].sort()
      : [];
    if (scope === 'channel' && channels.length === 0) {
      throw new BadRequestException('visibility.channels is required when scope=channel');
    }
    return {
      scope,
      channels,
      startsAt: this.nullableIsoDate(data?.startsAt, 'visibility.startsAt'),
      endsAt: this.nullableIsoDate(data?.endsAt, 'visibility.endsAt'),
    };
  }

  private validateEvidence(value: unknown): CatalogBundleJson {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('evidence must be an object');
    }
    const serialized = JSON.stringify(value).toLowerCase();
    if (SENSITIVE_EVIDENCE_KEYS.some((key) => serialized.includes(key))) {
      throw new BadRequestException('evidence must not contain sensitive customer/payment/provider/token fields');
    }
    return value as CatalogBundleJson;
  }

  private async validateBundle(input: NormalizedBundleInput, activating: boolean, scope: BundleScope): Promise<{ state: CatalogBundleValidationState; blockers: string[] }> {
    const blockers: string[] = [];
    const products = await this.loadProducts(input.items.map((item) => item.productId), scope);
    for (const item of input.items) {
      const product = products.get(item.productId);
      if (!product) {
        blockers.push('product_not_visible');
        continue;
      }
      if (!product.isActive || product.lifecycle === 'archived') {
        blockers.push('product_inactive');
      }
    }

    if (input.visibility.endsAt && Date.parse(input.visibility.endsAt) <= Date.now()) {
      blockers.push('visibility_window_expired');
    }
    if (input.visibility.startsAt && input.visibility.endsAt && Date.parse(input.visibility.startsAt) >= Date.parse(input.visibility.endsAt)) {
      blockers.push('visibility_window_invalid');
    }

    if (activating) {
      if (input.visibility.scope !== 'catalog_internal') {
        blockers.push('checkout_contract_missing');
      }
      const needsPolicyPriceEvidence = Boolean(input.presentation.discountPolicyRef || input.presentation.freeShippingPolicyRef);
      if (needsPolicyPriceEvidence) {
        const currencies = new Set<string>();
        for (const item of input.items) {
          const price = await this.pricingService.getCurrentPrice(item.productId);
          if (!price) {
            blockers.push('current_price_missing');
            continue;
          }
          currencies.add(price.currency);
        }
        if (currencies.size > 1 || (input.presentation.currencyHint && !currencies.has(input.presentation.currencyHint))) {
          blockers.push('currency_mismatch');
        }
      }
    }

    const uniqueBlockers = [...new Set(blockers)].sort();
    return { state: uniqueBlockers.length ? 'blocked' : 'valid', blockers: uniqueBlockers };
  }

  private async assertProductsVisible(productIds: string[], scope: BundleScope): Promise<void> {
    for (const productId of productIds) {
      await this.productsService.findOne(productId, { actor: scope.actor });
    }
  }

  private async loadProducts(productIds: string[], scope: BundleScope): Promise<Map<string, Product>> {
    const products = new Map<string, Product>();
    for (const productId of productIds) {
      try {
        products.set(productId, await this.productsService.findOne(productId, { actor: scope.actor }));
      } catch {
        // Visibility failures become stable validation blockers.
      }
    }
    return products;
  }

  private findByIdempotency(idempotencyKey: string): Promise<CatalogBundle | null> {
    return this.bundleRepository.findOne({
      where: { contractVersion: CONTRACT_VERSION, idempotencyKey },
      relations: { items: true },
    });
  }

  private async findOneBundle(bundleId: string): Promise<CatalogBundle> {
    const bundle = await this.bundleRepository.findOne({
      where: { id: bundleId },
      relations: { items: true },
    });
    if (!bundle) {
      throw new NotFoundException(`Bundle ${bundleId} not found`);
    }
    return bundle;
  }

  private normalizeExisting(bundle: CatalogBundle): NormalizedBundleInput {
    return {
      contractVersion: CONTRACT_VERSION,
      idempotencyKey: bundle.idempotencyKey,
      source: bundle.source,
      items: (bundle.items ?? []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        position: Number(item.position),
        role: 'component' as const,
      })).sort((left, right) => left.position - right.position || left.productId.localeCompare(right.productId)),
      presentation: {
        displayName: bundle.displayName,
        description: bundle.description ?? null,
        pricePolicy: 'checkout_authoritative',
        discountPolicyRef: bundle.discountPolicyRef ?? null,
        freeShippingPolicyRef: bundle.freeShippingPolicyRef ?? null,
        currencyHint: bundle.currencyHint ?? null,
      },
      visibility: bundle.visibility,
      evidence: bundle.evidence ?? {},
    };
  }

  private hashNormalized(input: NormalizedBundleInput): string {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  private canRead(bundle: CatalogBundle, scope: BundleScope): boolean {
    if (this.isAdmin(scope.actor)) {
      return true;
    }
    if (bundle.status !== 'active') {
      return false;
    }
    if (bundle.visibility.scope === 'catalog_internal') {
      return false;
    }
    if (bundle.visibility.endsAt && Date.parse(bundle.visibility.endsAt) <= Date.now()) {
      return false;
    }
    if (bundle.visibility.startsAt && Date.parse(bundle.visibility.startsAt) > Date.now()) {
      return false;
    }
    return true;
  }

  private isAdmin(actor?: CatalogActor): boolean {
    return Boolean(actor?.roles?.some((role) => ADMIN_ROLES.has(role)) || actor?.type === 'service');
  }

  private toResponse(bundle: CatalogBundle): CatalogBundleResponse {
    return {
      bundleId: bundle.id,
      contractVersion: bundle.contractVersion,
      status: bundle.status,
      source: bundle.source,
      idempotencyKey: bundle.idempotencyKey,
      items: (bundle.items ?? []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        position: Number(item.position),
        role: 'component' as const,
      })).sort((left, right) => left.position - right.position || left.productId.localeCompare(right.productId)),
      presentation: {
        displayName: bundle.displayName,
        description: bundle.description ?? null,
        pricePolicy: 'checkout_authoritative',
        discountPolicyRef: bundle.discountPolicyRef ?? null,
        freeShippingPolicyRef: bundle.freeShippingPolicyRef ?? null,
        currencyHint: bundle.currencyHint ?? null,
      },
      visibility: bundle.visibility,
      evidence: bundle.evidence ?? {},
      validation: bundle.validation ?? { state: 'blocked', blockers: [] },
      createdAt: bundle.createdAt?.toISOString?.() ?? String(bundle.createdAt),
      updatedAt: bundle.updatedAt?.toISOString?.() ?? String(bundle.updatedAt),
      archivedAt: bundle.archivedAt ? bundle.archivedAt.toISOString() : null,
    };
  }

  private actorEvidence(actor?: CatalogActor): CatalogBundleJson | null {
    if (!actor) {
      return null;
    }
    return {
      type: actor.type,
      sub: actor.sub,
      source: actor.source,
      serviceName: actor.serviceName,
      roles: actor.roles,
      authMethod: actor.authMethod,
    };
  }

  private nullableTrim(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    return String(value).trim() || null;
  }

  private nullableIsoDate(value: unknown, field: string): string | null {
    const trimmed = this.nullableTrim(value);
    if (!trimmed) {
      return null;
    }
    const time = Date.parse(trimmed);
    if (!Number.isFinite(time)) {
      throw new BadRequestException(`${field} must be an ISO date`);
    }
    return new Date(time).toISOString();
  }

  private compareBundles(left: CatalogBundle, right: CatalogBundle): number {
    const updated = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    return updated !== 0 ? updated : left.id.localeCompare(right.id);
  }

  private encodeCursor(bundle: CatalogBundle): string {
    return Buffer.from(`${new Date(bundle.updatedAt).toISOString()}|${bundle.id}`).toString('base64url');
  }

  private decodeCursor(cursor?: string): { updatedAt: string; id: string } | null {
    if (!cursor) {
      return null;
    }
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [updatedAt, id] = decoded.split('|');
    if (!updatedAt || !id) {
      throw new BadRequestException('Invalid cursor');
    }
    return { updatedAt, id };
  }

  private isAfterCursor(bundle: CatalogBundle, cursor: { updatedAt: string; id: string }): boolean {
    const updatedComparison = new Date(bundle.updatedAt).getTime() - new Date(cursor.updatedAt).getTime();
    if (updatedComparison < 0) {
      return true;
    }
    if (updatedComparison > 0) {
      return false;
    }
    return bundle.id.localeCompare(cursor.id) > 0;
  }
}
