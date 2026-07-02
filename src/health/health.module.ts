import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ProductEventsModule } from '../product-events/product-events.module';

@Module({
  imports: [ProductEventsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

