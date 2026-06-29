import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { LoggerService } from '../logger/logger.service';
import { MarketplaceFieldsService } from './marketplace-fields.service';

@Controller('products/:productId/marketplace-fields')
@UseGuards(CatalogAuthGuard)
export class MarketplaceFieldsController {
  constructor(
    private readonly marketplaceFieldsService: MarketplaceFieldsService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  async supportedMarketplaces() {
    return {
      success: true,
      data: this.marketplaceFieldsService.getSupportedMarketplaces(),
    };
  }

  @Get(':marketplace')
  async getMarketplaceFields(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('marketplace') marketplace: string,
  ) {
    const data = await this.marketplaceFieldsService.getProductMarketplaceFields(productId, marketplace);
    return { success: true, data };
  }

  @Put(':marketplace')
  async updateMarketplaceFields(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('marketplace') marketplace: string,
    @Body() body: any,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    const data = await this.marketplaceFieldsService.updateProductMarketplaceFields(productId, marketplace, body);
    this.logger.auditCatalogWrite(request, {
      action: 'update_marketplace_fields',
      resourceType: 'product',
      resourceId: productId,
      metadata: { marketplace },
    });
    return { success: true, data };
  }
}
