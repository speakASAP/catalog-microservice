import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerModule } from '../logger/logger.module';
import { ProductsModule } from '../products/products.module';
import { ProductRelation } from './product-relation.entity';
import { ProductRelationsController } from './product-relations.controller';
import { ProductRelationsService } from './product-relations.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductRelation]), LoggerModule, ProductsModule],
  controllers: [ProductRelationsController],
  providers: [ProductRelationsService, CatalogAuthGuard],
  exports: [ProductRelationsService],
})
export class ProductRelationsModule {}
