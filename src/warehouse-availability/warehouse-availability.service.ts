import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ProductsService } from '../products/products.service';
import { LoggerService } from '../logger/logger.service';
import {
  BatchWarehouseAvailabilityRequestDto,
  CatalogWarehouseAvailabilityResponse,
  WarehouseAvailabilityRow,
  WarehouseProductLogisticsPlan,
} from './warehouse-availability.types';

@Injectable()
export class WarehouseAvailabilityService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly logger: LoggerService,
  ) {}

  async getBatchAvailability(
    request: BatchWarehouseAvailabilityRequestDto,
  ): Promise<CatalogWarehouseAvailabilityResponse> {
    const productIds = this.normalizeIds(request.productIds, 'productIds');
    const warehouseIds = request.warehouseIds
      ? this.normalizeIds(request.warehouseIds, 'warehouseIds')
      : undefined;

    const products = await this.productsService.findIdentitiesByIds(productIds);
    const productsById = new Map(products.map((product) => [product.id, product]));
    const invalidProductIds = productIds.filter((productId) => !productsById.has(productId));

    if (invalidProductIds.length > 0) {
      throw new BadRequestException({
        message: 'Unknown catalog product IDs',
        invalidProductIds,
      });
    }

    const [warehouseRows, logisticsPlans] = await Promise.all([
      this.fetchWarehouseAvailability(productIds, warehouseIds),
      this.fetchWarehouseLogistics(productIds),
    ]);
    const rowsByProductId = new Map<string, WarehouseAvailabilityRow>(warehouseRows.map((row) => [row.productId, row]));
    const logisticsByProductId = new Map<string, WarehouseProductLogisticsPlan>(logisticsPlans.map((plan) => [plan.productId, plan]));

    return {
      requestedProductIds: productIds,
      invalidProductIds: [],
      items: productIds.map((productId) => {
        const product = productsById.get(productId);
        const row = rowsByProductId.get(productId) ?? this.zeroAvailability(productId);
        return {
          productId,
          sku: product?.sku ?? '',
          source: 'warehouse',
          totalQuantity: Number(row.totalQuantity ?? 0),
          totalReserved: Number(row.totalReserved ?? 0),
          totalAvailable: Number(row.totalAvailable ?? 0),
          logistics: logisticsByProductId.get(productId) ?? null,
          warehouses: Array.isArray(row.warehouses) ? row.warehouses.map((warehouse) => ({
            warehouseId: warehouse.warehouseId,
            warehouseCode: warehouse.warehouseCode ?? null,
            warehouseName: warehouse.warehouseName ?? null,
            warehouseType: warehouse.warehouseType ?? null,
            supplierId: warehouse.supplierId ?? null,
            quantity: Number(warehouse.quantity ?? 0),
            reserved: Number(warehouse.reserved ?? 0),
            available: Number(warehouse.available ?? 0),
          })) : [],
        };
      }),
    };
  }

  private normalizeIds(values: string[] | undefined, field: string): string[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new BadRequestException(`${field} must contain at least one ID`);
    }

    const normalized = values.map((value) => typeof value === 'string' ? value.trim() : '');
    const emptyIndex = normalized.findIndex((value) => !value);
    if (emptyIndex >= 0) {
      throw new BadRequestException(`${field} contains an empty ID`);
    }

    const seen = new Set<string>();
    const duplicate = normalized.find((value) => {
      if (seen.has(value)) {
        return true;
      }
      seen.add(value);
      return false;
    });
    if (duplicate) {
      throw new BadRequestException(`${field} contains duplicate ID: ${duplicate}`);
    }

    return normalized;
  }

  private async fetchWarehouseAvailability(
    productIds: string[],
    warehouseIds?: string[],
  ): Promise<WarehouseAvailabilityRow[]> {
    const token = process.env.WAREHOUSE_SERVICE_TOKEN || process.env.WAREHOUSE_INTERNAL_SERVICE_TOKEN;
    if (!token) {
      throw new ServiceUnavailableException('Warehouse availability service token is not configured');
    }

    const baseUrl = (process.env.WAREHOUSE_SERVICE_URL || process.env.WAREHOUSE_BASE_URL || 'http://warehouse-microservice:3000').replace(/\/$/, '');

    try {
      const response = await axios.post(
        `${baseUrl}/api/stock/availability/batch`,
        { productIds, ...(warehouseIds ? { warehouseIds } : {}) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: Number(process.env.WAREHOUSE_AVAILABILITY_TIMEOUT_MS || 5000),
        },
      );

      const data = response.data?.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      this.logger.warn(`Warehouse availability request failed${status ? ` with status ${status}` : ''}`, 'WarehouseAvailabilityService');
      if (status === 401 || status === 403) {
        throw new ServiceUnavailableException('Warehouse availability dependency rejected catalog service credentials');
      }
      throw new ServiceUnavailableException('Warehouse availability dependency is unavailable');
    }
  }

  private async fetchWarehouseLogistics(productIds: string[]): Promise<WarehouseProductLogisticsPlan[]> {
    const token = process.env.WAREHOUSE_SERVICE_TOKEN || process.env.WAREHOUSE_INTERNAL_SERVICE_TOKEN;
    if (!token) {
      throw new ServiceUnavailableException('Warehouse logistics service token is not configured');
    }

    const baseUrl = (process.env.WAREHOUSE_SERVICE_URL || process.env.WAREHOUSE_BASE_URL || 'http://warehouse-microservice:3000').replace(/\/$/, '');

    try {
      const response = await axios.post(
        `${baseUrl}/api/warehouses/logistics/batch`,
        { productIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: Number(process.env.WAREHOUSE_AVAILABILITY_TIMEOUT_MS || 5000),
        },
      );

      const data = response.data?.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      this.logger.warn(`Warehouse logistics request failed${status ? ` with status ${status}` : ''}`, 'WarehouseAvailabilityService');
      if (status === 401 || status === 403) {
        throw new ServiceUnavailableException('Warehouse logistics dependency rejected catalog service credentials');
      }
      throw new ServiceUnavailableException('Warehouse logistics dependency is unavailable');
    }
  }

  private zeroAvailability(productId: string): WarehouseAvailabilityRow {
    return {
      productId,
      totalQuantity: 0,
      totalReserved: 0,
      totalAvailable: 0,
      warehouses: [],
    };
  }
}
