import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

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
