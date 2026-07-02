import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, IsUUID, IsIn, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { ProductLifecycle } from "../product.entity";
import type { ProductContentDocument } from "../../content-connectors/content-document";

export type ProductCatalogScope = 'own' | 'effective' | 'alfares' | 'community' | 'all';
export type ProductCatalogSource = 'own' | 'alfares' | 'community';

/**
 * DTO for creating a new product
 */
export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  descriptionRich?: ProductContentDocument | null;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  ean?: string;

  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @IsObject()
  @IsOptional()
  dimensionsCm?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  resaleEnabled?: boolean;

  @IsIn(["draft", "active", "archived", "needs_review"])
  @IsOptional()
  lifecycle?: ProductLifecycle;

  @IsObject()
  @IsOptional()
  seoData?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    slug?: string;
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

/**
 * DTO for updating a product
 */
export class UpdateProductDto {
  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  descriptionRich?: ProductContentDocument | null;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  ean?: string;

  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @IsObject()
  @IsOptional()
  dimensionsCm?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  resaleEnabled?: boolean;

  @IsIn(["draft", "active", "archived", "needs_review"])
  @IsOptional()
  lifecycle?: ProductLifecycle;

  @IsObject()
  @IsOptional()
  seoData?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    slug?: string;
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

/**
 * DTO for querying products
 */
export class ProductQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;


  @IsOptional()
  @IsIn(["draft", "active", "archived", "needs_review"])
  lifecycle?: ProductLifecycle;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsIn(['own', 'effective', 'alfares', 'community', 'all'])
  catalogScope?: ProductCatalogScope;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.flatMap((item) => String(item).split(',')).map((item) => item.trim()).filter(Boolean);
    }
    return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  })
  @IsArray()
  @IsIn(['own', 'alfares', 'community'], { each: true })
  catalogSources?: ProductCatalogSource[];
}

export class ProductQualityReviewQueryDto extends ProductQueryDto {
  @IsOptional()
  @IsString()
  missingField?: string;

  @IsOptional()
  @IsIn(['blocking', 'optional'])
  severity?: 'blocking' | 'optional';
}

export class ProductQualityReviewExportQueryDto extends ProductQualityReviewQueryDto {
  @IsOptional()
  @IsIn(['json', 'csv', 'markdown'])
  format?: 'json' | 'csv' | 'markdown';
}

export class ProductQualityReviewActivateDto {
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsString()
  @IsOptional()
  humanReview?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
