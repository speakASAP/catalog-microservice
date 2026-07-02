import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger/logger.module';
import { CatalogProductEventOutbox } from './product-event-outbox.entity';
import { ProductEventOutboxPublisherService } from './product-event-outbox-publisher.service';
import { ProductEventPublisherService } from './product-event-publisher.service';
import { ProductEventRabbitMqAdapter } from './product-event-rabbitmq.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogProductEventOutbox]), LoggerModule],
  providers: [
    ProductEventPublisherService,
    ProductEventOutboxPublisherService,
    ProductEventRabbitMqAdapter,
  ],
  exports: [ProductEventPublisherService, ProductEventOutboxPublisherService],
})
export class ProductEventsModule {}
