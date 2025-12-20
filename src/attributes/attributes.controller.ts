import { Controller, Get, Post, Put, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { Attribute } from './attribute.entity';
import { LoggerService } from '../logger/logger.service';

@Controller('attributes')
export class AttributesController {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  async findAll() {
    this.logger.log('GET /api/attributes', 'AttributesController');
    const attributes = await this.attributesService.findAll();
    return { success: true, data: attributes };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`GET /api/attributes/${id}`, 'AttributesController');
    const attribute = await this.attributesService.findOne(id);
    return { success: true, data: attribute };
  }

  @Post()
  async create(@Body() data: Partial<Attribute>) {
    this.logger.log('POST /api/attributes', 'AttributesController');
    const attribute = await this.attributesService.create(data);
    return { success: true, data: attribute };
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() data: Partial<Attribute>) {
    this.logger.log(`PUT /api/attributes/${id}`, 'AttributesController');
    const attribute = await this.attributesService.update(id, data);
    return { success: true, data: attribute };
  }
}

