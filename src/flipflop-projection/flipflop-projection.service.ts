import { BadRequestException, Injectable } from "@nestjs/common";
import { ChannelReadinessService } from "../channel-readiness/channel-readiness.service";
import { PricingService } from "../pricing/pricing.service";
import type { ProductPricing } from "../pricing/product-pricing.entity";
import type { Product } from "../products/product.entity";
import { ProductsService } from "../products/products.service";
import type { ChannelWarehouseCoverageFacts } from "../channel-readiness/channel-readiness.types";
import { WarehouseAvailabilityService } from "../warehouse-availability/warehouse-availability.service";
import type { CatalogWarehouseAvailabilityItem } from "../warehouse-availability/warehouse-availability.types";
import type {
  FlipFlopCatalogProjectionResponse,
  FlipFlopProjectionItem,
  FlipFlopProjectionPrice,
  FlipFlopProjectionReadiness,
} from "./flipflop-projection.types";

@Injectable()
export class FlipFlopProjectionService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly pricingService: PricingService,
    private readonly warehouseAvailabilityService: WarehouseAvailabilityService,
    private readonly channelReadinessService: ChannelReadinessService,
  ) {}

  async getBatchProjection(input: {
    productIds: string[];
    includeUnavailable?: boolean;
  }): Promise<FlipFlopCatalogProjectionResponse> {
    const requestedProductIds = this.normalizeProductIds(input.productIds);
    const products = await this.productsService.findByIdsWithProjectionRelations(requestedProductIds);
    const productsById = new Map(products.map((product) => [product.id, product]));
    const invalidProductIds = requestedProductIds.filter((productId) => !productsById.has(productId));

    if (invalidProductIds.length > 0) {
      return { requestedProductIds, invalidProductIds, items: [] };
    }

    const availability = await this.warehouseAvailabilityService.getBatchAvailability({ productIds: requestedProductIds });
    const availabilityByProductId = new Map(availability.items.map((item) => [item.productId, item]));
    const items: FlipFlopProjectionItem[] = [];

    for (const productId of requestedProductIds) {
      const product = productsById.get(productId);
      if (!product) {
        continue;
      }

      const availabilityItem = availabilityByProductId.get(productId) ?? this.zeroAvailability(product);
      const [currentPrice, readinessResponse] = await Promise.all([
        this.pricingService.getCurrentPrice(productId),
        this.channelReadinessService.getProductReadiness(productId, {
          warehouseCoverage: this.toReadinessWarehouseCoverage(availabilityItem),
        }),
      ]);
      const flipflopReadiness = readinessResponse.channels.find((channel) => channel.channel === "flipflop");
      const readiness = this.toProjectionReadiness(flipflopReadiness);
      const item = this.toProjectionItem(product, currentPrice, availabilityItem, readiness);

      if (!input.includeUnavailable && (!readiness.ready || !this.hasSellableWarehouseAvailability(availabilityItem))) {
        continue;
      }

      items.push(item);
    }

    return { requestedProductIds, invalidProductIds: [], items };
  }

  private normalizeProductIds(productIds: string[]): string[] {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new BadRequestException("productIds must contain at least one ID");
    }

    const normalized = productIds.map((productId) => typeof productId === "string" ? productId.trim() : "");
    const emptyIndex = normalized.findIndex((productId) => !productId);
    if (emptyIndex >= 0) {
      throw new BadRequestException("productIds contains an empty ID");
    }

    const seen = new Set<string>();
    const duplicate = normalized.find((productId) => {
      if (seen.has(productId)) {
        return true;
      }
      seen.add(productId);
      return false;
    });
    if (duplicate) {
      throw new BadRequestException(`productIds contains duplicate ID: ${duplicate}`);
    }

    return normalized;
  }

  private toProjectionItem(
    product: Product,
    currentPrice: ProductPricing | null,
    availability: CatalogWarehouseAvailabilityItem,
    readiness: FlipFlopProjectionReadiness,
  ): FlipFlopProjectionItem {
    const media = [...(product.media ?? [])].sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }
      return Number(left.position ?? 0) - Number(right.position ?? 0);
    });
    const primaryImage = media.find((item) => item.isPrimary) ?? media[0];

    return {
      id: product.id,
      productId: product.id,
      sku: product.sku,
      name: product.title,
      title: product.title,
      description: product.description ?? null,
      brand: product.brand ?? null,
      manufacturer: product.manufacturer ?? null,
      lifecycle: product.lifecycle ?? (product.isActive === false ? "archived" : "active"),
      isActive: product.isActive !== false,
      categories: (product.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        path: category.path,
      })),
      media: media.map((item) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl ?? null,
        altText: item.altText ?? null,
        isPrimary: Boolean(item.isPrimary),
        position: Number(item.position ?? 0),
      })),
      mainImageUrl: primaryImage?.url ?? null,
      imageUrls: media.filter((item) => item.type === "image").map((item) => item.url),
      price: this.toProjectionPrice(currentPrice),
      availability: {
        source: "warehouse",
        totalQuantity: Number(availability.totalQuantity ?? 0),
        totalReserved: Number(availability.totalReserved ?? 0),
        totalAvailable: Number(availability.totalAvailable ?? 0),
        warehouses: Array.isArray(availability.warehouses) ? availability.warehouses : [],
        logistics: availability.logistics ?? null,
      },
      stockQuantity: Number(availability.totalAvailable ?? 0),
      readiness,
      seoData: product.seoData ? { ...product.seoData } : null,
      tags: Array.isArray(product.tags) ? product.tags : [],
      createdAt: this.toIsoString(product.createdAt),
      updatedAt: this.toIsoString(product.updatedAt),
    };
  }

  private hasSellableWarehouseAvailability(availability: CatalogWarehouseAvailabilityItem): boolean {
    const hasPositiveStock = Number(availability.totalAvailable ?? 0) > 0;
    const hasReservableRoute = this.hasTraceableReservableRoute(availability.logistics?.options);
    return hasPositiveStock && hasReservableRoute;
  }

  private hasTraceableReservableRoute(options: CatalogWarehouseAvailabilityItem['logistics']['options'] | undefined): boolean {
    return Boolean(options?.some((option) => Number(option.available ?? 0) > 0
      && option.canReserveFromWarehouse
      && Array.isArray(option.legs)
      && option.legs.length > 0));
  }

  private toReadinessWarehouseCoverage(availability: CatalogWarehouseAvailabilityItem): ChannelWarehouseCoverageFacts {
    const hasPositiveStock = Number(availability.totalAvailable ?? 0) > 0;
    const hasWarehouses = Array.isArray(availability.warehouses) && availability.warehouses.length > 0;
    const hasReservableRoute = this.hasTraceableReservableRoute(availability.logistics?.options);
    const blockingReasons: string[] = [];

    if (!hasPositiveStock || !hasWarehouses) {
      blockingReasons.push("warehouse_stock_missing");
    }
    if (hasPositiveStock && !hasReservableRoute) {
      blockingReasons.push("warehouse_logistics_route_missing");
    }

    const coverageStatus = blockingReasons.includes("warehouse_stock_missing")
      ? "missing_stock"
      : blockingReasons.includes("warehouse_logistics_route_missing")
        ? "missing_route"
        : "covered";

    return {
      sellableWithWarehouse: coverageStatus === "covered",
      coverageStatus,
      totalAvailable: Number(availability.totalAvailable ?? 0),
      routeCount: Number(availability.logistics?.options?.length ?? 0),
      stockOrigin: null,
      blockingReasons,
    };
  }

  private toProjectionPrice(price: ProductPricing | null): FlipFlopProjectionPrice | null {
    if (!price) {
      return null;
    }

    const basePrice = Number(price.basePrice);
    const salePrice = price.salePrice === null || price.salePrice === undefined ? null : Number(price.salePrice);

    return {
      amount: salePrice ?? basePrice,
      currency: price.currency,
      basePrice,
      salePrice,
      priceType: price.priceType,
      source: "catalog_pricing",
    };
  }

  private toProjectionReadiness(channel: any): FlipFlopProjectionReadiness {
    return {
      channel: "flipflop",
      ready: Boolean(channel?.ready),
      status: channel?.status ?? "blocked",
      missingFields: Array.isArray(channel?.missingFields) ? channel.missingFields : [],
      authority: channel?.authority ?? "flipflop",
    };
  }

  private zeroAvailability(product: Product): CatalogWarehouseAvailabilityItem {
    return {
      productId: product.id,
      sku: product.sku,
      source: "warehouse",
      totalQuantity: 0,
      totalReserved: 0,
      totalAvailable: 0,
      warehouses: [],
      logistics: null,
    };
  }

  private toIsoString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return new Date(value as string | number).toISOString();
  }
}
