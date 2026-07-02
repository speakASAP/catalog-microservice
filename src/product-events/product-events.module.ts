import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogProductEventOutbox } from './product-event-outbox.entity';
import { ProductEventPublisherService } from './product-event-publisher.service';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogProductEventOutbox])],
  providers: [ProductEventPublisherService],
  exports: [ProductEventPublisherService],
})
export class ProductEventsModule {}
