import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "../categories/category.entity";
import { Media } from "../media/media.entity";
import { Product } from "../products/product.entity";
import { ProductPricing } from "../pricing/product-pricing.entity";
import { CatalogAuthGuard } from "../auth/catalog-auth.guard";
import { LoggerModule } from "../logger/logger.module";
import { ImportReconciliationController } from "./import-reconciliation.controller";
import { ImportReconciliationService } from "./import-reconciliation.service";

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Media, ProductPricing]), LoggerModule],
  controllers: [ImportReconciliationController],
  providers: [ImportReconciliationService, CatalogAuthGuard],
})
export class ImportReconciliationModule {}
