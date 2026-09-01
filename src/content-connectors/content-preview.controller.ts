import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { RequireCatalogRoles } from '../auth/catalog-auth.decorator';
import { ContentRendererService } from './content-renderer.service';

@Controller('products/:productId/content-previews')
@UseGuards(CatalogAuthGuard)
export class ContentPreviewController {
  constructor(private readonly contentRendererService: ContentRendererService) {}

  @Get()
  @RequireCatalogRoles('catalog:authenticated')
  async getPreviews(@Param('productId', ParseUUIDPipe) productId: string) {
    const previews = await this.contentRendererService.renderPreviews(productId);
    return {
      success: true,
      data: {
        productId,
        supportedMarketplaces: this.contentRendererService.getSupportedMarketplaces(),
        previews,
      },
    };
  }

  @Get(':marketplace')
  @RequireCatalogRoles('catalog:authenticated')
  async getPreview(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('marketplace') marketplace: string,
  ) {
    const preview = await this.contentRendererService.renderPreview(productId, marketplace);
    return { success: true, data: preview };
  }
}
