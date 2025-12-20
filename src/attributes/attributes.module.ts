import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attribute } from './attribute.entity';
import { ProductAttribute } from './product-attribute.entity';
import { AttributesService } from './attributes.service';
import { AttributesController } from './attributes.controller';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attribute, ProductAttribute]),
    LoggerModule,
  ],
  controllers: [AttributesController],
  providers: [AttributesService],
  exports: [AttributesService],
})
export class AttributesModule {}

