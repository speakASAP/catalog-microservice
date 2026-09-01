import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductPricing } from './product-pricing.entity';
import { Product } from '../products/product.entity';
import { LoggerService } from '../logger/logger.service';

export type PricingWriteInput = Partial<ProductPricing>;

export type BulkPricingResult = {
  count: number;
  prices: ProductPricing[];
};

@Injectable()
export class PricingService {
  private readonly currencyPattern = /^[A-Z]{3}$/;

  constructor(
    @InjectRepository(ProductPricing)
    private readonly pricingRepository: Repository<ProductPricing>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get current active pricing for a product.
   */
  async getCurrentPrice(productId: string, now = new Date()): Promise<ProductPricing | null> {
    const candidates = await this.pricingRepository.find({
      where: { productId, isActive: true },
    });

    return this.selectCurrentPrice(candidates, now);
  }

  /**
   * Get all pricing history for a product
   */
  async findByProduct(productId: string): Promise<ProductPricing[]> {
    return this.pricingRepository.find({
      where: { productId },
      order: { validFrom: 'DESC' },
    });
  }

  /**
   * Create or update pricing
   */
  async upsert(data: PricingWriteInput): Promise<ProductPricing> {
    const normalized = this.validatePricingInput(data);
    this.logger.log(`Upserting pricing for product: ${normalized.productId}`, 'PricingService');

    // Without this check a missing product reaches the database and the
    // product_pricing_product_id_fkey violation escapes as an unhandled 500.
    // Callers cannot tell "no such product" from "catalog is broken": orders'
    // updateCatalogPricing reports both as "upstream request failed".
    await this.assertProductExists(normalized.productId as string);

    // Deactivate other active pricing of same type for this product
    if (normalized.isActive) {
      await this.pricingRepository.update(
        { productId: normalized.productId, priceType: normalized.priceType || 'regular', isActive: true },
        { isActive: false },
      );
    }

    const pricing = this.pricingRepository.create(normalized);
    return this.pricingRepository.save(pricing);
  }

  /**
   * A 4xx condition must not surface as a 5xx. `product_pricing.product_id` is
   * a foreign key, so an unknown product is a client error (404), not a server
   * fault.
   */
  private async assertProductExists(productId: string): Promise<void> {
    const found = await this.productRepository.count({ where: { id: productId } });
    if (!found) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
  }

  async bulkUpsert(entries: PricingWriteInput[], humanReviewMarker?: string): Promise<BulkPricingResult> {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestException('Bulk pricing payload must contain at least one pricing row');
    }

    if (entries.length > 10 && humanReviewMarker !== 'explicit') {
      throw new BadRequestException('Mass pricing changes over 10 rows require x-human-review: explicit');
    }

    const prices: ProductPricing[] = [];
    for (const entry of entries) {
      prices.push(await this.upsert(entry));
    }

    return { count: prices.length, prices };
  }

  /**
   * Update pricing
   */
  async update(id: string, data: PricingWriteInput): Promise<ProductPricing> {
    if (Array.isArray(data)) {
      throw new BadRequestException('Pricing update payload must be a single object');
    }

    const pricing = await this.pricingRepository.findOne({ where: { id } });
    if (!pricing) {
      throw new NotFoundException(`Pricing ${id} not found`);
    }

    const normalized = this.validatePricingInput(data, pricing);
    Object.assign(pricing, normalized);
    return this.pricingRepository.save(pricing);
  }

