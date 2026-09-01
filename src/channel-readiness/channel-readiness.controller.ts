import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ChannelReadinessService } from './channel-readiness.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';

@Controller('products')
export class ChannelReadinessController {
  constructor(private readonly channelReadinessService: ChannelReadinessService) {}

  /**
   * Per-channel publishing readiness for one product.
   *
   * Guarded 2026-09-01: this route carried no `CatalogAuthGuard`, and the catalog
   * ingress maps `/api` to this service, so it was readable from the public internet
   * with no credentials. The payload is internal operational state — `missingFields`,
   * `issues`, `nextAction`, `warehouseCoverage` — not marketplace data, so anonymous
   * read was not the intent.
   *
   * `catalog:authenticated` rather than an admin role: every internal caller that
   * inspects readiness is a validated principal, and this is a read.
   */
  @Get(':id/channel-readiness')
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles('catalog:authenticated')
  async getProductChannelReadiness(@Param('id', ParseUUIDPipe) id: string) {
    const readiness = await this.channelReadinessService.getProductReadiness(id);
    return { success: true, data: readiness };
  }
}
