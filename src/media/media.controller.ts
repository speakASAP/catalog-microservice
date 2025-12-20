import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { MediaService } from './media.service';
import { Media } from './media.entity';
import { LoggerService } from '../logger/logger.service';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly logger: LoggerService,
  ) {}

  @Get('product/:productId')
  async findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    this.logger.log(`GET /api/media/product/${productId}`, 'MediaController');
    const media = await this.mediaService.findByProduct(productId);
    return { success: true, data: media };
  }

  @Post()
  async create(@Body() data: Partial<Media>) {
    this.logger.log('POST /api/media', 'MediaController');
    const media = await this.mediaService.create(data);
    return { success: true, data: media };
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() data: Partial<Media>) {
    this.logger.log(`PUT /api/media/${id}`, 'MediaController');
    const media = await this.mediaService.update(id, data);
    return { success: true, data: media };
  }

  @Put(':id/primary')
  async setPrimary(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`PUT /api/media/${id}/primary`, 'MediaController');
    const media = await this.mediaService.setPrimary(id);
    return { success: true, data: media };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`DELETE /api/media/${id}`, 'MediaController');
    await this.mediaService.remove(id);
    return { success: true };
  }
}

