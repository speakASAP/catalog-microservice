import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { WarehouseAvailabilityService } from './warehouse-availability.service';

const logger = {
  log: jest.fn(),
  warn: jest.fn(),
};

describe('WarehouseAvailabilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown catalog product IDs before calling warehouse', async () => {
    const productsService = {
      findIdentitiesByIds: jest.fn(async () => [{ id: 'product-1', sku: 'SKU-001' }]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    const warehouseSpy = jest.spyOn(service as any, 'fetchWarehouseAvailability');

    await expect(service.getBatchAvailability({ productIds: ['product-1', 'missing-product'] }))
      .rejects.toThrow(BadRequestException);
    expect(warehouseSpy).not.toHaveBeenCalled();
  });

  it('calls warehouse once for multiple valid products and adds catalog SKU identity', async () => {
    const productsService = {
      findIdentitiesByIds: jest.fn(async () => [
        { id: 'product-1', sku: 'SKU-001' },
        { id: 'product-2', sku: 'SKU-002' },
      ]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    const warehouseSpy = jest.spyOn(service as any, 'fetchWarehouseAvailability').mockResolvedValue([
      {
        productId: 'product-1',
        totalQuantity: 8,
        totalReserved: 3,
        totalAvailable: 5,
        logistics: expect.objectContaining({ preferredRoute: 'local_fulfillment' }),
        warehouses: [{
          warehouseId: 'warehouse-1',
          warehouseCode: 'OWN-PRG',
          warehouseName: 'Prague Main Warehouse',
          warehouseType: 'own',
          supplierId: null,
          quantity: 8,
          reserved: 3,
          available: 5,
        }],
      },
      {
        productId: 'product-2',
        totalQuantity: 0,
        totalReserved: 0,
        totalAvailable: 0,
        warehouses: [],
      },
    ]);
    jest.spyOn(service as any, 'fetchWarehouseLogistics').mockResolvedValue([
      {
        productId: 'product-1',
        generatedAt: '2026-06-13T00:00:00.000Z',
        preferredRoute: 'local_fulfillment',
        totals: { totalQuantity: 8, totalReserved: 3, totalAvailable: 5, routeCount: 1, ownAvailable: 5, supplierAvailable: 0, dropshipAvailable: 0 },
        options: [{
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          warehouseCode: 'OWN-PRG',
          warehouseName: 'Prague Main Warehouse',
          warehouseType: 'own',
          originType: 'own',
          supplierId: null,
          priority: 20,
          quantity: 8,
          reserved: 3,
          available: 5,
          routeType: 'local_fulfillment',
          routeLabel: 'Ship from Alfares warehouse to customer',
          canReserveFromWarehouse: true,
          requiresSupplierCoordination: false,
          legs: [{ sequence: 1, from: 'OWN-PRG', to: 'customer', responsibility: 'warehouse' }],
        }],
      },
    ]);

    const result = await service.getBatchAvailability({
      productIds: ['product-1', 'product-2'],
      warehouseIds: ['warehouse-1'],
    });

    expect(warehouseSpy).toHaveBeenCalledTimes(1);
    expect(warehouseSpy).toHaveBeenCalledWith(['product-1', 'product-2'], ['warehouse-1']);
    expect(result.items).toEqual([
      expect.objectContaining({
        productId: 'product-1',
        sku: 'SKU-001',
        source: 'warehouse',
        totalAvailable: 5,
        warehouses: [{
          warehouseId: 'warehouse-1',
          warehouseCode: 'OWN-PRG',
          warehouseName: 'Prague Main Warehouse',
          warehouseType: 'own',
          supplierId: null,
          quantity: 8,
          reserved: 3,
          available: 5,
        }],
      }),
      expect.objectContaining({ productId: 'product-2', sku: 'SKU-002', source: 'warehouse', totalAvailable: 0 }),
    ]);
  });

  it('preserves warehouse zero-row semantics for valid catalog products', async () => {
    const productsService = {
      findIdentitiesByIds: jest.fn(async () => [{ id: 'product-1', sku: 'SKU-001' }]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    jest.spyOn(service as any, 'fetchWarehouseAvailability').mockResolvedValue([]);
    jest.spyOn(service as any, 'fetchWarehouseLogistics').mockResolvedValue([]);

    const result = await service.getBatchAvailability({ productIds: ['product-1'] });

    expect(result.items[0]).toMatchObject({
      productId: 'product-1',
      sku: 'SKU-001',
      source: 'warehouse',
      totalQuantity: 0,
      totalReserved: 0,
      totalAvailable: 0,
      warehouses: [],
      logistics: null,
    });
  });

  it('rejects duplicate and empty IDs', async () => {
    const service = new WarehouseAvailabilityService({ findIdentitiesByIds: jest.fn() } as any, logger as any);

    await expect(service.getBatchAvailability({ productIds: ['product-1', 'product-1'] }))
      .rejects.toThrow(BadRequestException);
    await expect(service.getBatchAvailability({ productIds: [' '] }))
      .rejects.toThrow(BadRequestException);
  });

  it('maps warehouse auth and network failures to dependency errors without stock fabrication', async () => {
    const productsService = {
      findIdentitiesByIds: jest.fn(async () => [{ id: 'product-1', sku: 'SKU-001' }]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    jest.spyOn(service as any, 'fetchWarehouseAvailability')
      .mockRejectedValue(new ServiceUnavailableException('Warehouse availability dependency rejected catalog service credentials'));

    await expect(service.getBatchAvailability({ productIds: ['product-1'] }))
      .rejects.toThrow(ServiceUnavailableException);
  });

  it('classifies local, supplier, mixed, and missing warehouse coverage', async () => {
    const productsService = {
      findIdentitiesByIds: jest.fn(async () => [
        { id: 'product-local', sku: 'SKU-LOCAL' },
        { id: 'product-supplier', sku: 'SKU-SUP' },
        { id: 'product-mixed', sku: 'SKU-MIX' },
        { id: 'product-missing', sku: 'SKU-MISS' },
      ]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    jest.spyOn(service as any, 'fetchWarehouseAvailability').mockResolvedValue([
      {
        productId: 'product-local',
        totalQuantity: 3,
        totalReserved: 0,
        totalAvailable: 3,
        warehouses: [{ warehouseId: 'own-1', warehouseCode: 'OWN', warehouseName: 'Own', warehouseType: 'own', supplierId: null, quantity: 3, reserved: 0, available: 3 }],
      },
      {
        productId: 'product-supplier',
        totalQuantity: 5,
        totalReserved: 1,
        totalAvailable: 4,
        warehouses: [{ warehouseId: 'sup-1', warehouseCode: 'SUP', warehouseName: 'Supplier', warehouseType: 'supplier', supplierId: 'supplier-1', quantity: 5, reserved: 1, available: 4 }],
      },
      {
        productId: 'product-mixed',
        totalQuantity: 10,
        totalReserved: 2,
        totalAvailable: 8,
        warehouses: [
          { warehouseId: 'own-1', warehouseCode: 'OWN', warehouseName: 'Own', warehouseType: 'own', supplierId: null, quantity: 4, reserved: 1, available: 3 },
          { warehouseId: 'drop-1', warehouseCode: 'DROP', warehouseName: 'Dropship', warehouseType: 'dropship', supplierId: 'supplier-2', quantity: 6, reserved: 1, available: 5 },
        ],
      },
    ]);
    jest.spyOn(service as any, 'fetchWarehouseLogistics').mockResolvedValue([
      { productId: 'product-local', generatedAt: '2026-06-13T00:00:00.000Z', preferredRoute: 'local_fulfillment', totals: { totalQuantity: 3, totalReserved: 0, totalAvailable: 3, routeCount: 1, ownAvailable: 3, supplierAvailable: 0, dropshipAvailable: 0 }, options: [{ productId: 'product-local', warehouseId: 'own-1', warehouseCode: 'OWN', warehouseName: 'Own', warehouseType: 'own', originType: 'own', supplierId: null, priority: 10, quantity: 3, reserved: 0, available: 3, routeType: 'local_fulfillment', routeLabel: 'Local', canReserveFromWarehouse: true, requiresSupplierCoordination: false, legs: [] }] },
      { productId: 'product-supplier', generatedAt: '2026-06-13T00:00:00.000Z', preferredRoute: 'supplier_replenishment', totals: { totalQuantity: 5, totalReserved: 1, totalAvailable: 4, routeCount: 1, ownAvailable: 0, supplierAvailable: 4, dropshipAvailable: 0 }, options: [{ productId: 'product-supplier', warehouseId: 'sup-1', warehouseCode: 'SUP', warehouseName: 'Supplier', warehouseType: 'supplier', originType: 'supplier', supplierId: 'supplier-1', priority: 5, quantity: 5, reserved: 1, available: 4, routeType: 'supplier_replenishment', routeLabel: 'Supplier', canReserveFromWarehouse: true, requiresSupplierCoordination: true, legs: [] }] },
      { productId: 'product-mixed', generatedAt: '2026-06-13T00:00:00.000Z', preferredRoute: 'local_fulfillment', totals: { totalQuantity: 10, totalReserved: 2, totalAvailable: 8, routeCount: 2, ownAvailable: 3, supplierAvailable: 0, dropshipAvailable: 5 }, options: [
        { productId: 'product-mixed', warehouseId: 'own-1', warehouseCode: 'OWN', warehouseName: 'Own', warehouseType: 'own', originType: 'own', supplierId: null, priority: 10, quantity: 4, reserved: 1, available: 3, routeType: 'local_fulfillment', routeLabel: 'Local', canReserveFromWarehouse: true, requiresSupplierCoordination: false, legs: [] },
        { productId: 'product-mixed', warehouseId: 'drop-1', warehouseCode: 'DROP', warehouseName: 'Dropship', warehouseType: 'dropship', originType: 'dropship', supplierId: 'supplier-2', priority: 3, quantity: 6, reserved: 1, available: 5, routeType: 'supplier_dropship', routeLabel: 'Dropship', canReserveFromWarehouse: true, requiresSupplierCoordination: true, legs: [] },
      ] },
    ]);

    const result = await service.getBatchCoverage({ productIds: ['product-local', 'product-supplier', 'product-mixed', 'product-missing'] });

    expect(result.totals).toMatchObject({
      totalProducts: 4,
      coveredProducts: 3,
      missingCoverageProducts: 1,
      localStockProducts: 1,
      supplierStockProducts: 1,
      mixedStockProducts: 1,
      outOfStockProducts: 1,
    });
    expect(result.items).toEqual([
      expect.objectContaining({ productId: 'product-local', coverageStatus: 'covered', stockOrigin: 'local_stock', sellableWithWarehouse: true, localAvailable: 3 }),
      expect.objectContaining({ productId: 'product-supplier', coverageStatus: 'covered', stockOrigin: 'supplier_stock', sellableWithWarehouse: true, supplierAvailable: 4, preferredRoute: 'supplier_replenishment' }),
      expect.objectContaining({ productId: 'product-mixed', coverageStatus: 'covered', stockOrigin: 'mixed_stock', sellableWithWarehouse: true, dropshipAvailable: 5, preferredRoute: 'local_fulfillment' }),
      expect.objectContaining({ productId: 'product-missing', coverageStatus: 'missing_stock', stockOrigin: 'out_of_stock', sellableWithWarehouse: false, blockingReasons: ['warehouse_stock_missing'] }),
    ]);
  });

  it('blocks coverage when stock exists without a reservable logistics route', async () => {
    const productsService = {
      findIdentitiesByIds: jest.fn(async () => [{ id: 'product-1', sku: 'SKU-001' }]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    jest.spyOn(service as any, 'fetchWarehouseAvailability').mockResolvedValue([
      {
        productId: 'product-1',
        totalQuantity: 2,
        totalReserved: 0,
        totalAvailable: 2,
        warehouses: [{ warehouseId: 'warehouse-1', warehouseCode: 'UNK', warehouseName: 'Unknown', warehouseType: 'other', supplierId: null, quantity: 2, reserved: 0, available: 2 }],
      },
    ]);
    jest.spyOn(service as any, 'fetchWarehouseLogistics').mockResolvedValue([
      {
        productId: 'product-1',
        generatedAt: '2026-06-13T00:00:00.000Z',
        preferredRoute: 'unclassified',
        totals: { totalQuantity: 2, totalReserved: 0, totalAvailable: 2, routeCount: 1, ownAvailable: 0, supplierAvailable: 0, dropshipAvailable: 0 },
        options: [{ productId: 'product-1', warehouseId: 'warehouse-1', warehouseCode: 'UNK', warehouseName: 'Unknown', warehouseType: 'other', originType: 'other', supplierId: null, priority: 0, quantity: 2, reserved: 0, available: 2, routeType: 'unclassified', routeLabel: 'Review', canReserveFromWarehouse: false, requiresSupplierCoordination: false, legs: [] }],
      },
    ]);

    const result = await service.getBatchCoverage({ productIds: ['product-1'] });

    expect(result.items[0]).toMatchObject({
      coverageStatus: 'missing_route',
      sellableWithWarehouse: false,
      blockingReasons: ['warehouse_logistics_route_missing'],
      preferredRoute: 'unclassified',
    });
  });

  it('audits active catalog products for mandatory Warehouse coverage', async () => {
    const productsService = {
      findAll: jest.fn(async () => ({
        items: [
          { id: 'product-covered', sku: 'SKU-COVERED' },
          { id: 'product-missing', sku: 'SKU-MISSING' },
        ],
        total: 12,
        page: 2,
        limit: 2,
      })),
      findIdentitiesByIds: jest.fn(async () => [
        { id: 'product-covered', sku: 'SKU-COVERED' },
        { id: 'product-missing', sku: 'SKU-MISSING' },
      ]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    jest.spyOn(service as any, 'fetchWarehouseAvailability').mockResolvedValue([
      {
        productId: 'product-covered',
        totalQuantity: 6,
        totalReserved: 1,
        totalAvailable: 5,
        warehouses: [{ warehouseId: 'own-1', warehouseCode: 'OWN', warehouseName: 'Own', warehouseType: 'own', supplierId: null, quantity: 6, reserved: 1, available: 5 }],
      },
    ]);
    jest.spyOn(service as any, 'fetchWarehouseLogistics').mockResolvedValue([
      {
        productId: 'product-covered',
        generatedAt: '2026-06-13T00:00:00.000Z',
        preferredRoute: 'local_fulfillment',
        totals: { totalQuantity: 6, totalReserved: 1, totalAvailable: 5, routeCount: 1, ownAvailable: 5, supplierAvailable: 0, dropshipAvailable: 0 },
        options: [{ productId: 'product-covered', warehouseId: 'own-1', warehouseCode: 'OWN', warehouseName: 'Own', warehouseType: 'own', originType: 'own', supplierId: null, priority: 10, quantity: 6, reserved: 1, available: 5, routeType: 'local_fulfillment', routeLabel: 'Local', canReserveFromWarehouse: true, requiresSupplierCoordination: false, legs: [] }],
      },
    ]);

    const result = await service.getCoverageAudit({ page: 2, limit: 2, warehouseIds: ['own-1'] });

    expect(productsService.findAll).toHaveBeenCalledWith({
      page: 2,
      limit: 2,
      search: undefined,
      isActive: true,
      lifecycle: undefined,
      categoryId: undefined,
    });
    expect(result.pagination).toEqual({ total: 12, page: 2, limit: 2, pages: 6 });
    expect(result.catalogQuery).toEqual({ page: 2, limit: 2, isActive: true, warehouseIds: ['own-1'] });
    expect(result.totals).toMatchObject({ totalProducts: 2, coveredProducts: 1, missingCoverageProducts: 1 });
    expect(result.items).toEqual([
      expect.objectContaining({ productId: 'product-covered', coverageStatus: 'covered', stockOrigin: 'local_stock' }),
      expect.objectContaining({ productId: 'product-missing', coverageStatus: 'missing_stock', stockOrigin: 'out_of_stock' }),
    ]);
  });

  it('returns an empty coverage audit page without calling Warehouse for empty Catalog pages', async () => {
    const productsService = {
      findAll: jest.fn(async () => ({ items: [], total: 0, page: 1, limit: 20 })),
      findIdentitiesByIds: jest.fn(),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    const warehouseSpy = jest.spyOn(service as any, 'fetchWarehouseAvailability');

    const result = await service.getCoverageAudit({});

    expect(warehouseSpy).not.toHaveBeenCalled();
    expect(result.pagination).toEqual({ total: 0, page: 1, limit: 20, pages: 0 });
    expect(result.totals).toMatchObject({ totalProducts: 0, coveredProducts: 0, missingCoverageProducts: 0 });
    expect(result.items).toEqual([]);
  });


  it('audits inactive catalog products when requested and normalizes comma warehouse filters', async () => {
    const productsService = {
      findAll: jest.fn(async () => ({
        items: [{ id: 'product-inactive', sku: 'SKU-INACTIVE' }],
        total: 1,
        page: 1,
        limit: 20,
      })),
      findIdentitiesByIds: jest.fn(async () => [{ id: 'product-inactive', sku: 'SKU-INACTIVE' }]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    const availabilitySpy = jest.spyOn(service as any, 'fetchWarehouseAvailability').mockResolvedValue([]);
    jest.spyOn(service as any, 'fetchWarehouseLogistics').mockResolvedValue([]);

    const result = await service.getCoverageAudit({ isActive: 'false' as any, warehouseIds: 'own-1,sup-1' as any });

    expect(productsService.findAll).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    expect(availabilitySpy).toHaveBeenCalledWith(['product-inactive'], ['own-1', 'sup-1']);
    expect(result.catalogQuery).toEqual({ page: 1, limit: 20, isActive: false, warehouseIds: ['own-1', 'sup-1'] });
  });

});
