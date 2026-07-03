import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const SOURCES = ['manual', 'order_affinity', 'campaign'] as const;
const VISIBILITY_SCOPES = ['catalog_internal', 'storefront', 'channel'] as const;

export class BundleItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;
}

export class BundlePresentationDto {
  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsIn(['checkout_authoritative'])
  pricePolicy?: 'checkout_authoritative';

  @IsOptional()
  @IsString()
  discountPolicyRef?: string | null;

  @IsOptional()
  @IsString()
  freeShippingPolicyRef?: string | null;

  @IsOptional()
  @IsString()
  currencyHint?: string | null;
}

export class BundleVisibilityDto {
  @IsOptional()
  @IsIn(VISIBILITY_SCOPES)
  scope?: 'catalog_internal' | 'storefront' | 'channel';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;
}

export class CreateCatalogBundleDto {
  @IsString()
  contractVersion: string;

  @IsString()
  idempotencyKey: string;

  @IsIn(SOURCES)
  source: 'manual' | 'order_affinity' | 'campaign';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  items: BundleItemDto[];

  @ValidateNested()
  @Type(() => BundlePresentationDto)
  presentation: BundlePresentationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BundleVisibilityDto)
  visibility?: BundleVisibilityDto;

  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}

export class UpdateCatalogBundleDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BundlePresentationDto)
  presentation?: BundlePresentationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BundleVisibilityDto)
  visibility?: BundleVisibilityDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  items?: BundleItemDto[];

  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}

export class BundleListQueryDto {
  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @IsOptional()
  @IsIn(SOURCES)
  source?: 'manual' | 'order_affinity' | 'campaign';

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
