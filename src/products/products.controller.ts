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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import { LoggerService } from '../logger/logger.service';

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
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto) {
    this.logger.log('POST /api/products', 'ProductsController');
    const product = await this.productsService.create(createProductDto);
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
   * Update a product
   * PUT /api/products/:id
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    this.logger.log(`PUT /api/products/${id}`, 'ProductsController');
    const product = await this.productsService.update(id, updateProductDto);
    return { success: true, data: product };
  }

  /**
   * Soft delete a product (set isActive = false)
   * DELETE /api/products/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`DELETE /api/products/${id}`, 'ProductsController');
    await this.productsService.remove(id);
  }

  /**
   * Hard delete a product
   * DELETE /api/products/:id/hard
   */
  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardRemove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`DELETE /api/products/${id}/hard`, 'ProductsController');
    await this.productsService.hardRemove(id);
  }
}

