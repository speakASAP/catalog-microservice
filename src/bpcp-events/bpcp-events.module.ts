import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerModule } from '../logger/logger.module';
import { Product } from '../products/product.entity';
import { BpcpDiscountEligibilityController } from './bpcp-discount-eligibility.controller';
import { BpcpProcessEventConsumerService } from './bpcp-process-event-consumer.service';
import { BpcpProcessEventDedupe } from './bpcp-process-event-dedupe.entity';
import { BpcpProcessEventProjectionService } from './bpcp-process-event-projection.service';
import { BpcpProcessProjectionEntity } from './bpcp-process-projection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, BpcpProcessEventDedupe, BpcpProcessProjectionEntity]), LoggerModule],
  controllers: [BpcpDiscountEligibilityController],
  providers: [BpcpProcessEventConsumerService, BpcpProcessEventProjectionService, CatalogAuthGuard],
  exports: [BpcpProcessEventConsumerService, BpcpProcessEventProjectionService],
})
export class BpcpEventsModule {}
