import { Module } from "@nestjs/common";
import { CatalogAuthGuard } from "../auth/catalog-auth.guard";
import { ChannelReadinessModule } from "../channel-readiness/channel-readiness.module";
import { LoggerModule } from "../logger/logger.module";
import { PricingModule } from "../pricing/pricing.module";
import { ProductsModule } from "../products/products.module";
import { WarehouseAvailabilityModule } from "../warehouse-availability/warehouse-availability.module";
import { FlipFlopProjectionController } from "./flipflop-projection.controller";
import { FlipFlopProjectionService } from "./flipflop-projection.service";

@Module({
  imports: [ProductsModule, PricingModule, WarehouseAvailabilityModule, ChannelReadinessModule, LoggerModule],
  controllers: [FlipFlopProjectionController],
  providers: [FlipFlopProjectionService, CatalogAuthGuard],
})
export class FlipFlopProjectionModule {}
