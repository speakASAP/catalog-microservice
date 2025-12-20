import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductPricing } from './product-pricing.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductPricing]), LoggerModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}

