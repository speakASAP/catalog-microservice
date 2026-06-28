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
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
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

  /**
   * Create a new product
   * POST /api/products
   */
  @Post()
  @UseGuards(CatalogAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log('POST /api/products', 'ProductsController');
    const product = await this.productsService.create(createProductDto);
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
  async findAll(@Query() query: ProductQueryDto) {
    this.logger.log(`GET /api/products with query: ${JSON.stringify(query)}`, 'ProductsController');
    const result = await this.productsService.findAll(query);
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
  async findBySku(@Param('sku') sku: string) {
    this.logger.log(`GET /api/products/sku/${sku}`, 'ProductsController');
    const product = await this.productsService.findBySku(sku);
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
  async qualityAudit() {
    this.logger.log("GET /api/products/audits/quality", "ProductsController");
    const audit = await this.productsService.getQualityAudit();
    return { success: true, data: audit };
  }

  /**
   * Get Bazos account status for the current Catalog user
   * GET /api/products/bazos/account-status
   */
  @Get("bazos/account-status")
  @UseGuards(CatalogAuthGuard)
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
  async getAukroAccountStatus(
    @Headers("authorization") authorization?: string,
  ) {
    this.logger.log("GET /api/products/aukro/account-status", "ProductsController");
    const status = await this.productsService.getAukroAccountStatus(authorization);
    return { success: true, data: status };
  }

  /**
   * Get readiness diagnostics for a product
   * GET /api/products/:id/readiness
   */
  @Get(":id/readiness")
  async readiness(@Param("id", ParseUUIDPipe) id: string) {
    this.logger.log("GET /api/products/" + id + "/readiness", "ProductsController");
    const readiness = await this.productsService.getReadiness(id);
    return { success: true, data: readiness };
  }

  @Get(":id/bazos-status")
  @UseGuards(CatalogAuthGuard)
  async getBazosStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
  ) {
    this.logger.log(`GET /api/products/${id}/bazos-status`, "ProductsController");
    const result = await this.productsService.getBazosStatus(id, authorization);
    return { success: result.success !== false, data: result };
  }

  @Get(":id/aukro-status")
  @UseGuards(CatalogAuthGuard)
  async getAukroStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
  ) {
    this.logger.log(`GET /api/products/${id}/aukro-status`, "ProductsController");
    const result = await this.productsService.getAukroStatus(id, authorization);
    return { success: result.success !== false, data: result };
  }

  @Post(":id/aukro-draft")
  @UseGuards(CatalogAuthGuard)
  async requestAukroDraft(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/aukro-draft`, "ProductsController");
    const result = await this.productsService.requestAukroDraft(id, data, authorization);
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
  async sellOnAllegro(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/sell-on-allegro`, "ProductsController");
    const result = await this.productsService.prepareAllegroSale(id, data, authorization);
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
  async getAllegroStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
  ) {
    this.logger.log(`GET /api/products/${id}/allegro-status`, "ProductsController");
    const result = await this.productsService.getAllegroStatus(id, authorization);
    return { success: result.success !== false, data: result };
  }

  @Put(":id/allegro-draft")
  @UseGuards(CatalogAuthGuard)
  async updateAllegroDraft(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/products/${id}/allegro-draft`, "ProductsController");
    const result = await this.productsService.updateAllegroDraft(id, data, authorization);
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
  async confirmAllegroPublish(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/allegro-confirm`, "ProductsController");
    const result = await this.productsService.confirmAllegroPublish(id, authorization);
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'confirm_allegro_publish',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
  }

  @Get(":id/flipflop-status")
  @UseGuards(CatalogAuthGuard)
  async getFlipFlopStatus(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    this.logger.log(`GET /api/products/${id}/flipflop-status`, "ProductsController");
    const result = await this.productsService.prepareFlipFlopSale(id);
    return { success: result.success !== false, data: result };
  }

  @Post(":id/sell-on-flipflop")
  @UseGuards(CatalogAuthGuard)
  async sellOnFlipFlop(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/sell-on-flipflop`, "ProductsController");
    const result = await this.productsService.prepareFlipFlopSale(id);
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
  async requestBazosDraft(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: any,
    @Headers("authorization") authorization?: string,
    @Req() request?: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/products/${id}/bazos-draft`, "ProductsController");
    const result = await this.productsService.requestBazosDraft(id, data, authorization);
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
  async getSalesStatistics(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`GET /api/products/${id}/sales-statistics`, 'ProductsController');
    const statistics = await this.productsService.getSalesStatistics(id);
    return { success: true, data: statistics };
  }

  /**
   * Get a single product by ID
   * GET /api/products/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`GET /api/products/${id}`, 'ProductsController');
    const product = await this.productsService.findOne(id);
    return { success: true, data: product };
  }

  /**
   * Update a product
   * PUT /api/products/:id
   */
  @Put(':id')
  @UseGuards(CatalogAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/products/${id}`, 'ProductsController');
    const product = await this.productsService.update(id, updateProductDto);
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`DELETE /api/products/${id}`, 'ProductsController');
    await this.productsService.remove(id);
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
    await this.productsService.hardRemove(id);
    this.logger.auditCatalogWrite(request, {
      action: 'hard_delete',
      resourceType: 'product',
      resourceId: id,
      metadata: { ownerApproval },
    });
  }
}
