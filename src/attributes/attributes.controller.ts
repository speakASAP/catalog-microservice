import { Controller, Get, Post, Put, Body, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { Attribute } from './attribute.entity';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';

@Controller('attributes')
@UseGuards(CatalogAuthGuard)
export class AttributesController {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  @RequireCatalogRoles('catalog:authenticated')
  async findAll() {
    this.logger.log('GET /api/attributes', 'AttributesController');
    const attributes = await this.attributesService.findAll();
    return { success: true, data: attributes };
  }

  @Get(':id')
  @RequireCatalogRoles('catalog:authenticated')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`GET /api/attributes/${id}`, 'AttributesController');
    const attribute = await this.attributesService.findOne(id);
    return { success: true, data: attribute };
  }

  @Post()
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async create(
    @Body() data: Partial<Attribute>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log('POST /api/attributes', 'AttributesController');
    const attribute = await this.attributesService.create(data);
    this.logger.auditCatalogWrite(request, {
      action: 'create',
      resourceType: 'attribute',
      resourceId: attribute.id,
      metadata: { name: attribute.name },
    });
    return { success: true, data: attribute };
  }

  @Put(':id')
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Partial<Attribute>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/attributes/${id}`, 'AttributesController');
    const attribute = await this.attributesService.update(id, data);
    this.logger.auditCatalogWrite(request, {
      action: 'update',
      resourceType: 'attribute',
      resourceId: id,
      metadata: { name: attribute.name },
    });
    return { success: true, data: attribute };
  }
}
