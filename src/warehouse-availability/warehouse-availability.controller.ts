import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CatalogAuthGuard } from '../auth/catalog-auth.guard';
import { LoggerService } from '../logger/logger.service';
import { BatchWarehouseAvailabilityRequestDto, BatchWarehouseCoverageRequestDto } from './warehouse-availability.types';
import { WarehouseAvailabilityService } from './warehouse-availability.service';

@Controller('products/availability')
export class WarehouseAvailabilityController {
  constructor(
    private readonly warehouseAvailabilityService: WarehouseAvailabilityService,
    private readonly logger: LoggerService,
  ) {}

  @Post('batch')
  @UseGuards(CatalogAuthGuard)
  @HttpCode(HttpStatus.OK)
  async batchAvailability(@Body() request: BatchWarehouseAvailabilityRequestDto) {
    this.logger.log('POST /api/products/availability/batch', 'WarehouseAvailabilityController');
    const availability = await this.warehouseAvailabilityService.getBatchAvailability(request);
    return { success: true, data: availability };
  }

  @Post('coverage')
  @UseGuards(CatalogAuthGuard)
  @HttpCode(HttpStatus.OK)
  async batchCoverage(@Body() request: BatchWarehouseCoverageRequestDto) {
    this.logger.log('POST /api/products/availability/coverage', 'WarehouseAvailabilityController');
    const coverage = await this.warehouseAvailabilityService.getBatchCoverage(request);
    return { success: true, data: coverage };
  }
}
