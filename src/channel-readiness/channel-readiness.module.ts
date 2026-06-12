import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ProductsModule } from '../products/products.module';
import { ChannelReadinessController } from './channel-readiness.controller';
import { ChannelReadinessService } from './channel-readiness.service';

@Module({
  imports: [ProductsModule, PricingModule],
  controllers: [ChannelReadinessController],
  providers: [ChannelReadinessService],
})
export class ChannelReadinessModule {}
