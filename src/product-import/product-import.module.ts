import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ProductsService } from '../products/products.service';
import { MediaModule } from '../media/media.module';
import { MediaService } from '../media/media.service';
import { LoggerModule } from '../logger/logger.module';
import { LoggerService } from '../logger/logger.service';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';
import { AukroImporter } from './importers/aukro.importer';

@Module({
  imports: [ProductsModule, MediaModule, LoggerModule],
  controllers: [ProductImportController],
  providers: [
    CatalogAuthGuard,
    AukroImporter,
    {
      provide: ProductImportService,
      useFactory: (
        aukroImporter: AukroImporter,
        productsService: ProductsService,
        mediaService: MediaService,
        logger: LoggerService,
      ) => new ProductImportService([aukroImporter], productsService, mediaService, logger),
      inject: [AukroImporter, ProductsService, MediaService, LoggerService],
    },
  ],
})
export class ProductImportModule {}
