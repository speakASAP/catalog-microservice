import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CatalogAuthGuard, type CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';
import { LoggerService } from '../logger/logger.service';
import { CatalogAccessService, type UpdateCatalogSettingsDto } from './catalog-access.service';

@Controller('catalog')
@UseGuards(CatalogAuthGuard)
@RequireCatalogRoles('catalog:authenticated')
export class CatalogAccessController {
  constructor(
    private readonly catalogAccessService: CatalogAccessService,
    private readonly logger: LoggerService,
  ) {}

  @Post('access/provision')
  @HttpCode(HttpStatus.OK)
  async provision(
    @Body() body: { sourceApplication?: string },
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    const settings = await this.catalogAccessService.ensureSettings(
      request.catalogActor!,
      body?.sourceApplication,
    );
    if (settings.created) {
      this.logger.auditCatalogWrite(request, {
        action: 'catalog_access_provision',
        resourceType: 'catalog_user_settings',
        resourceId: settings.userId,
        metadata: { sourceApplication: settings.sourceApplication ?? undefined },
      });
    }
    return { success: true, data: settings };
  }

  @Get('settings')
  async getSettings(@Req() request: CatalogAuthenticatedRequest) {
    const settings = await this.catalogAccessService.getSettings(request.catalogActor!);
    return { success: true, data: settings };
  }

  @Patch('settings')
  async updateSettings(
    @Body() body: UpdateCatalogSettingsDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    const settings = await this.catalogAccessService.updateSettings(request.catalogActor!, body || {});
    this.logger.auditCatalogWrite(request, {
      action: 'catalog_source_settings_update',
      resourceType: 'catalog_user_settings',
      resourceId: settings.userId,
      metadata: {
        includeAlfaresCatalog: String(settings.includeAlfaresCatalog),
        includeCommunityCatalog: String(settings.includeCommunityCatalog),
      },
    });
    return { success: true, data: settings };
  }

  @Put('settings')
  async replaceSettings(
    @Body() body: UpdateCatalogSettingsDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    return this.updateSettings(body, request);
  }
}
