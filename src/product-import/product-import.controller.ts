import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, IsUrl } from 'class-validator';
import { ProductImportService } from './product-import.service';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';

export class ImportFromUrlDto {
  @IsString()
  @IsUrl({ require_protocol: true })
  url: string;
}

@Controller('products')
export class ProductImportController {
  constructor(
    private readonly productImportService: ProductImportService,
    private readonly logger: LoggerService,
  ) {}

  @Post('import-from-url')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  @HttpCode(HttpStatus.CREATED)
  async importFromUrl(
    @Body() body: ImportFromUrlDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/import-from-url url=${body.url}`, 'ProductImportController');
    const product = await this.productImportService.importFromUrl(body.url, {
      actor: request.catalogActor,
    });
    this.logger.auditCatalogWrite(request, {
      action: 'import_from_url',
      resourceType: 'product',
      resourceId: product.id,
      metadata: { sku: product.sku },
    });
    return { success: true, data: product };
  }
}