  /**
   * Delete pricing
   */
  async remove(id: string): Promise<void> {
    const result = await this.pricingRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Pricing ${id} not found`);
    }
  }

  private selectCurrentPrice(prices: ProductPricing[], now: Date): ProductPricing | null {
    const validPrices = prices.filter((price) => this.isCurrentlyValid(price, now));
    if (validPrices.length === 0) {
      return null;
    }

    return validPrices.sort((left, right) => this.compareCurrentPricePriority(left, right))[0];
  }

  private isCurrentlyValid(price: ProductPricing, now: Date): boolean {
    if (!price.isActive) {
      return false;
    }

    const validFrom = this.toDate(price.validFrom);
    const validTo = this.toDate(price.validTo);
    return (!validFrom || validFrom.getTime() <= now.getTime()) && (!validTo || validTo.getTime() >= now.getTime());
  }

  private compareCurrentPricePriority(left: ProductPricing, right: ProductPricing): number {
    const salePriority = this.salePriority(right) - this.salePriority(left);
    if (salePriority !== 0) {
      return salePriority;
    }

    const validFromPriority = this.timestamp(right.validFrom) - this.timestamp(left.validFrom);
    if (validFromPriority !== 0) {
      return validFromPriority;
    }

    const updatedPriority = this.timestamp(right.updatedAt) - this.timestamp(left.updatedAt);
    if (updatedPriority !== 0) {
      return updatedPriority;
    }

    return this.timestamp(right.createdAt) - this.timestamp(left.createdAt);
  }

  private salePriority(price: ProductPricing): number {
    return price.salePrice !== null && price.salePrice !== undefined || price.priceType === 'sale' ? 1 : 0;
  }

  private validatePricingInput(data: PricingWriteInput, current?: ProductPricing): PricingWriteInput {
    if (Array.isArray(data)) {
      throw new BadRequestException('Pricing payload must be a single object');
    }

    const merged = { ...current, ...data } as PricingWriteInput;
    const normalized: PricingWriteInput = { ...data };

    if (!merged.productId) {
      throw new BadRequestException('productId is required');
    }

    if (data.currency !== undefined || !current) {
      normalized.currency = this.validateCurrency(merged.currency ?? 'CZK');
    }

    if (data.priceType !== undefined || !current) {
      normalized.priceType = this.validatePriceType(merged.priceType ?? 'regular');
    }

    const basePrice = this.validatePositiveAmount(merged.basePrice, 'basePrice');
    if (data.basePrice !== undefined || !current) {
      normalized.basePrice = basePrice;
    }

    if (merged.costPrice !== null && merged.costPrice !== undefined) {
      const costPrice = this.validatePositiveAmount(merged.costPrice, 'costPrice');
      if (data.costPrice !== undefined) {
        normalized.costPrice = costPrice;
      }
    }

    if (merged.salePrice !== null && merged.salePrice !== undefined) {
      const salePrice = this.validatePositiveAmount(merged.salePrice, 'salePrice');
      if (salePrice > basePrice) {
        throw new BadRequestException('salePrice must not exceed basePrice');
      }
      if (data.salePrice !== undefined) {
        normalized.salePrice = salePrice;
      }
    }

    const validFrom = this.parseOptionalDate(merged.validFrom, 'validFrom');
    const validTo = this.parseOptionalDate(merged.validTo, 'validTo');
    if (validFrom && validTo && validFrom.getTime() >= validTo.getTime()) {
      throw new BadRequestException('validFrom must be before validTo');
    }

    if (data.validFrom !== undefined) {
      normalized.validFrom = validFrom;
    }
    if (data.validTo !== undefined) {
      normalized.validTo = validTo;
    }
    if (data.isActive !== undefined) {
      normalized.isActive = Boolean(data.isActive);
    } else if (!current) {
      normalized.isActive = true;
    }

    if (data.marginPercent !== undefined && data.marginPercent !== null) {
      normalized.marginPercent = this.validateFiniteNumber(data.marginPercent, 'marginPercent');
    }

    return normalized;
  }

  private validateCurrency(value: unknown): string {
    if (typeof value !== 'string' || !this.currencyPattern.test(value.trim())) {
      throw new BadRequestException('currency must be a three-letter uppercase ISO-style code');
    }
    return value.trim();
  }

  private validatePriceType(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{0,49}$/.test(value.trim())) {
      throw new BadRequestException('priceType must be a lowercase price type token');
    }
    return value.trim();
  }

  private validatePositiveAmount(value: unknown, field: string): number {
    const amount = this.validateFiniteNumber(value, field);
    if (amount <= 0) {
      throw new BadRequestException(`${field} must be greater than zero`);
    }
    return amount;
  }

  private validateFiniteNumber(value: unknown, field: string): number {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      throw new BadRequestException(`${field} must be a finite number`);
    }
    return amount;
  }

  private parseOptionalDate(value: unknown, field: string): Date | null {
    if (value === null || value === undefined) {
      return null;
    }

    const date = this.toDate(value);
    if (!date || Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    return value instanceof Date ? value : new Date(value as string | number);
  }

  private timestamp(value: unknown): number {
    return this.toDate(value)?.getTime() ?? 0;
  }
}
