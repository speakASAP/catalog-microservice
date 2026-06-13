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
  warehouseCode?: string | null;
  warehouseName?: string | null;
  warehouseType?: string | null;
  supplierId?: string | null;
  quantity: number;
  reserved: number;
  available: number;
};

export type WarehouseLogisticsRouteType = 'local_fulfillment' | 'supplier_replenishment' | 'supplier_dropship' | 'unclassified';

export type WarehouseLogisticsLeg = {
  sequence: number;
  from: string;
  to: string;
  responsibility: 'warehouse' | 'supplier' | 'mixed';
};

export type WarehouseLogisticsOption = {
  productId: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  originType: string;
  supplierId: string | null;
  priority: number;
  quantity: number;
  reserved: number;
  available: number;
  routeType: WarehouseLogisticsRouteType;
  routeLabel: string;
  canReserveFromWarehouse: boolean;
  requiresSupplierCoordination: boolean;
  legs: WarehouseLogisticsLeg[];
};

export type WarehouseProductLogisticsPlan = {
  generatedAt: string;
  productId: string;
  totals: {
    totalQuantity: number;
    totalReserved: number;
    totalAvailable: number;
    routeCount: number;
    ownAvailable: number;
    supplierAvailable: number;
    dropshipAvailable: number;
  };
  preferredRoute: WarehouseLogisticsRouteType | null;
  options: WarehouseLogisticsOption[];
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
  logistics: WarehouseProductLogisticsPlan | null;
};

export type CatalogWarehouseAvailabilityResponse = {
  requestedProductIds: string[];
  invalidProductIds: string[];
  items: CatalogWarehouseAvailabilityItem[];
};
