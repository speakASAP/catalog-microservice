import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './category.entity';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get full category tree
   */
  async getTree(): Promise<Category[]> {
    this.logger.log('Getting category tree', 'CategoriesService');

    // Get root categories with children
    const rootCategories = await this.categoryRepository.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });

    // Recursively load children
    for (const category of rootCategories) {
      await this.loadChildren(category);
    }

    return rootCategories;
  }

  /**
   * Recursively load children for a category
   */
  private async loadChildren(category: Category): Promise<void> {
    const children = await this.categoryRepository.find({
      where: { parentId: category.id, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    category.children = children;

    for (const child of children) {
      await this.loadChildren(child);
    }
  }

  /**
   * Find all categories (flat list)
   */
  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { path: 'ASC' },
    });
  }

  /**
   * Find one category by ID
   */
  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Create a new category
   */
  async create(data: Partial<Category>): Promise<Category> {
    this.logger.log(`Creating category: ${data.name}`, 'CategoriesService');

    const category = this.categoryRepository.create(data);

    // Calculate path and level
    if (data.parentId) {
      const parent = await this.findOne(data.parentId);
      category.path = `${parent.path}/${category.slug}`;
      category.level = parent.level + 1;
    } else {
      category.path = `/${category.slug}`;
      category.level = 0;
    }

    return this.categoryRepository.save(category);
  }

  /**
   * Update a category
   */
  async update(id: string, data: Partial<Category>): Promise<Category> {
    this.logger.log(`Updating category: ${id}`, 'CategoriesService');

    const category = await this.findOne(id);
    Object.assign(category, data);

    // Recalculate path if parent changed
    if (data.parentId !== undefined) {
      if (data.parentId) {
        const parent = await this.findOne(data.parentId);
        category.path = `${parent.path}/${category.slug}`;
        category.level = parent.level + 1;
      } else {
        category.path = `/${category.slug}`;
        category.level = 0;
      }
    }

    return this.categoryRepository.save(category);
  }

  /**
   * Delete a category
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing category: ${id}`, 'CategoriesService');

    const category = await this.findOne(id);
    category.isActive = false;
    await this.categoryRepository.save(category);
  }
}

