import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ProductEventsModule } from '../product-events/product-events.module';
import { BpcpEventsModule } from '../bpcp-events/bpcp-events.module';

@Module({
  imports: [ProductEventsModule, BpcpEventsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

