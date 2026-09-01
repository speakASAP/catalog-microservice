import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { CatalogAuthGuard } from "../auth/catalog-auth.guard";
import { RequireCatalogRoles } from "../auth/catalog-auth.decorator";
import { LoggerService } from "../logger/logger.service";
import { BatchFlipFlopProjectionRequestDto } from "./flipflop-projection.types";
import { FlipFlopProjectionService } from "./flipflop-projection.service";

@Controller("products/projections/flipflop")
@UseGuards(CatalogAuthGuard)
export class FlipFlopProjectionController {
  constructor(
    private readonly flipflopProjectionService: FlipFlopProjectionService,
    private readonly logger: LoggerService,
  ) {}

  @Post("batch")
  @RequireCatalogRoles("catalog:authenticated")
  @HttpCode(HttpStatus.OK)
  async batchProjection(@Body() request: BatchFlipFlopProjectionRequestDto) {
    this.logger.log("POST /api/products/projections/flipflop/batch", "FlipFlopProjectionController");
    const projection = await this.flipflopProjectionService.getBatchProjection(request);
    return { success: true, data: projection };
  }
}
