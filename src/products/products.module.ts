import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { LoggerModule } from '../logger/logger.module';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { PricingModule } from '../pricing/pricing.module';
import { ContentConnectorsModule } from '../content-connectors/content-connectors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    LoggerModule,
    PricingModule,
    ContentConnectorsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, CatalogAuthGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
