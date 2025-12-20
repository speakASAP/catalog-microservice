import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { ProductPricing } from './product-pricing.entity';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(ProductPricing)
    private readonly pricingRepository: Repository<ProductPricing>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get current active pricing for a product
   */
  async getCurrentPrice(productId: string): Promise<ProductPricing | null> {
    const now = new Date();

    return this.pricingRepository.findOne({
      where: [
        {
          productId,
          isActive: true,
          validFrom: LessThanOrEqual(now),
          validTo: MoreThanOrEqual(now),
        },
        {
          productId,
          isActive: true,
          validFrom: IsNull(),
          validTo: IsNull(),
        },
        {
          productId,
          isActive: true,
          validFrom: LessThanOrEqual(now),
          validTo: IsNull(),
        },
      ],
      order: { priceType: 'DESC' }, // sale price takes priority
    });
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
  async upsert(data: Partial<ProductPricing>): Promise<ProductPricing> {
    this.logger.log(`Upserting pricing for product: ${data.productId}`, 'PricingService');

    // Deactivate other active pricing of same type for this product
    if (data.isActive) {
      await this.pricingRepository.update(
        { productId: data.productId, priceType: data.priceType || 'regular', isActive: true },
        { isActive: false }
      );
    }

    const pricing = this.pricingRepository.create(data);
    return this.pricingRepository.save(pricing);
  }

  /**
   * Update pricing
   */
  async update(id: string, data: Partial<ProductPricing>): Promise<ProductPricing> {
    const pricing = await this.pricingRepository.findOne({ where: { id } });
    if (!pricing) {
      throw new NotFoundException(`Pricing ${id} not found`);
    }
    Object.assign(pricing, data);
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
}

