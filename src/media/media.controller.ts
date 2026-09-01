import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { Media } from './media.entity';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import type { CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';

@Controller('media')
@UseGuards(CatalogAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly logger: LoggerService,
  ) {}

  @Get('product/:productId')
  @RequireCatalogRoles('catalog:authenticated')
  async findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    this.logger.log(`GET /api/media/product/${productId}`, 'MediaController');
    const media = await this.mediaService.findByProduct(productId);
    return { success: true, data: media };
  }

  @Post()
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async create(
    @Body() data: Partial<Media>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log('POST /api/media', 'MediaController');
    const media = await this.mediaService.create(data);
    this.logger.auditCatalogWrite(request, {
      action: 'create',
      resourceType: 'media',
      resourceId: media.id,
      metadata: { productId: media.productId },
    });
    return { success: true, data: media };
  }

  @Post('upload')
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: any,
    @Body() body: {
      productId?: string;
      altText?: string;
      position?: string;
      isPrimary?: string;
    },
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`POST /api/media/upload product=${body.productId}`, 'MediaController');
    const media = await this.mediaService.upload({
      productId: body.productId || '',
      file,
      altText: body.altText,
      position: body.position ? Number(body.position) : undefined,
      isPrimary: body.isPrimary === 'true',
    });
    this.logger.auditCatalogWrite(request, {
      action: 'upload',
      resourceType: 'media',
      resourceId: media.id,
      metadata: { productId: media.productId },
    });
    return { success: true, data: media };
  }

  @Put(':id')
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Partial<Media>,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/media/${id}`, 'MediaController');
    const media = await this.mediaService.update(id, data);
    this.logger.auditCatalogWrite(request, {
      action: 'update',
      resourceType: 'media',
      resourceId: id,
      metadata: { productId: media.productId },
    });
    return { success: true, data: media };
  }

  @Put(':id/primary')
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async setPrimary(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PUT /api/media/${id}/primary`, 'MediaController');
    const media = await this.mediaService.setPrimary(id);
    this.logger.auditCatalogWrite(request, {
      action: 'set_primary',
      resourceType: 'media',
      resourceId: id,
      metadata: { productId: media.productId },
    });
    return { success: true, data: media };
  }

  @Delete(':id')
  @RequireCatalogRoles(...CatalogAuthGuard.WRITE_ROLES)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`DELETE /api/media/${id}`, 'MediaController');
    await this.mediaService.remove(id);
    this.logger.auditCatalogWrite(request, {
      action: 'delete',
      resourceType: 'media',
      resourceId: id,
    });
    return { success: true };
  }
}
