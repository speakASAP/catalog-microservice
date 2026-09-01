import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';

@Controller('categories')
@UseGuards(CatalogAuthGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get category tree
   * GET /api/categories/tree
   */
  @Get('tree')
  @RequireCatalogRoles('catalog:authenticated')
  async getTree() {
    this.logger.log('GET /api/categories/tree', 'CategoriesController');
    const tree = await this.categoriesService.getTree();
    return { success: true, data: tree };
  }

  /**
   * Get all categories (flat)
   * GET /api/categories
   */
  @Get()
  @RequireCatalogRoles('catalog:authenticated')
  async findAll() {
    this.logger.log('GET /api/categories', 'CategoriesController');
    const categories = await this.categoriesService.findAll();
    return { success: true, data: categories };
  }

  /**
   * Get a single category
   * GET /api/categories/:id
   */
  @Get(':id')
  @RequireCatalogRoles('catalog:authenticated')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`GET /api/categories/${id}`, 'CategoriesController');
    const category = await this.categoriesService.findOne(id);
    return { success: true, data: category };
  }

  /**
   * Create a category
   * POST /api/categories
   */
  @Post()
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async create(
    @Body() data: Partial<Category>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log('POST /api/categories', 'CategoriesController');
    const category = await this.categoriesService.create(data);
    this.logger.auditCatalogWrite(request, {
      action: 'create',
      resourceType: 'category',
      resourceId: category.id,
      metadata: { name: category.name },
    });
    return { success: true, data: category };
  }

  /**
   * Update a category
   * PUT /api/categories/:id
   */
  @Put(':id')
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Partial<Category>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/categories/${id}`, 'CategoriesController');
    const category = await this.categoriesService.update(id, data);
    this.logger.auditCatalogWrite(request, {
      action: 'update',
      resourceType: 'category',
      resourceId: id,
      metadata: { name: category.name },
    });
    return { success: true, data: category };
  }

  /**
   * Delete a category
   * DELETE /api/categories/:id
   */
  @Delete(':id')
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`DELETE /api/categories/${id}`, 'CategoriesController');
    await this.categoriesService.remove(id);
    this.logger.auditCatalogWrite(request, {
      action: 'delete',
      resourceType: 'category',
      resourceId: id,
    });
    return { success: true };
  }
}
