import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, IsUUID, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
  @IsUUID()
  categoryId?: string;
}

