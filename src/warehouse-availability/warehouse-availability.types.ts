import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, ArrayMaxSize, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import type { ProductLifecycle } from '../products/product.entity';

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


export class BatchWarehouseCoverageRequestDto extends BatchWarehouseAvailabilityRequestDto {}

export class WarehouseCoverageAuditRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['draft', 'active', 'archived', 'needs_review'])
  lifecycle?: ProductLifecycle;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  warehouseIds?: string[];
}

export type WarehouseCoverageStockOrigin = 'local_stock' | 'supplier_stock' | 'dropship_stock' | 'mixed_stock' | 'out_of_stock';

export type WarehouseCoverageStatus = 'covered' | 'missing_stock' | 'missing_route';

export type CatalogWarehouseCoverageItem = {
  productId: string;
  sku: string;
  source: 'warehouse';
  coverageStatus: WarehouseCoverageStatus;
  stockOrigin: WarehouseCoverageStockOrigin;
  sellableWithWarehouse: boolean;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  localAvailable: number;
  supplierAvailable: number;
  dropshipAvailable: number;
  warehouseCount: number;
  routeCount: number;
  preferredRoute: WarehouseLogisticsRouteType | null;
  blockingReasons: string[];
  warehouses: WarehouseAvailabilityWarehouse[];
  logistics: WarehouseProductLogisticsPlan | null;
};

export type CatalogWarehouseCoverageResponse = {
  generatedAt: string;
  requestedProductIds: string[];
  invalidProductIds: string[];
  totals: {
    totalProducts: number;
    coveredProducts: number;
    missingCoverageProducts: number;
    localStockProducts: number;
    supplierStockProducts: number;
    dropshipStockProducts: number;
    mixedStockProducts: number;
    outOfStockProducts: number;
  };
  items: CatalogWarehouseCoverageItem[];
};


export type CatalogWarehouseCoverageAuditResponse = CatalogWarehouseCoverageResponse & {
  catalogQuery: {
    page: number;
    limit: number;
    isActive: boolean | undefined;
    lifecycle?: ProductLifecycle;
    search?: string;
    categoryId?: string;
    warehouseIds?: string[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};
