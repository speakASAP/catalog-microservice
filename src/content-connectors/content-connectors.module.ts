import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerModule } from '../logger/logger.module';
import { ProductMarketplaceProfile } from '../marketplace-fields/marketplace-profile.entity';
import { Product } from '../products/product.entity';
import { ContentPreviewController } from './content-preview.controller';
import { ContentRendererService } from './content-renderer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductMarketplaceProfile]),
    LoggerModule,
  ],
  controllers: [ContentPreviewController],
  providers: [ContentRendererService, CatalogAuthGuard],
  exports: [ContentRendererService],
})
export class ContentConnectorsModule {}
