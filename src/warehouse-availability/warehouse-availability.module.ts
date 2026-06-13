import { Module } from '@nestjs/common';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerModule } from '../logger/logger.module';
import { ProductsModule } from '../products/products.module';
import { WarehouseAvailabilityController } from './warehouse-availability.controller';
import { WarehouseAvailabilityService } from './warehouse-availability.service';

@Module({
  imports: [ProductsModule, LoggerModule],
  controllers: [WarehouseAvailabilityController],
  providers: [WarehouseAvailabilityService, CatalogAuthGuard],
  exports: [WarehouseAvailabilityService],
})
export class WarehouseAvailabilityModule {}
