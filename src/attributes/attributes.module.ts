import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attribute } from './attribute.entity';
import { ProductAttribute } from './product-attribute.entity';
import { AttributesService } from './attributes.service';
import { AttributesController } from './attributes.controller';
import { LoggerModule } from '../logger/logger.module';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attribute, ProductAttribute]),
    LoggerModule,
  ],
  controllers: [AttributesController],
  providers: [AttributesService, CatalogAuthGuard],
  exports: [AttributesService],
})
export class AttributesModule {}

