import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ProductsModule } from '../products/products.module';
import { WarehouseAvailabilityModule } from '../warehouse-availability/warehouse-availability.module';
import { ChannelReadinessController } from './channel-readiness.controller';
import { ChannelReadinessService } from './channel-readiness.service';

@Module({
  imports: [ProductsModule, PricingModule, WarehouseAvailabilityModule],
  controllers: [ChannelReadinessController],
  providers: [ChannelReadinessService],
  exports: [ChannelReadinessService],
})
export class ChannelReadinessModule {}
