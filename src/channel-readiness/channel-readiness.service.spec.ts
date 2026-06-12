import { ChannelReadinessService } from './channel-readiness.service';

const product = (overrides: Record<string, unknown> = {}) => ({
  id: 'product-1',
  sku: 'SKU-001',
  title: 'Ready product',
  description: 'A complete catalog description.',
  isActive: true,
  lifecycle: 'active',
  categories: [{ id: 'category-1' }],
  media: [{ url: 'https://cdn.example.test/product.png' }],
  ...overrides,
});

const productReadiness = (overrides: Record<string, unknown> = {}) => ({
  lifecycle: 'active',
  checks: {
    duplicateSku: false,
    duplicateEan: false,
  },
  ...overrides,
});

describe('ChannelReadinessService', () => {
  it('returns missing fields and next actions for incomplete products', async () => {
    const productsService = {
      findOne: jest.fn(async () => product({
        title: '',
        description: '',
        categories: [],
        media: [],
      })),
      getReadiness: jest.fn(async () => productReadiness()),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => null),
    };
    const service = new ChannelReadinessService(productsService as any, pricingService as any);

    const readiness = await service.getProductReadiness('product-1');
    const flipflop = readiness.channels.find((channel) => channel.channel === 'flipflop');

    expect(readiness.ready).toBe(false);
    expect(flipflop?.ready).toBe(false);
    expect(flipflop?.missingFields).toEqual(expect.arrayContaining([
      'title',
      'description',
      'categories',
      'media',
      'pricing',
    ]));
    expect(flipflop?.issues.every((issue) => issue.nextAction.length > 0)).toBe(true);
  });

  it('marks FlipFlop ready while preserving FlipFlop authority for storefront behavior', async () => {
    const productsService = {
      findOne: jest.fn(async () => product()),
      getReadiness: jest.fn(async () => productReadiness()),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ id: 'price-1', productId: 'product-1', basePrice: 100, currency: 'CZK' })),
    };
    const service = new ChannelReadinessService(productsService as any, pricingService as any);

    const readiness = await service.getProductReadiness('product-1');
    const flipflop = readiness.channels.find((channel) => channel.channel === 'flipflop');

    expect(flipflop).toMatchObject({
      ready: true,
      status: 'ready',
      authority: 'flipflop',
      missingFields: [],
    });
    expect(flipflop?.nextAction).toContain('FlipFlop still owns storefront and checkout behavior');
  });

  it('makes Bazos draft readiness explicit without claiming publish permission', async () => {
    const productsService = {
      findOne: jest.fn(async () => product()),
      getReadiness: jest.fn(async () => productReadiness()),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ id: 'price-1', productId: 'product-1', basePrice: 100, currency: 'CZK' })),
    };
    const service = new ChannelReadinessService(productsService as any, pricingService as any);

    const readiness = await service.getProductReadiness('product-1');
    const bazos = readiness.channels.find((channel) => channel.channel === 'bazos_draft');
    const serialized = JSON.stringify(bazos).toLowerCase();

    expect(bazos).toMatchObject({
      ready: true,
      status: 'needs_review',
      authority: 'bazos',
      missingFields: [],
    });
    expect(bazos?.issues.map((issue) => issue.code)).toContain('bazos_policy_deferred');
    expect(serialized).not.toContain('canpublish');
    expect(serialized).not.toContain('publishpermission');
  });

  it('keeps the response extensible through channel entries', async () => {
    const productsService = {
      findOne: jest.fn(async () => product()),
      getReadiness: jest.fn(async () => productReadiness()),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => ({ id: 'price-1', productId: 'product-1', basePrice: 100, currency: 'CZK' })),
    };
    const service = new ChannelReadinessService(productsService as any, pricingService as any);

    const readiness = await service.getProductReadiness('product-1');

    expect(Array.isArray(readiness.channels)).toBe(true);
    expect(readiness.channels.map((channel) => channel.channel)).toEqual(expect.arrayContaining([
      'flipflop',
      'bazos_draft',
    ]));
  });
});
