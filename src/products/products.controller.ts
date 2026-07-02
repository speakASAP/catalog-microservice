import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  Headers,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductQualityReviewActivateDto,
  ProductQualityReviewExportQueryDto,
  ProductQualityReviewQueryDto,
  type ProductCatalogScope,
  type ProductCatalogSource,
} from './dto';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';

/**
 * Products Controller - API endpoints for product management
 * Single source of truth for all product data
 */
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly logger: LoggerService,
  ) {}

  private productScope(request?: CatalogAuthenticatedRequest, catalogScope?: ProductCatalogScope, catalogSources?: ProductCatalogSource[]) {
    return { actor: request?.catalogActor, catalogScope, catalogSources };
  }

  /**
   * Create a new product
   * POST /api/products
   */
  @Post()
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log('POST /api/products', 'ProductsController');
    const product = await this.productsService.create(createProductDto, this.productScope(request));
    this.logger.auditCatalogWrite(request, {
      action: 'create',
      resourceType: 'product',
      resourceId: product.id,
      metadata: { sku: product.sku },
    });
    return { success: true, data: product };
  }

  /**
   * Get all products with pagination and filters
   * GET /api/products
   */
  @Get()
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async findAll(
    @Query() query: ProductQueryDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products with query: ${JSON.stringify(query)}`, 'ProductsController');
    const result = await this.productsService.findAll(query, this.productScope(request, query.catalogScope, query.catalogSources));
    return {
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get a product by SKU
   * GET /api/products/sku/:sku
   */
  @Get('sku/:sku')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async findBySku(
    @Param('sku') sku: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/sku/${sku}`, 'ProductsController');
    const product = await this.productsService.findBySku(sku, this.productScope(request));
    if (!product) {
      return { success: false, data: null, message: 'Product not found' };
    }
    return { success: true, data: product };
  }


  /**
   * Get product identifier and quality audit summary
   * GET /api/products/audits/quality
   */
  @Get("audits/quality")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async qualityAudit(@Req() request: CatalogAuthenticatedRequest) {
    this.logger.log("GET /api/products/audits/quality", "ProductsController");
    const audit = await this.productsService.getQualityAudit(this.productScope(request));
    return { success: true, data: audit };
  }

  /**
   * Get product quality review queue
   * GET /api/products/review/quality
   */
  @Get("review/quality")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async qualityReview(
    @Query() query: ProductQualityReviewQueryDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log("GET /api/products/review/quality", "ProductsController");
    const result = await this.productsService.getProductQualityReview(query, this.productScope(request, query.catalogScope, query.catalogSources));
    return {
      success: true,
      data: result.items,
      policyId: result.policyId,
      blockers: result.blockers,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Export product quality review report
   * GET /api/products/review/quality/export
   */
  @Get("review/quality/export")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async qualityReviewExport(
    @Query() query: ProductQualityReviewExportQueryDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log("GET /api/products/review/quality/export", "ProductsController");
    const report = await this.productsService.exportProductQualityReview(query, this.productScope(request, query.catalogScope, query.catalogSources));
    return { success: true, data: report };
  }

  /**
   * Activate products after product quality review
   * POST /api/products/review/activate
   */
  @Post("review/activate")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async activateAfterQualityReview(
    @Body() data: ProductQualityReviewActivateDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log("POST /api/products/review/activate", "ProductsController");
    const result = await this.productsService.activateProductsAfterQualityReview(data, this.productScope(request));
    this.logger.auditCatalogWrite(request, {
      action: 'product_quality_review_activate',
      resourceType: 'product_group',
      resourceId: 'product-quality-review-activate',
      metadata: {
        productCount: result.requestedProductIds.length,
        activated: result.totals.activated,
        blocked: result.totals.blocked,
      },
    });
    return { success: result.success, data: result };
  }

  /**
   * Get Bazos account status for the current Catalog user
   * GET /api/products/bazos/account-status
   */
  @Get("bazos/account-status")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getBazosAccountStatus(
    @Headers("authorization") authorization?: string,
  ) {
    this.logger.log("GET /api/products/bazos/account-status", "ProductsController");
    const status = await this.productsService.getBazosAccountStatus(authorization);
    return { success: true, data: status };
  }

  /**
   * Get Aukro account status for the current Catalog user
   * GET /api/products/aukro/account-status
   */
  @Get("aukro/account-status")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getAukroAccountStatus(
    @Headers("authorization") authorization?: string,
  ) {
    this.logger.log("GET /api/products/aukro/account-status", "ProductsController");
    const status = await this.productsService.getAukroAccountStatus(authorization);
    return { success: true, data: status };
  }

  /**
   * Publish selected products through marketplace-owned publication workflows
   * POST /api/products/publications/bulk
   */
  @Post("publications/bulk")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async bulkMarketplacePublication(
    @Body() data: { productIds?: string[]; marketplaces?: string[]; options?: Record<string, any> },
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/publications/bulk`, "ProductsController");
    const result = await this.productsService.publishProductsToMarketplaces({
      productIds: Array.isArray(data?.productIds) ? data.productIds : [],
      marketplaces: Array.isArray(data?.marketplaces) ? data.marketplaces as any : [],
      options: data?.options || {},
    }, authorization, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'bulk_marketplace_publication',
        resourceType: 'product_group',
        resourceId: 'bulk-publication',
        metadata: {
          productCount: result.requestedProductIds.length,
          marketplaces: result.marketplaces.join(','),
          requested: result.totals.requested,
          succeeded: result.totals.succeeded,
          blocked: result.totals.blocked,
        },
      });
    }
    return { success: result.success, data: result };
  }


  /**
   * Get readiness diagnostics for a product
   * GET /api/products/:id/readiness
   */
  @Get(":id/readiness")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async readiness(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log("GET /api/products/" + id + "/readiness", "ProductsController");
    const readiness = await this.productsService.getReadiness(id, this.productScope(request));
    return { success: true, data: readiness };
  }

  @Get(":id/bazos-status")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getBazosStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${id}/bazos-status`, "ProductsController");
    const result = await this.productsService.getBazosStatus(id, authorization, this.productScope(request));
    return { success: result.success !== false, data: result };
  }

  @Get(":id/aukro-status")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getAukroStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${id}/aukro-status`, "ProductsController");
    const result = await this.productsService.getAukroStatus(id, authorization, this.productScope(request));
    return { success: result.success !== false, data: result };
  }

  @Post(":id/aukro-draft")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async requestAukroDraft(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/aukro-draft`, "ProductsController");
    const result = await this.productsService.requestAukroDraft(id, data, authorization, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'request_aukro_draft',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Post(":id/sell-on-aukro")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async sellOnAukro(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/sell-on-aukro`, "ProductsController");
    return this.requestAukroDraft(id, data, authorization, request);
  }

  @Post(":id/sell-on-allegro")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async sellOnAllegro(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/sell-on-allegro`, "ProductsController");
    const result = await this.productsService.prepareAllegroSale(id, data, authorization, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'prepare_allegro_sale',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Get(":id/allegro-status")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getAllegroStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${id}/allegro-status`, "ProductsController");
    const result = await this.productsService.getAllegroStatus(id, authorization, this.productScope(request));
    return { success: result.success !== false, data: result };
  }

  @Put(":id/allegro-draft")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async updateAllegroDraft(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/products/${id}/allegro-draft`, "ProductsController");
    const result = await this.productsService.updateAllegroDraft(id, data, authorization, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'update_allegro_draft',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Post(":id/allegro-confirm")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async confirmAllegroPublish(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/allegro-confirm`, "ProductsController");
    const result = await this.productsService.confirmAllegroPublish(id, authorization, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'confirm_allegro_publish',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Get(":id/heureka-status")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getHeurekaStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("feedType") feedType = "heureka_cz",
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${id}/heureka-status`, "ProductsController");
    const result = await this.productsService.getHeurekaStatus(id, feedType, this.productScope(request));
    return { success: result.success !== false, data: result };
  }

  @Post(":id/sell-on-heureka")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async sellOnHeureka(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/sell-on-heureka`, "ProductsController");
    const result = await this.productsService.prepareHeurekaSale(id, data || {}, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'prepare_heureka_sale',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Get(":id/heureka-feed-snapshot")
  async getHeurekaFeedSnapshot(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("feedType") feedType = "heureka_cz",
  ) {
    this.logger.log(`GET /api/products/${id}/heureka-feed-snapshot`, "ProductsController");
    const snapshot = await this.productsService.getHeurekaFeedSnapshot(id, feedType);
    return { success: true, data: snapshot };
  }

  @Get(":id/flipflop-status")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getFlipFlopStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${id}/flipflop-status`, "ProductsController");
    const result = await this.productsService.getFlipFlopStatus(id, authorization, this.productScope(request));
    return { success: result.success !== false, data: result };
  }

  @Post(":id/sell-on-flipflop")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async sellOnFlipFlop(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/sell-on-flipflop`, "ProductsController");
    const result = await this.productsService.prepareFlipFlopSale(id, request?.headers.authorization, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'prepare_flipflop_sale',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Post(":id/bazos-draft")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async requestBazosDraft(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/bazos-draft`, "ProductsController");
    const result = await this.productsService.requestBazosDraft(id, data, authorization, this.productScope(request));
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'request_bazos_draft',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Post(":id/sell-on-bazos")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async sellOnBazos(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/sell-on-bazos`, "ProductsController");
    return this.requestBazosDraft(id, data, authorization, request);
  }


  /**
   * Get product marketplace sales statistics
   * GET /api/products/:id/sales-statistics
   */
  @Get(':id/sales-statistics')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getSalesStatistics(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${id}/sales-statistics`, 'ProductsController');
    const statistics = await this.productsService.getSalesStatistics(id, this.productScope(request));
    return { success: true, data: statistics };
  }

  /**
   * Get a single product by ID
   * GET /api/products/:id
   */
  @Get(':id')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`GET /api/products/${id}`, 'ProductsController');
    const product = await this.productsService.findOne(id, this.productScope(request));
    return { success: true, data: product };
  }

  /**
   * Update a product
   * PUT /api/products/:id
   */
  @Put(':id')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/products/${id}`, 'ProductsController');
    const product = await this.productsService.update(id, updateProductDto, this.productScope(request));
    this.logger.auditCatalogWrite(request, {
      action: 'update',
      resourceType: 'product',
      resourceId: id,
      metadata: { sku: product.sku },
    });
    return { success: true, data: product };
  }

  /**
   * Soft delete a product (set isActive = false)
   * DELETE /api/products/:id
   */
  @Delete(':id')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`DELETE /api/products/${id}`, 'ProductsController');
    await this.productsService.remove(id, this.productScope(request));
    this.logger.auditCatalogWrite(request, {
      action: 'soft_delete',
      resourceType: 'product',
      resourceId: id,
    });
  }

  /**
   * Hard delete a product
   * DELETE /api/products/:id/hard
   */
  @Delete(':id/hard')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('global:superadmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardRemove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-owner-approval') ownerApproval: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    if (ownerApproval !== 'explicit') {
      throw new ForbiddenException('Hard delete requires x-owner-approval: explicit');
    }

    this.logger.warn(`DELETE /api/products/${id}/hard with explicit owner approval`, 'ProductsController');
    await this.productsService.hardRemove(id, this.productScope(request));
    this.logger.auditCatalogWrite(request, {
      action: 'hard_delete',
      resourceType: 'product',
      resourceId: id,
      metadata: { ownerApproval },
    });
  }
}
