import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ProductsService } from '../products/products.service';
import { MediaModule } from '../media/media.module';
import { MediaService } from '../media/media.service';
import { PricingModule } from '../pricing/pricing.module';
import { PricingService } from '../pricing/pricing.service';
import { LoggerModule } from '../logger/logger.module';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';
import { AukroImporter } from './importers/aukro.importer';
import { SbazarImporter } from './importers/sbazar.importer';

@Module({
  imports: [ProductsModule, MediaModule, PricingModule, LoggerModule],
  controllers: [ProductImportController],
  providers: [
    CatalogAuthGuard,
    AukroImporter,
    SbazarImporter,
    {
      provide: ProductImportService,
      useFactory: (
        aukroImporter: AukroImporter,
        sbazarImporter: SbazarImporter,
        productsService: ProductsService,
        mediaService: MediaService,
        pricingService: PricingService,
        logger: LoggerService,
      ) =>
        new ProductImportService(
          [aukroImporter, sbazarImporter],
          productsService,
          mediaService,
          pricingService,
          logger,
        ),
      inject: [
        AukroImporter,
        SbazarImporter,
        ProductsService,
        MediaService,
        PricingService,
        LoggerService,
      ],
    },
  ],
})
export class ProductImportModule {}
