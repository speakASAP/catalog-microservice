import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerModule } from '../logger/logger.module';
import { ProductsModule } from '../products/products.module';
import { PricingModule } from '../pricing/pricing.module';
import { ProductRelation } from './product-relation.entity';
import { InternalOrderAffinityRelationsController, ProductBundleCandidatesController, ProductRelationsController } from './product-relations.controller';
import { ProductRelationsService } from './product-relations.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductRelation]), LoggerModule, ProductsModule, PricingModule],
  controllers: [ProductRelationsController, ProductBundleCandidatesController, InternalOrderAffinityRelationsController],
  providers: [ProductRelationsService, CatalogAuthGuard],
  exports: [ProductRelationsService],
})
export class ProductRelationsModule {}
