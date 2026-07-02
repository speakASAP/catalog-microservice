import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogAuthGuard, type CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';
import { LoggerService } from '../logger/logger.service';
import { ProductRelationQueryDto, UpsertProductRelationDto } from './product-relations.dto';
import { ProductRelationsService } from './product-relations.service';

const PRODUCT_RELATION_ADMIN_ROLES = [
  'global:superadmin',
  'global:platform_admin',
  'app:catalog-microservice:admin',
  'internal:catalog-microservice:admin',
];

@Controller('products/:productId/related')
@UseGuards(CatalogAuthGuard)
export class ProductRelationsController {
  constructor(
    private readonly productRelationsService: ProductRelationsService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  @RequireCatalogRoles('catalog:authenticated')
  async findRelated(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ProductRelationQueryDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${productId}/related`, 'ProductRelationsController');
    const relations = await this.productRelationsService.findRelated(productId, {
      relationType: query.relationType,
      scope: { actor: request.catalogActor },
    });
    return { success: true, data: relations };
  }

  @Put(':targetProductId')
  @RequireCatalogRoles(...PRODUCT_RELATION_ADMIN_ROLES)
  async upsert(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('targetProductId', ParseUUIDPipe) targetProductId: string,
    @Body() data: UpsertProductRelationDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(
      `PUT /api/products/${productId}/related/${targetProductId}`,
      'ProductRelationsController',
    );
    const relation = await this.productRelationsService.upsertRelation(productId, targetProductId, data, {
      actor: request.catalogActor,
    });

    this.logger.auditCatalogWrite(request, {
      action: 'upsert',
      resourceType: 'product_relation',
      resourceId: relation.id,
      metadata: {
        sourceProductId: relation.sourceProductId,
        targetProductId: relation.targetProductId,
        relationType: relation.relationType,
        source: relation.source,
        score: relation.score,
        confidence: relation.confidence,
      },
    });

    return { success: true, data: relation };
  }
}
