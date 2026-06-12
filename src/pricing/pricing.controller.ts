import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { ProductPricing } from './product-pricing.entity';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';

@Controller('pricing')
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly logger: LoggerService,
  ) {}

  @Get('product/:productId')
  async findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    this.logger.log(`GET /api/pricing/product/${productId}`, 'PricingController');
    const pricing = await this.pricingService.findByProduct(productId);
    return { success: true, data: pricing };
  }

  @Get('product/:productId/current')
  async getCurrentPrice(@Param('productId', ParseUUIDPipe) productId: string) {
    this.logger.log(`GET /api/pricing/product/${productId}/current`, 'PricingController');
    const pricing = await this.pricingService.getCurrentPrice(productId);
    return { success: true, data: pricing };
  }

  @Post()
  @UseGuards(CatalogAuthGuard)
  async create(
    @Body() data: Partial<ProductPricing>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log('POST /api/pricing', 'PricingController');
    const pricing = await this.pricingService.upsert(data);
    this.logger.auditCatalogWrite(request, {
      action: 'upsert',
      resourceType: 'pricing',
      resourceId: pricing.id,
      metadata: { productId: pricing.productId, currency: pricing.currency },
    });
    return { success: true, data: pricing };
  }

  @Put(':id')
  @UseGuards(CatalogAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Partial<ProductPricing>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/pricing/${id}`, 'PricingController');
    const pricing = await this.pricingService.update(id, data);
    this.logger.auditCatalogWrite(request, {
      action: 'update',
      resourceType: 'pricing',
      resourceId: id,
      metadata: { productId: pricing.productId, currency: pricing.currency },
    });
    return { success: true, data: pricing };
  }

  @Delete(':id')
  @UseGuards(CatalogAuthGuard)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`DELETE /api/pricing/${id}`, 'PricingController');
    await this.pricingService.remove(id);
    this.logger.auditCatalogWrite(request, {
      action: 'delete',
      resourceType: 'pricing',
      resourceId: id,
    });
    return { success: true };
  }
}
