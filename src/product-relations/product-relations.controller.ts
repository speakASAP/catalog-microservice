import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogAuthGuard, type CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';
import { LoggerService } from '../logger/logger.service';
import { ProductBundleCandidateQueryDto, ProductRelationQueryDto, ReplaceOrderAffinityWindowDto, UpsertOrderAffinityBatchDto, UpsertProductRelationDto } from './product-relations.dto';
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

@Controller('products/:productId/bundle-candidates')
@UseGuards(CatalogAuthGuard)
export class ProductBundleCandidatesController {
  constructor(
    private readonly productRelationsService: ProductRelationsService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  @RequireCatalogRoles('catalog:authenticated')
  async findBundleCandidates(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ProductBundleCandidateQueryDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${productId}/bundle-candidates`, 'ProductBundleCandidatesController');
    const result = await this.productRelationsService.findBundleCandidates(productId, {
      limit: query.limit,
      freeShippingThreshold: query.freeShippingThreshold,
      currency: query.currency,
      scope: { actor: request.catalogActor },
    });
    return { success: true, data: result };
  }
}


@Controller('internal/product-relations/order-affinity')
@UseGuards(CatalogAuthGuard)
export class InternalOrderAffinityRelationsController {
  constructor(
    private readonly productRelationsService: ProductRelationsService,
    private readonly logger: LoggerService,
  ) {}

  @Post('replace-window')
  @RequireCatalogRoles(...PRODUCT_RELATION_ADMIN_ROLES)
  async replaceWindow(
    @Body() data: ReplaceOrderAffinityWindowDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(
      'POST /api/internal/product-relations/order-affinity/replace-window',
      'InternalOrderAffinityRelationsController',
    );
    const result = await this.productRelationsService.replaceOrderAffinityWindow(data, {
      actor: request.catalogActor,
    });

    this.logger.auditCatalogWrite(request, {
      action: 'replace_window',
      resourceType: 'product_relation',
      resourceId: result.idempotencyKey ?? result.window.runId,
      metadata: {
        source: result.source,
        idempotencyKey: result.idempotencyKey,
        generatedAt: result.generatedAt,
        sourceOwner: result.window.sourceOwner,
        channel: result.window.channel,
        windowStart: result.window.windowStart,
        windowEnd: result.window.windowEnd,
        runId: result.window.runId,
        total: result.summary.total,
        upserted: result.summary.upserted,
        updated: result.summary.updated,
        failed: result.summary.failed,
        pruned: result.summary.pruned,
      },
    });

    return { success: true, data: result };
  }

  @Post('batch')
  @RequireCatalogRoles(...PRODUCT_RELATION_ADMIN_ROLES)
  async upsertBatch(
    @Body() data: UpsertOrderAffinityBatchDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(
      'POST /api/internal/product-relations/order-affinity/batch',
      'InternalOrderAffinityRelationsController',
    );
    const result = await this.productRelationsService.upsertOrderAffinityBatch(data, {
      actor: request.catalogActor,
    });

    this.logger.auditCatalogWrite(request, {
      action: 'batch_upsert',
      resourceType: 'product_relation',
      resourceId: result.idempotencyKey ?? 'marketing_order_affinity_batch',
      metadata: {
        source: result.source,
        idempotencyKey: result.idempotencyKey,
        generatedAt: result.generatedAt,
        total: result.summary.total,
        upserted: result.summary.upserted,
        updated: result.summary.updated,
        failed: result.summary.failed,
      },
    });

    return { success: true, data: result };
  }
}
