import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { LoggerModule } from '../logger/logger.module';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { PricingModule } from '../pricing/pricing.module';
import { ContentConnectorsModule } from '../content-connectors/content-connectors.module';
import { ProductEventsModule } from '../product-events/product-events.module';
import { CatalogAccessModule } from '../catalog-access/catalog-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    LoggerModule,
    PricingModule,
    ContentConnectorsModule,
    ProductEventsModule,
    CatalogAccessModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, CatalogAuthGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
