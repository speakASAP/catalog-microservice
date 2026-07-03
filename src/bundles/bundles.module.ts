import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerModule } from '../logger/logger.module';
import { PricingModule } from '../pricing/pricing.module';
import { ProductsModule } from '../products/products.module';
import { CatalogBundleItem } from './catalog-bundle-item.entity';
import { CatalogBundle } from './catalog-bundle.entity';
import { BundlesController, InternalBundlesController } from './bundles.controller';
import { BundlesService } from './bundles.service';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogBundle, CatalogBundleItem]), LoggerModule, ProductsModule, PricingModule],
  controllers: [BundlesController, InternalBundlesController],
  providers: [BundlesService, CatalogAuthGuard],
  exports: [BundlesService],
})
export class BundlesModule {}
