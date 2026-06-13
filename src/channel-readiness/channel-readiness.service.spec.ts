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

const warehouseCoverage = (overrides: Record<string, unknown> = {}) => ({
  generatedAt: '2026-06-13T00:00:00.000Z',
  requestedProductIds: ['product-1'],
  invalidProductIds: [],
  totals: {
    totalProducts: 1,
    coveredProducts: 1,
    missingCoverageProducts: 0,
    localStockProducts: 1,
    supplierStockProducts: 0,
    dropshipStockProducts: 0,
    mixedStockProducts: 0,
    outOfStockProducts: 0,
  },
  items: [{
    productId: 'product-1',
    sku: 'SKU-001',
    source: 'warehouse',
    coverageStatus: 'covered',
    stockOrigin: 'local_stock',
    sellableWithWarehouse: true,
    totalQuantity: 7,
    totalReserved: 2,
    totalAvailable: 5,
    localAvailable: 5,
    supplierAvailable: 0,
    dropshipAvailable: 0,
    warehouseCount: 1,
    routeCount: 1,
    preferredRoute: 'local_fulfillment',
    blockingReasons: [],
    warehouses: [],
    logistics: null,
    ...overrides,
  }],
});

describe('ChannelReadinessService', () => {
  const buildService = (overrides: {
    product?: Record<string, unknown>;
    productReadiness?: Record<string, unknown>;
    price?: Record<string, unknown> | null;
    warehouseCoverage?: Record<string, unknown>;
  } = {}) => {
    const productsService = {
      findOne: jest.fn(async () => product(overrides.product)),
      getReadiness: jest.fn(async () => productReadiness(overrides.productReadiness)),
    };
    const pricingService = {
      getCurrentPrice: jest.fn(async () => overrides.price === undefined
        ? { id: 'price-1', productId: 'product-1', basePrice: 100, currency: 'CZK' }
        : overrides.price),
    };
    const warehouseAvailabilityService = {
      getBatchCoverage: jest.fn(async () => warehouseCoverage(overrides.warehouseCoverage)),
    };
    const service = new ChannelReadinessService(
      productsService as any,
      pricingService as any,
      warehouseAvailabilityService as any,
    );

    return { service, productsService, pricingService, warehouseAvailabilityService };
  };

  it('returns missing fields and next actions for incomplete products', async () => {
    const { service } = buildService({
      product: {
        title: '',
        description: '',
        categories: [],
        media: [],
      },
      price: null,
    });

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

  it('marks FlipFlop ready only with sellable Warehouse coverage while preserving FlipFlop authority', async () => {
    const { service, warehouseAvailabilityService } = buildService();

    const readiness = await service.getProductReadiness('product-1');
    const flipflop = readiness.channels.find((channel) => channel.channel === 'flipflop');

    expect(warehouseAvailabilityService.getBatchCoverage).toHaveBeenCalledWith({ productIds: ['product-1'] });
    expect(flipflop).toMatchObject({
      ready: true,
      status: 'ready',
      authority: 'flipflop',
      missingFields: [],
      warehouseCoverage: {
        sellableWithWarehouse: true,
        coverageStatus: 'covered',
        totalAvailable: 5,
        routeCount: 1,
        stockOrigin: 'local_stock',
      },
    });
    expect(flipflop?.nextAction).toContain('Warehouse coverage');
    expect(flipflop?.nextAction).toContain('FlipFlop still owns storefront and checkout behavior');
  });

  it('blocks FlipFlop readiness when Warehouse has stock but no reservable route', async () => {
    const { service } = buildService({
      warehouseCoverage: {
        coverageStatus: 'missing_route',
        sellableWithWarehouse: false,
        totalAvailable: 5,
        routeCount: 0,
        blockingReasons: ['warehouse_logistics_route_missing'],
      },
    });

    const readiness = await service.getProductReadiness('product-1');
    const flipflop = readiness.channels.find((channel) => channel.channel === 'flipflop');

    expect(readiness.ready).toBe(false);
    expect(flipflop).toMatchObject({
      ready: false,
      status: 'blocked',
      missingFields: expect.arrayContaining(['warehouseCoverage']),
      warehouseCoverage: expect.objectContaining({
        sellableWithWarehouse: false,
        coverageStatus: 'missing_route',
        totalAvailable: 5,
        routeCount: 0,
      }),
    });
    expect(flipflop?.issues.map((issue) => issue.code)).toContain('warehouse_logistics_route_missing');
  });

  it('uses injected Warehouse coverage facts without fetching coverage again', async () => {
    const { service, warehouseAvailabilityService } = buildService();

    const readiness = await service.getProductReadiness('product-1', {
      warehouseCoverage: {
        sellableWithWarehouse: true,
        coverageStatus: 'covered',
        totalAvailable: 3,
        routeCount: 1,
        stockOrigin: 'supplier_stock',
        blockingReasons: [],
      },
    });
    const flipflop = readiness.channels.find((channel) => channel.channel === 'flipflop');

    expect(warehouseAvailabilityService.getBatchCoverage).not.toHaveBeenCalled();
    expect(flipflop?.warehouseCoverage).toMatchObject({
      sellableWithWarehouse: true,
      totalAvailable: 3,
      stockOrigin: 'supplier_stock',
    });
  });

  it('makes Bazos draft readiness explicit without claiming publish permission', async () => {
    const { service } = buildService();

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
    const { service } = buildService();

    const readiness = await service.getProductReadiness('product-1');

    expect(Array.isArray(readiness.channels)).toBe(true);
    expect(readiness.channels.map((channel) => channel.channel)).toEqual(expect.arrayContaining([
      'flipflop',
      'bazos_draft',
    ]));
  });
});
