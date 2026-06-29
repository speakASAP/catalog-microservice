import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerModule } from '../logger/logger.module';
import { Product } from '../products/product.entity';
import { MarketplaceFieldsController } from './marketplace-fields.controller';
import { MarketplaceFieldsService } from './marketplace-fields.service';
import { ProductMarketplaceProfile } from './marketplace-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductMarketplaceProfile]),
    LoggerModule,
  ],
  controllers: [MarketplaceFieldsController],
  providers: [MarketplaceFieldsService, CatalogAuthGuard],
  exports: [MarketplaceFieldsService],
})
export class MarketplaceFieldsModule {}
