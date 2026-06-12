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
   * Get readiness diagnostics for a product
   * GET /api/products/:id/readiness
   */
  @Get(":id/readiness")
  async readiness(@Param("id", ParseUUIDPipe) id: string) {
    this.logger.log("GET /api/products/" + id + "/readiness", "ProductsController");
    const readiness = await this.productsService.getReadiness(id);
    return { success: true, data: readiness };
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
    const result = await this.productsService.sellOnBazos(id, data, authorization);
    if (request) {
      this.logger.auditCatalogWrite(request, {
        action: 'sell_on_bazos',
        resourceType: 'product',
        resourceId: id,
      });
    }
    return { success: result.success !== false, data: result };
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
