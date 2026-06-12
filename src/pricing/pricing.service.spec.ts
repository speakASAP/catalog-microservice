import { BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { ProductPricing } from './product-pricing.entity';

const logger = {
  log: jest.fn(),
  warn: jest.fn(),
};

const pricingRow = (overrides: Partial<ProductPricing>): ProductPricing => ({
  id: 'price-1',
  productId: 'product-1',
  product: undefined as never,
  basePrice: 100,
  currency: 'CZK',
  costPrice: null as never,
  marginPercent: null as never,
  salePrice: null as never,
  validFrom: null as never,
  validTo: null as never,
  isActive: true,
  priceType: 'regular',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('PricingService pricing integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects current price deterministically with sale priority and newest valid start', async () => {
    const repository = {
      find: jest.fn(async () => [
        pricingRow({ id: 'regular-newer', basePrice: 90, validFrom: new Date('2026-05-01T00:00:00.000Z') }),
        pricingRow({ id: 'sale-older', basePrice: 100, salePrice: 80, priceType: 'sale', validFrom: new Date('2026-04-01T00:00:00.000Z') }),
        pricingRow({ id: 'sale-newer', basePrice: 100, salePrice: 75, priceType: 'sale', validFrom: new Date('2026-05-15T00:00:00.000Z') }),
      ]),
    };
    const service = new PricingService(repository as any, logger as any);

    const current = await service.getCurrentPrice('product-1', new Date('2026-06-01T00:00:00.000Z'));

    expect(current?.id).toBe('sale-newer');
  });

  it('rejects invalid pricing amounts, currency, and sale price rules', async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'price-created', ...data })),
      update: jest.fn(),
    };
    const service = new PricingService(repository as any, logger as any);

    await expect(service.upsert({ productId: 'product-1', basePrice: 0, currency: 'CZK' }))
      .rejects.toThrow(BadRequestException);
    await expect(service.upsert({ productId: 'product-1', basePrice: 10, currency: 'czk' }))
      .rejects.toThrow(BadRequestException);
    await expect(service.upsert({ productId: 'product-1', basePrice: 10, currency: 'CZK', salePrice: 11 }))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects invalid validity windows', async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'price-created', ...data })),
      update: jest.fn(),
    };
    const service = new PricingService(repository as any, logger as any);

    await expect(service.upsert({
      productId: 'product-1',
      basePrice: 10,
      currency: 'CZK',
      validFrom: new Date('2026-06-02T00:00:00.000Z'),
      validTo: new Date('2026-06-01T00:00:00.000Z'),
    })).rejects.toThrow(BadRequestException);
  });

  it('requires explicit human review for mass pricing changes over 10 rows', async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: `price-${data.productId}`, ...data })),
      update: jest.fn(),
    };
    const service = new PricingService(repository as any, logger as any);
    const entries = Array.from({ length: 11 }, (_, index) => ({
      productId: `product-${index}`,
      basePrice: 100 + index,
      currency: 'CZK',
    }));

    await expect(service.bulkUpsert(entries)).rejects.toThrow(BadRequestException);

    const result = await service.bulkUpsert(entries, 'explicit');
    expect(result.count).toBe(11);
    expect(repository.save).toHaveBeenCalledTimes(11);
  });
});
