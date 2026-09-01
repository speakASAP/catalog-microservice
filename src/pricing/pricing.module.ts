import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductPricing } from './product-pricing.entity';
import { Product } from '../products/product.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { LoggerModule } from '../logger/logger.module';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ProductPricing, Product]), LoggerModule],
  controllers: [PricingController],
  providers: [PricingService, CatalogAuthGuard],
  exports: [PricingService],
})
export class PricingModule {}
