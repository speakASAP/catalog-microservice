import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogAuthGuard, type CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';
import { Product } from '../products/product.entity';
import { BpcpProcessEventProjectionService } from './bpcp-process-event-projection.service';

@Controller('business-process/catalog')
export class BpcpDiscountEligibilityController {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    private readonly projection: BpcpProcessEventProjectionService,
  ) {}

  @Get('products/:productId/discount-eligibility')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getDiscountEligibilityFacts(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Query('processId') processId: string | undefined,
    @Req() _request: CatalogAuthenticatedRequest,
  ) {
    const product = await this.products.findOne({
      where: { id: productId },
      relations: ['categories'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      success: true,
      data: this.projection.discountEligibilityFacts({
        id: product.id,
        categoryIds: (product.categories ?? []).map((category) => category.id),
        tags: product.tags ?? [],
      }, processId || 'holiday-discount-2026'),
    };
  }
}
