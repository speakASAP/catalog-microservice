import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { LoggerService } from '../logger/logger.service';

@Controller('categories')
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
  async create(@Body() data: Partial<Category>) {
    this.logger.log('POST /api/categories', 'CategoriesController');
    const category = await this.categoriesService.create(data);
    return { success: true, data: category };
  }

  /**
   * Update a category
   * PUT /api/categories/:id
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Partial<Category>,
  ) {
    this.logger.log(`PUT /api/categories/${id}`, 'CategoriesController');
    const category = await this.categoriesService.update(id, data);
    return { success: true, data: category };
  }

  /**
   * Delete a category
   * DELETE /api/categories/:id
   */
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`DELETE /api/categories/${id}`, 'CategoriesController');
    await this.categoriesService.remove(id);
    return { success: true };
  }
}

