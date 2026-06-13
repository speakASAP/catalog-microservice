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
        warehouses: [{ warehouseId: 'warehouse-1', quantity: 8, reserved: 3, available: 5 }],
      },
      {
        productId: 'product-2',
        totalQuantity: 0,
        totalReserved: 0,
        totalAvailable: 0,
        warehouses: [],
      },
    ]);

    const result = await service.getBatchAvailability({
      productIds: ['product-1', 'product-2'],
      warehouseIds: ['warehouse-1'],
    });

    expect(warehouseSpy).toHaveBeenCalledTimes(1);
    expect(warehouseSpy).toHaveBeenCalledWith(['product-1', 'product-2'], ['warehouse-1']);
    expect(result.items).toEqual([
      expect.objectContaining({ productId: 'product-1', sku: 'SKU-001', source: 'warehouse', totalAvailable: 5 }),
      expect.objectContaining({ productId: 'product-2', sku: 'SKU-002', source: 'warehouse', totalAvailable: 0 }),
    ]);
  });

  it('preserves warehouse zero-row semantics for valid catalog products', async () => {
    const productsService = {
      findIdentitiesByIds: jest.fn(async () => [{ id: 'product-1', sku: 'SKU-001' }]),
    };
    const service = new WarehouseAvailabilityService(productsService as any, logger as any);
    jest.spyOn(service as any, 'fetchWarehouseAvailability').mockResolvedValue([]);

    const result = await service.getBatchAvailability({ productIds: ['product-1'] });

    expect(result.items[0]).toMatchObject({
      productId: 'product-1',
      sku: 'SKU-001',
      source: 'warehouse',
      totalQuantity: 0,
      totalReserved: 0,
      totalAvailable: 0,
      warehouses: [],
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
});
