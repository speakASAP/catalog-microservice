import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { LoggerModule } from '../logger/logger.module';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    LoggerModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService, CatalogAuthGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}

