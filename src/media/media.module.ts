import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { LoggerModule } from '../logger/logger.module';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Media]), LoggerModule],
  controllers: [MediaController],
  providers: [MediaService, CatalogAuthGuard],
  exports: [MediaService],
})
export class MediaModule {}

