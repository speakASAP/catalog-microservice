import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ProductRelationQueryDto {
  @IsOptional()
  @IsString()
  relationType?: string;
}

export class UpsertProductRelationDto {
  @IsString()
  relationType: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  score: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}


export class UpsertOrderAffinityBatchItemDto {
  @IsString()
  sourceProductId: string;

  @IsString()
  targetProductId: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  score: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}

export class UpsertOrderAffinityBatchDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  generatedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertOrderAffinityBatchItemDto)
  items: UpsertOrderAffinityBatchItemDto[];
}
