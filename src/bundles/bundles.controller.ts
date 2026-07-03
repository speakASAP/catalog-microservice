import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogAuthGuard, type CatalogAuthenticatedRequest } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';
import { LoggerService } from '../logger/logger.service';
import { BundleListQueryDto, CreateCatalogBundleDto, UpdateCatalogBundleDto } from './bundles.dto';
import { BundlesService } from './bundles.service';

const BUNDLE_ADMIN_ROLES = [
  'global:superadmin',
  'global:platform_admin',
  'app:catalog-microservice:admin',
  'internal:catalog-microservice:admin',
];

@Controller('bundles')
@UseGuards(CatalogAuthGuard)
export class BundlesController {
  constructor(
    private readonly bundlesService: BundlesService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  @RequireCatalogRoles('catalog:authenticated')
  async list(@Query() query: BundleListQueryDto, @Req() request: CatalogAuthenticatedRequest) {
    this.logger.log('GET /api/bundles', 'BundlesController');
    const data = await this.bundlesService.list(query, { actor: request.catalogActor });
    return { success: true, data };
  }

  @Get(':bundleId')
  @RequireCatalogRoles('catalog:authenticated')
  async get(@Param('bundleId', ParseUUIDPipe) bundleId: string, @Req() request: CatalogAuthenticatedRequest) {
    this.logger.log(`GET /api/bundles/${bundleId}`, 'BundlesController');
    return { success: true, data: await this.bundlesService.get(bundleId, { actor: request.catalogActor }) };
  }
}

@Controller('internal/bundles')
@UseGuards(CatalogAuthGuard)
@RequireCatalogRoles(...BUNDLE_ADMIN_ROLES)
export class InternalBundlesController {
  constructor(
    private readonly bundlesService: BundlesService,
    private readonly logger: LoggerService,
  ) {}

  @Post()
  async create(@Body() data: CreateCatalogBundleDto, @Req() request: CatalogAuthenticatedRequest) {
    this.logger.log('POST /api/internal/bundles', 'InternalBundlesController');
    const bundle = await this.bundlesService.create(data, { actor: request.catalogActor });
    this.audit(request, 'create', bundle.bundleId, {
      status: bundle.status,
      source: bundle.source,
      idempotencyKey: bundle.idempotencyKey,
      itemCount: bundle.items.length,
    });
    return { success: true, data: bundle };
  }

  @Patch(':bundleId')
  async update(
    @Param('bundleId', ParseUUIDPipe) bundleId: string,
    @Body() data: UpdateCatalogBundleDto,
    @Req() request: CatalogAuthenticatedRequest,
  ) {
    this.logger.log(`PATCH /api/internal/bundles/${bundleId}`, 'InternalBundlesController');
    const bundle = await this.bundlesService.update(bundleId, data, { actor: request.catalogActor });
    this.audit(request, 'update', bundle.bundleId, {
      status: bundle.status,
      source: bundle.source,
      idempotencyKey: bundle.idempotencyKey,
      itemCount: bundle.items.length,
    });
    return { success: true, data: bundle };
  }

  @Post(':bundleId/activate')
  async activate(@Param('bundleId', ParseUUIDPipe) bundleId: string, @Req() request: CatalogAuthenticatedRequest) {
    this.logger.log(`POST /api/internal/bundles/${bundleId}/activate`, 'InternalBundlesController');
    const bundle = await this.bundlesService.activate(bundleId, { actor: request.catalogActor });
    this.audit(request, 'activate', bundle.bundleId, { status: bundle.status, source: bundle.source });
    return { success: true, data: bundle };
  }

  @Post(':bundleId/archive')
  async archive(@Param('bundleId', ParseUUIDPipe) bundleId: string, @Req() request: CatalogAuthenticatedRequest) {
    this.logger.log(`POST /api/internal/bundles/${bundleId}/archive`, 'InternalBundlesController');
    const bundle = await this.bundlesService.archive(bundleId, { actor: request.catalogActor });
    this.audit(request, 'archive', bundle.bundleId, { status: bundle.status, source: bundle.source });
    return { success: true, data: bundle };
  }

  private audit(
    request: CatalogAuthenticatedRequest,
    action: string,
    resourceId: string,
    metadata: Record<string, string | number | boolean | null | undefined>,
  ) {
    this.logger.auditCatalogWrite(request, {
      action,
      resourceType: 'catalog_bundle',
      resourceId,
      metadata,
    });
  }
}
