import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger/logger.module';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { CatalogAccessController } from './catalog-access.controller';
import { CatalogAccessService } from './catalog-access.service';
import { CatalogUserSettings } from './catalog-user-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogUserSettings]), LoggerModule],
  controllers: [CatalogAccessController],
  providers: [CatalogAccessService, CatalogAuthGuard],
  exports: [CatalogAccessService],
})
export class CatalogAccessModule {}
