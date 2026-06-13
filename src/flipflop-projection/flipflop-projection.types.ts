import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString } from "class-validator";
import type { ProductLifecycle } from "../products/product.entity";
import type { ChannelReadinessStatus } from "../channel-readiness/channel-readiness.types";

export class BatchFlipFlopProjectionRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds: string[];

  @IsOptional()
  @IsBoolean()
  includeUnavailable?: boolean;
}

export type FlipFlopProjectionPrice = {
  amount: number;
  currency: string;
  basePrice: number;
  salePrice: number | null;
  priceType: string;
  source: "catalog_pricing";
};

export type FlipFlopProjectionAvailability = {
  source: "warehouse";
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
};

export type FlipFlopProjectionReadiness = {
  channel: "flipflop";
  ready: boolean;
  status: ChannelReadinessStatus;
  missingFields: string[];
  authority: "flipflop" | string;
};

export type FlipFlopProjectionItem = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  title: string;
  description: string | null;
  brand: string | null;
  manufacturer: string | null;
  lifecycle: ProductLifecycle;
  isActive: boolean;
  categories: Array<{ id: string; name: string; slug?: string; path?: string }>;
  media: Array<{
    id: string;
    type: string;
    url: string;
    thumbnailUrl?: string | null;
    altText?: string | null;
    isPrimary: boolean;
    position: number;
  }>;
  mainImageUrl: string | null;
  imageUrls: string[];
  price: FlipFlopProjectionPrice | null;
  availability: FlipFlopProjectionAvailability;
  stockQuantity: number;
  readiness: FlipFlopProjectionReadiness;
  seoData: Record<string, unknown> | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type FlipFlopCatalogProjectionResponse = {
  requestedProductIds: string[];
  invalidProductIds: string[];
  items: FlipFlopProjectionItem[];
};
