import { ArrayNotEmpty, IsArray, IsOptional, IsString, ArrayMaxSize } from 'class-validator';

export class BatchWarehouseAvailabilityRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  warehouseIds?: string[];
}

export type WarehouseAvailabilityWarehouse = {
  warehouseId: string;
  quantity: number;
  reserved: number;
  available: number;
};

export type WarehouseAvailabilityRow = {
  productId: string;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  warehouses: WarehouseAvailabilityWarehouse[];
};

export type CatalogWarehouseAvailabilityItem = WarehouseAvailabilityRow & {
  sku: string;
  source: 'warehouse';
};

export type CatalogWarehouseAvailabilityResponse = {
  requestedProductIds: string[];
  invalidProductIds: string[];
  items: CatalogWarehouseAvailabilityItem[];
};
